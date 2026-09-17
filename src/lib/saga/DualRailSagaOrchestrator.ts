export type OrderStatus = 'PENDING' | 'PIX_PAID' | 'CRYPTO_PAID' | 'SETTLED' | 'EXPIRED' | 'COMPENSATING';

export interface PgQueryClient {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
}

export interface PoolClientLike extends PgQueryClient {
  release(): void;
}

export interface PoolLike {
  connect(): Promise<PoolClientLike>;
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
}

export class DualRailSagaOrchestrator {
  constructor(private db: PoolLike) {}

  async handlePixWebhook(orderId: string, pixTxId: string, idempotencyKey: string): Promise<OrderStatus> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      // Idempotency check via intent_events
      const eventCheck = await client.query(
        `SELECT id FROM intent_events WHERE external_tx_id = $1`,
        [idempotencyKey]
      );
      if (eventCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return 'PIX_PAID'; // Already processed
      }

      const orderRes = await client.query(`SELECT status, crypto_signature FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
      if (orderRes.rows.length === 0) throw new Error('Order not found');
      
      const order = orderRes.rows[0];
      let nextStatus: OrderStatus = 'PIX_PAID';

      if (order.status === 'CRYPTO_PAID') {
        nextStatus = 'SETTLED';
      } else if (order.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return order.status;
      }

      await client.query(
        `UPDATE orders SET status = $1, pix_txid = $2, updated_at = NOW() WHERE id = $3`,
        [nextStatus, pixTxId, orderId]
      );

      await client.query(
        `INSERT INTO intent_events (order_id, rail, external_tx_id, payload) VALUES ($1, 'PIX', $2, $3)`,
        [orderId, idempotencyKey, JSON.stringify({ pixTxId })]
      );

      await client.query('COMMIT');
      return nextStatus;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async handleCryptoConfirmation(orderId: string, signature: string, idempotencyKey: string): Promise<OrderStatus> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const eventCheck = await client.query(
        `SELECT id FROM intent_events WHERE external_tx_id = $1`,
        [idempotencyKey]
      );
      if (eventCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return 'CRYPTO_PAID';
      }

      const orderRes = await client.query(`SELECT status FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
      if (orderRes.rows.length === 0) throw new Error('Order not found');

      const order = orderRes.rows[0];
      let nextStatus: OrderStatus = 'CRYPTO_PAID';

      if (order.status === 'PIX_PAID') {
        nextStatus = 'SETTLED';
      } else if (order.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return order.status;
      }

      await client.query(
        `UPDATE orders SET status = $1, crypto_signature = $2, updated_at = NOW() WHERE id = $3`,
        [nextStatus, signature, orderId]
      );

      await client.query(
        `INSERT INTO intent_events (order_id, rail, external_tx_id, payload) VALUES ($1, 'CRYPTO', $2, $3)`,
        [orderId, idempotencyKey, JSON.stringify({ signature })]
      );

      await client.query('COMMIT');
      return nextStatus;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async checkTimeoutsAndCompensate(): Promise<void> {
    // Saga compensation pattern for stuck dual-rail where PIX paid but crypto timed out
    const res = await this.db.query(
      `UPDATE orders 
       SET status = 'COMPENSATING', updated_at = NOW() 
       WHERE status = 'PIX_PAID' AND expires_at < NOW() 
       RETURNING id, pix_txid`
    );
    for (const row of res.rows) {
      // Trigger non-custodial alert / merchant web-hook compensation or manual PSP refund flow notice
      console.warn(`Saga compensation triggered for stuck order ${row.id}, pix_txid: ${row.pix_txid}`);
    }
  }
}

/**
 * In-Memory Mock Database Pool for Browser / Interactive Testing
 */
export class InMemorySagaPool implements PoolLike {
  public orders: Map<string, { id: string; status: OrderStatus; pix_txid?: string; crypto_signature?: string; expires_at: Date }> = new Map();
  public intentEvents: Set<string> = new Set();

  constructor() {
    // Seed initial demo orders
    this.orders.set("ord_demo_101", {
      id: "ord_demo_101",
      status: "PENDING",
      expires_at: new Date(Date.now() + 600000),
    });
    this.orders.set("ord_stuck_999", {
      id: "ord_stuck_999",
      status: "PIX_PAID",
      pix_txid: "pix_tx_9988776655",
      expires_at: new Date(Date.now() - 3600000), // Expired 1h ago
    });
  }

  async connect(): Promise<PoolClientLike> {
    return {
      query: async (sql: string, params: any[] = []) => this.execQuery(sql, params),
      release: () => {},
    };
  }

  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    return this.execQuery(sql, params);
  }

  private async execQuery(sql: string, params: any[]): Promise<{ rows: any[] }> {
    if (sql.includes("intent_events WHERE external_tx_id = $1")) {
      const key = params[0];
      return { rows: this.intentEvents.has(key) ? [{ id: key }] : [] };
    }

    if (sql.includes("SELECT status, crypto_signature FROM orders WHERE id = $1") || sql.includes("SELECT status FROM orders WHERE id = $1")) {
      const id = params[0];
      const ord = this.orders.get(id);
      return { rows: ord ? [ord] : [] };
    }

    if (sql.includes("UPDATE orders SET status = $1, pix_txid = $2")) {
      const [nextStatus, pixTxId, orderId] = params;
      const ord = this.orders.get(orderId);
      if (ord) {
        ord.status = nextStatus;
        ord.pix_txid = pixTxId;
      }
      return { rows: [] };
    }

    if (sql.includes("UPDATE orders SET status = $1, crypto_signature = $2")) {
      const [nextStatus, sig, orderId] = params;
      const ord = this.orders.get(orderId);
      if (ord) {
        ord.status = nextStatus;
        ord.crypto_signature = sig;
      }
      return { rows: [] };
    }

    if (sql.includes("INSERT INTO intent_events")) {
      const [, , externalTxId] = params;
      this.intentEvents.add(externalTxId);
      return { rows: [] };
    }

    if (sql.includes("WHERE status = 'PIX_PAID' AND expires_at < NOW()")) {
      const compensated: any[] = [];
      const now = new Date();
      for (const [id, ord] of this.orders.entries()) {
        if (ord.status === "PIX_PAID" && ord.expires_at < now) {
          ord.status = "COMPENSATING";
          compensated.push({ id: ord.id, pix_txid: ord.pix_txid });
        }
      }
      return { rows: compensated };
    }

    return { rows: [] };
  }
}
