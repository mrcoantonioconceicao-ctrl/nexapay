/**
 * Nexa Pay - Solana & Hybrid PIX Infrastructure Types
 */

export type PaymentMethod = "SOL" | "USDC" | "EURC" | "PIX_BRL";

export interface FXRates {
  USDC_BRL: number;
  SOL_BRL: number;
  SOL_USD: number;
  EURC_BRL: number;
  updatedAt: string;
  provider: string;
}

export interface MerchantAccount {
  id: string;
  name: string;
  pixKey: string;
  solanaWallet: string;
  usdcTokenAccount: string;
  category: string;
  totalVolumeUsd: number;
  totalSettlements: number;
  autoPixOfframp: boolean;
}

export interface AgentSessionAllowance {
  pdaPublicKey: string;
  bump: number;
  buyerPublicKey: string;
  agentPublicKey: string;
  merchantPublicKey: string;
  allowedTokenMint: string; // USDC or SOL mint
  maxSpendPerTx: number; // in USD or Tokens
  dailyLimitUsd: number;
  spentTodayUsd: number;
  remainingDailyUsd: number;
  expiryTimestamp: number; // UNIX epoch
  createdAt: string;
  revoked: boolean;
  totalTransactionsCount: number;
  allowanceScope: string[]; // e.g. ["APIs", "Compute", "Micro-subscriptions"]
}

export interface CpiHop {
  step: number;
  name: string;
  programId: string;
  instructionName: string;
  inputToken: string;
  outputToken: string;
  estAmountIn: string;
  estAmountOut: string;
  priceImpactPct: number;
  status: "pending" | "routing" | "settled" | "failed";
}

export interface CpiRouteExecution {
  routeId: string;
  sourceToken: PaymentMethod;
  destSettlement: "MERCHANT_SPL" | "MERCHANT_PIX_BRL";
  amountIn: number;
  amountOut: number;
  fxRateUsed: number;
  slippagePct: number;
  priorityFeeLamports: number;
  computeUnitsUsed: number;
  hops: CpiHop[];
}

export interface NexaTransaction {
  signature: string;
  slot: number;
  blockTime: string;
  confirmationStatus: "processed" | "confirmed" | "finalized";
  finalityMs: number;
  type: "DIRECT_MERCHANT_TRANSFER" | "AGENTIC_PDA_PAYMENT" | "CPI_PIX_OFFRAMP" | "ALLOWANCE_INIT";
  buyerPubkey: string;
  merchantPubkey: string;
  amount: number;
  tokenSymbol: PaymentMethod;
  fiatEquivalentBrl: number;
  cpiInnerInstructionsCount: number;
  isZeroCustodyConfirmed: boolean;
  logs: string[];
}

export interface PixEmvRequest {
  pixKey: string;
  merchantName: string;
  merchantCity?: string;
  txAmount?: number;
  txId?: string;
  description?: string;
}

export interface PixEmvResponse {
  success: boolean;
  payload: string;
  crc: string;
  txId: string;
  formattedAmount: string;
}

export interface WidgetConfig {
  merchantName: string;
  merchantWallet: string;
  pixKey: string;
  themeColor: string;
  accentColor: string;
  darkMode: boolean;
  enabledMethods: PaymentMethod[];
  allowAgenticMode: boolean;
  collectShipping: boolean;
  buttonText: string;
}
