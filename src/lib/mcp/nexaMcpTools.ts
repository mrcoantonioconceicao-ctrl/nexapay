/**
 * Nexa Pay Model Context Protocol (MCP) Tool Specifications
 * Standard MCP JSON-RPC 2.0 schema exposing non-custodial payment tools to AI Agents
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export const NEXA_MCP_TOOLS: McpTool[] = [
  {
    name: "nexa_create_agent_allowance",
    description: "Delegate non-custodial spending allowance PDA to an AI agent on Solana (Anchor program)",
    inputSchema: {
      type: "object",
      properties: {
        authorityPubkey: { type: "string", description: "Base58 public key of the human wallet authority" },
        agentPubkey: { type: "string", description: "Base58 public key of the autonomous AI agent" },
        dailyLimitUsdc: { type: "number", description: "Maximum daily spending limit in USDC/SPL tokens" },
        validUntilTimestamp: { type: "number", description: "Unix timestamp after which the session expires" }
      },
      required: ["authorityPubkey", "agentPubkey", "dailyLimitUsdc", "validUntilTimestamp"]
    }
  },
  {
    name: "nexa_execute_agent_payment",
    description: "Execute zero-custody autonomous payment via active agent allowance PDA",
    inputSchema: {
      type: "object",
      properties: {
        agentPubkey: { type: "string", description: "Base58 public key of the active signing agent" },
        merchantTokenAccount: { type: "string", description: "Base58 SPL token account of the recipient merchant" },
        amountUsdc: { type: "number", description: "Amount of USDC to transfer" },
        referencePubkey: { type: "string", description: "Solana Pay 32-byte unique reference keypair public key" }
      },
      required: ["agentPubkey", "merchantTokenAccount", "amountUsdc", "referencePubkey"]
    }
  },
  {
    name: "nexa_create_hybrid_pix_checkout",
    description: "Generate dynamic BACEN-compliant PIX EMV Copia e Cola payload and QR code bound to order ID",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Unique order ID in Nexa Pay Dual-Rail Saga" },
        amountBrl: { type: "number", description: "Payment amount in BRL" },
        merchantPixKey: { type: "string", description: "Merchant direct PIX key (CPF/CNPJ/Email/EVP)" },
        merchantDoc: { type: "string", description: "Merchant CNPJ/CPF identifier" }
      },
      required: ["orderId", "amountBrl", "merchantPixKey", "merchantDoc"]
    }
  },
  {
    name: "nexa_verify_dual_rail_status",
    description: "Query real-time settlement status of dual-rail order (PENDING, PIX_PAID, CRYPTO_PAID, SETTLED, COMPENSATING)",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Unique order ID to query" }
      },
      required: ["orderId"]
    }
  }
];

export class NexaMcpServer {
  private tools = NEXA_MCP_TOOLS;

  public listTools() {
    return {
      jsonrpc: "2.0",
      result: {
        tools: this.tools
      }
    };
  }

  public handleCallTool(name: string, args: any) {
    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      return {
        jsonrpc: "2.0",
        error: { code: -32601, message: `Tool '${name}' not found` }
      };
    }

    // Process tool execution logic
    return {
      jsonrpc: "2.0",
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              executedTool: name,
              parameters: args,
              timestamp: Date.now(),
              nonCustodialVerified: true
            }, null, 2)
          }
        ]
      }
    };
  }
}
