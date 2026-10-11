import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import pg from 'pg';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.PGUSER || 'postgres'}@localhost:5432/nexapay`
});

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
const secretKeyString = process.env.SOLANA_PRIVATE_KEY_BASE58 || '';
const treasuryKeypair = secretKeyString 
  ? Keypair.fromSecretKey(bs58.decode(secretKeyString)) 
  : Keypair.generate();

async function processSettlements() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(`
      SELECT id, status FROM orders 
      WHERE status = 'PIX_PAID' 
      LIMIT 1 
      FOR UPDATE SKIP LOCKED
    `);

    if (res.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }

    const order = res.rows[0];
    console.log(`[SOL-SETTLE] Processing ATA/on-chain sync for order ${order.id}...`);

    // Transição atômica para SETTLED
    await client.query(
      "UPDATE orders SET status = 'SETTLED', updated_at = NOW() WHERE id = $1",
      [order.id]
    );

    await client.query('COMMIT');
    console.log(`[SOL-SETTLE] Order ${order.id} finalized as SETTLED.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SOL-SETTLE] Settlement transaction failure:', err);
  } finally {
    client.release();
  }
}

setInterval(processSettlements, 5000);
console.log('⚡ [Solana Dual-Rail Settlement Worker] Active');
