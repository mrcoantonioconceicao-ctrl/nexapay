export interface NexaPayConfig {
  apiKey: string;
  baseUrl: string;
  environment?: 'sandbox' | 'production';
}

export interface CreateCheckoutParams {
  merchantId: string;
  amountBrl: number;
  merchantWallet: string;
  externalOrderId?: string;
  itemDescription: string;
}

export interface CheckoutResult {
  orderId: string;
  referencePubkey: string;
  expiresAt: string;
  rails: {
    pixCopiaECola: string;
    qrCodeBase64: string;
    solanaActionUrl: string;
  };
}

export interface OrderStatusResult {
  orderId: string;
  status: 'PENDING' | 'PIX_PAID' | 'CRYPTO_PAID' | 'SETTLED' | 'EXPIRED' | 'COMPENSATING';
  updatedAt: string;
}

export class NexaPayClient {
  constructor(private config: NexaPayConfig) {
    if (!config.apiKey || !config.baseUrl) {
      throw new Error('NexaPayConfig requires apiKey and baseUrl');
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Nexa-Api-Key': this.config.apiKey,
        'X-Nexa-Env': this.config.environment || 'production',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NexaPay API Error [${response.status}]: ${errText}`);
    }

    return response.json() as Promise<T>;
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    return this.request<CheckoutResult>('/v1/checkout', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getOrderStatus(orderId: string): Promise<OrderStatusResult> {
    return this.request<OrderStatusResult>(`/v1/orders/${orderId}/status`, {
      method: 'GET',
    });
  }

  buildSolanaActionUrl(params: {
    merchantWallet: string;
    amountUsdc: number;
    reference: string;
    label?: string;
    message?: string;
  }): string {
    const label = encodeURIComponent(params.label || 'Nexa Pay Direct');
    const message = encodeURIComponent(params.message || 'E-commerce Settlement');
    return `solana:${params.merchantWallet}?amount=${params.amountUsdc.toFixed(6)}&reference=${params.reference}&label=${label}&message=${message}`;
  }
}
