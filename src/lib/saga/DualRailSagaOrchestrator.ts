/**
 * NexaPay Dual-Rail Saga Orchestrator com Lock Atômico (Anti-Race Condition)
 */

export interface Order {
  orderId: string;
  merchantId: string;
  amountBrl: number;
  amountUsdcExpected: number;
  merchantWallet: string;
  status: 'PENDING' | 'SETTLED' | 'EXPIRED' | 'FAILED';
  railUsed?: 'PIX' | 'SOLANA';
  createdAt: number;
  expiresAt: number;
}

export class DualRailSagaOrchestrator {
  private orders: Map<string, Order> = new Map();
  // Lock map para impedir execuções concorrentes no mesmo orderId
  private locks: Map<string, boolean> = new Map();

  public async createOrder(params: {
    merchantId: string;
    amountBrl: number;
    amountUsdcExpected: number;
    merchantWallet: string;
  }): Promise<Order> {
    const orderId = `ord_${Date.now()}_${Math.random().toString(16).substring(2, 10)}`;
    const now = Date.now();
    
    const order: Order = {
      orderId,
      merchantId: params.merchantId,
      amountBrl: params.amountBrl,
      amountUsdcExpected: params.amountUsdcExpected,
      merchantWallet: params.merchantWallet,
      status: 'PENDING',
      createdAt: now,
      expiresAt: now + 15 * 60 * 1000, // 15 minutos de TTL
    };

    this.orders.set(orderId, order);
    return order;
  }

  public getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Executa uma transição de estado com Lock Atômico (Mutex) para zerar race conditions.
   */
  private async acquireLockAndRun<T>(orderId: string, action: () => T): Promise<T> {
    // Simula espera ativa do lock atômico
    while (this.locks.get(orderId)) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.locks.set(orderId, true);
    try {
      return await action();
    } finally {
      this.locks.set(orderId, false);
    }
  }

  public async handlePixPayment(orderId: string): Promise<Order> {
    return this.acquireLockAndRun(orderId, () => {
      const order = this.orders.get(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      if (order.status !== 'PENDING') {
        throw new Error(`Concurrent settlement rejected: Order ${orderId} is already in state ${order.status}`);
      }

      order.status = 'SETTLED';
      order.railUsed = 'PIX';
      this.orders.set(orderId, order);
      return order;
    });
  }

  public async handleSolanaPayment(orderId: string, txHash: string): Promise<Order> {
    return this.acquireLockAndRun(orderId, () => {
      const order = this.orders.get(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      if (order.status !== 'PENDING') {
        throw new Error(`Concurrent settlement rejected: Order ${orderId} is already in state ${order.status}`);
      }

      order.status = 'SETTLED';
      order.railUsed = 'SOLANA';
      this.orders.set(orderId, order);
      return order;
    });
  }
}
