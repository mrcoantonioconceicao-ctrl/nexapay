/**
 * NexaPay Solana Anchor Program Interface
 * Define a interface de comunicação com o smart contract Anchor na Solana (nexa_pay),
 * suportando a criação de PDAs de delegação (Agentic Allowance) e pagamentos Escrowless via CPI.
 */

export interface AgentAllowanceConfig {
  authorityPubkey: string;
  agentPubkey: string;
  dailyLimitUsdc: number;
  validUntilTimestamp: number;
}

export interface PaymentExecutionParams {
  agentPubkey: string;
  merchantTokenAccount: string;
  amountUsdc: number;
  referencePubkey: string;
}

export class NexaAnchorProgram {
  private programId: string;
  private network: string;

  constructor(programId = 'NexaPay11111111111111111111111111111111111', network = 'mainnet-beta') {
    this.programId = programId;
    this.network = network;
  }

  /**
   * Simula a construção da instrução Anchor para criação da PDA de Allowance do Agente de IA.
   * Seeds equivalentes no smart contract: [b"allowance", authority, agent_pubkey]
   */
  public async buildCreateAllowanceInstruction(config: AgentAllowanceConfig) {
    // Em produção, utilizar `@coral-xyz/anchor` e `@solana/web3.js` para derivar a PDA real
    return {
      programId: this.programId,
      instructionData: {
        discriminator: 'create_agent_allowance',
        dailyLimitUsdc: config.dailyLimitUsdc,
        validUntil: config.validUntilTimestamp
      },
      accounts: {
        authority: config.authorityPubkey,
        agent: config.agentPubkey,
        network: this.network
      }
    };
  }

  /**
   * Simula a construção da instrução de pagamento autônomo (Escrowless Direct ATA CPI)
   */
  public async buildExecutePaymentInstruction(params: PaymentExecutionParams) {
    return {
      programId: this.programId,
      instructionData: {
        discriminator: 'execute_agent_payment',
        amountUsdc: params.amountUsdc
      },
      accounts: {
        agent: params.agentPubkey,
        merchantTokenAccount: params.merchantTokenAccount,
        splTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
      }
    };
  }
}
