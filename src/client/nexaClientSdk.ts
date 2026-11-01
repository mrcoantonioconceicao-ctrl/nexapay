/**
 * NexaPay dApp Client SDK
 * Permite que dApps interajam diretamente com o programa Anchor na Solana,
 * gerenciem PDAs de Agentic Allowances e disparem pagamentos híbridos.
 */

export interface CheckoutParams {
  merchantId: string;
  merchantName: string;
  merchantCity: string;
  pixKey: string;
  amountBrl: number;
  amountUsdcExpected: number;
  merchantWallet: string;
}

export class NexaDAppClient {
  private backendUrl: string;

  constructor(backendUrl: string = 'http://localhost:3001/api/v1') {
    this.backendUrl = backendUrl;
  }

  /**
   * 1. Inicia um checkout híbrido (Gera Pix Copia e Cola + Solana Pay Link)
   */
  public async createCheckout(params: CheckoutParams) {
    const response = await fetch(`${this.backendUrl}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await response.json() as any;
    if (!response.ok || !data.success) {
      throw new Error(`Erro ao criar checkout no dApp: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * 2. Consulta o status de liquidação do pedido (Dual-Rail Saga)
   */
  public async getOrderStatus(orderId: string) {
    const response = await fetch(`${this.backendUrl}/order/${orderId}`);
    const data = await response.json() as any;
    if (!response.ok || !data.success) {
      throw new Error(`Erro ao consultar pedido: ${JSON.stringify(data)}`);
    }
    return data.order;
  }

  /**
   * 3. Simula a construção da transação Anchor no dApp (Wallet Adapter)
   * para criação da PDA de Agentic Allowance.
   */
  public buildAgentAllowanceInstructionPayload(authorityPubkey: string, agentPubkey: string, dailyLimit: number) {
    return {
      programId: 'NexaPay11111111111111111111111111111111111',
      accounts: {
        authority: authorityPubkey,
        agent: agentPubkey,
        systemProgram: '11111111111111111111111111111111'
      },
      args: {
        dailyLimitUsdc: dailyLimit,
        validUntilTimestamp: Math.floor(Date.now() / 1000) + 86400 * 30 // 30 dias
      }
    };
  }
}
