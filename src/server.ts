import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.PGUSER || 'postgres'}@localhost:5432/nexapay`
});

const WEBHOOK_SECRET = process.env.PIX_WEBHOOK_SECRET || 'nexa_live_secret_key_12345';

// Webhook Pix Ingress com HMAC-SHA256 e ACID Lock pessimista
app.post('/v1/webhook/pix', async (req, res) => {
  const sigHeader = req.headers['x-signature-hmac'] as string;
  const rawBody = JSON.stringify(req.body);
  
  if (!sigHeader) {
    return res.status(401).json({ error: 'Missing x-signature-hmac' });
  }

  const expectedSig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (sigHeader !== expectedSig) {
    return res.status(403).json({ error: 'Invalid HMAC signature' });
  }

  const { orderId, txid } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Atualiza apenas se estiver PENDING com lock pessimista
    const updateRes = await client.query(
      "UPDATE orders SET status = 'PIX_PAID', updated_at = NOW() WHERE id = $1 AND status = 'PENDING' RETURNING id, status",
      [orderId]
    );

    if (updateRes.rows.length === 0) {
      // Verifica se já estava pago/settled ou se não existe
      const check = await client.query('SELECT status FROM orders WHERE id = $1', [orderId]);
      await client.query('COMMIT');
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.status(200).json({ received: true, orderId, status: check.rows[0].status, note: 'Already transitioned' });
    }

    // Grava log de auditoria
    await client.query(
      "INSERT INTO webhook_audit_logs (order_id, txid, processed_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING",
      [orderId, txid || null]
    );

    await client.query('COMMIT');
    return res.status(200).json({ received: true, orderId, status: 'PIX_PAID' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CORE] Webhook processing error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Health check
app.get('/v1/health', (req, res) => res.json({ status: 'ok', node: 'sovereign-edge' }));

// Servir Frontend SPA (ajuste o publicDir conforme seu build, ex: 'dist' ou 'client/dist')
const publicDir = path.join(process.cwd(), 'dist'); 
app.use(express.static(publicDir));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/v1')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`⚡ [NexaPay Core API] Listening on port ${PORT}`);
});
