import { Request, Response } from 'express';
import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;
const dbUser = process.env.PGUSER || 'postgres';
const dbName = process.env.PGDATABASE || 'nexapay';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${dbUser}@localhost:5432/${dbName}`
});

const PIX_WEBHOOK_SECRET = process.env.PIX_WEBHOOK_SECRET || 'nexa_live_secret_key_12345';

export async function handlePixWebhook(req: Request, res: Response) {
  const signature = req.headers['x-signature-hmac'] as string;
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  if (!signature) {
    return res.status(401).json({ error: 'Missing HMAC signature' });
  }

  const expectedSig = crypto
    .createHmac('sha256', PIX_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return res.status(403).json({ error: 'Invalid HMAC signature' });
  }

  const bodyObj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { orderId, txid } = bodyObj;

  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId in payload' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentStatus = orderResult.rows[0].status;
    if (currentStatus === 'PIX_PAID' || currentStatus === 'SETTLED') {
      await client.query('COMMIT');
      return res.status(200).json({
        idempotent: true,
        message: 'Order already processed or settled',
        orderId,
        status: currentStatus
      });
    }

    await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      ['PIX_PAID', orderId]
    );

    await client.query(
      `INSERT INTO webhook_audit_logs (order_id, txid, payload, processed_at) 
       VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
      [orderId, txid || 'unknown_txid', rawBody]
    );

    await client.query('COMMIT');
    console.log(`[PIX-WEBHOOK] Order ${orderId} committed to PIX_PAID via txid ${txid}`);
    
    return res.status(200).json({ received: true, orderId, status: 'PIX_PAID' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PIX-WEBHOOK] Transaction error:', err);
    return res.status(500).json({ error: 'Internal database transaction failure' });
  } finally {
    client.release();
  }
}
