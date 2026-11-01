/**
 * NexaPay Unified Types & DTOs
 * Contrato estrito de dados para comunicação Backend <-> Front-end / dApps.
 */

export type OrderStatus = 'PENDING' | 'SETTLED' | 'EXPIRED' | 'FAILED';
export type PaymentRail = 'PIX' | 'SOLANA';

export interface CheckoutRequestDto {
  merchantId: string;
  merchantName: string;
  merchantCity: string;
  pixKey: string;
  amountBrl: number;
  amountUsdcExpected: number;
  merchantWallet: string;
}

export interface CheckoutResponseDto {
  success: boolean;
  orderId: string;
  pixCopyPaste: string;
  solanaPayUrl: string;
  expiresAt: number;
  error?: string;
}

export interface OrderStatusResponseDto {
  success: boolean;
  order?: {
    orderId: string;
    merchantId: string;
    amountBrl: number;
    amountUsdcExpected: number;
    status: OrderStatus;
    railUsed?: PaymentRail;
    createdAt: number;
    expiresAt: number;
  };
  error?: string;
}

export interface WebhookPixPayloadDto {
  orderId: string;
  txId: string;
  amountBrl: number;
  paidAt: string;
}

export interface AgentAllowanceDto {
  authority: string;
  agent: string;
  dailyLimitUsdc: number;
  spentToday: number;
  validUntil: number;
}
