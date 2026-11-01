/**
 * NexaPay MCP (Model Context Protocol) Server
 * Expõe ferramentas JSON-RPC 2.0 nativas para LLMs e Agentes Autônomos realizarem pagamentos híbridos e gestão de allowances.
 */

import { DualRailSagaOrchestrator } from '../saga/DualRailSagaOrchestrator';
import { PixAdapter } from '../pix/pixAdapter';
import { NexaAnchorProgram } from '../solana/nexaAnchorProgram';

export interface McpJsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id: string | number;
}

export interface McpJsonRpcResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

export class NexaMcpServer {
  private orchestrator: DualRailSagaOrchestrator;
  private anchorProgram: NexaAnchorProgram;

  constructor(orchestrator: DualRailSagaOrchestrator) {
    this.orchestrator = orchestrator;
    this.anchorProgram = new NexaAnchorProgram();
  }

  /**
   * Processa requisições JSON-RPC 2.0 vindas de Agentes de IA
   */
  public async handleRpcRequest(req: McpJsonRpcRequest): Promise<McpJsonRpcResponse> {
    const { method, params, id } = req;

    try {
      switch (method) {
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            result: {
              tools: [
                {
                  name: 'nexa_create_hybrid_pix_checkout',
                  description: 'Cria uma fatura de checkout híbrido gerando Pix Copia e Cola e link Solana Pay.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      merchantId: { type: 'string' },
                      merchantName: { type: 'string' },
                      merchantCity: { type: 'string' },
                      pixKey: { type: 'string' },
                      amountBrl: { type: 'number' },
                      amountUsdcExpected: { type: 'number' },
                      merchantWallet: { type: 'string' }
                    },
                    required: ['merchantId', 'merchantName', 'merchantCity', 'pixKey', 'amountBrl', 'amountUsdcExpected', 'merchantWallet']
                  }
                },
                {
                  name: 'nexa_create_agent_allowance',
                  description: 'Delega PDA de gastos não-custodial para um Agente de IA na Solana.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      authorityPubkey: { type: 'string' },
                      agentPubkey: { type: 'string' },
                      dailyLimitUsdc: { type: 'number' },
                      validUntilTimestamp: { type: 'number' }
                    },
                    required: ['authorityPubkey', 'agentPubkey', 'dailyLimitUsdc', 'validUntilTimestamp']
                  }
                },
                {
                  name: 'nexa_verify_dual_rail_status',
                  description: 'Consulta o status atual e o estado de liquidação de uma ordem no Saga Engine.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      orderId: { type: 'string' }
                    },
                    required: ['orderId']
                  }
                }
              ]
            },
            id
          };

        case 'tools/call':
          const toolName = params?.name;
          const args = params?.arguments || {};

          if (toolName === 'nexa_create_hybrid_pix_checkout') {
            const order = await this.orchestrator.createOrder({
              merchantId: args.merchantId,
              amountBrl: args.amountBrl,
              amountUsdcExpected: args.amountUsdcExpected,
              merchantWallet: args.merchantWallet
            });

            const pixCopiaECola = PixAdapter.generateCopiaECola({
              pixKey: args.pixKey,
              merchantName: args.merchantName,
              merchantCity: args.merchantCity,
              amountBrl: args.amountBrl,
              txId: order.orderId,
              description: 'NexaPay Hybrid Checkout'
            });

            return {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      orderId: order.orderId,
                      status: order.status,
                      expiresAt: order.expiresAt,
                      rails: {
                        pixCopiaECola,
                        solanaPayUrl: `solana:${args.merchantWallet}?amount=${args.amountUsdcExpected}&reference=${order.orderId}`
                      }
                    }, null, 2)
                  }
                ]
              },
              id
            };
          }

          if (toolName === 'nexa_create_agent_allowance') {
            const instruction = await this.anchorProgram.buildCreateAllowanceInstruction({
              authorityPubkey: args.authorityPubkey,
              agentPubkey: args.agentPubkey,
              dailyLimitUsdc: args.dailyLimitUsdc,
              validUntilTimestamp: args.validUntilTimestamp
            });

            return {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ success: true, instruction }, null, 2)
                  }
                ]
              },
              id
            };
          }

          if (toolName === 'nexa_verify_dual_rail_status') {
            const order = this.orchestrator.getOrder(args.orderId);
            if (!order) {
              return {
                jsonrpc: '2.0',
                error: { code: -32602, message: `Order ${args.orderId} not found` },
                id
              };
            }

            return {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(order, null, 2)
                  }
                ]
              },
              id
            };
          }

          return {
            jsonrpc: '2.0',
            error: { code: -32601, message: `Tool not found: ${toolName}` },
            id
          };

        default:
          return {
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${method}` },
            id
          };
      }
    } catch (error: any) {
      return {
        jsonrpc: '2.0',
        error: { code: -32000, message: error.message || 'Internal MCP Error' },
        id
      };
    }
  }
}
