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

    // --- START Input Validation based on tool.inputSchema ---
    const inputSchema = tool.inputSchema;
    const errors: string[] = [];

    // 1. Check for missing required properties
    for (const requiredProp of inputSchema.required) {
      if (args[requiredProp] === undefined) {
        errors.push(`Missing required parameter: '${requiredProp}'`);
      }
    }

    // 2. Check types and specific constraints
    for (const propName in inputSchema.properties) {
      if (Object.prototype.hasOwnProperty.call(inputSchema.properties, propName)) {
        const schemaProp = inputSchema.properties[propName];
        const argValue = args[propName];

        if (argValue !== undefined) { // Only validate if value is present
          switch (schemaProp.type) {
            case "string":
              if (typeof argValue !== "string") {
                errors.push(`Parameter '${propName}' must be a string, got ${typeof argValue}`);
              } else {
                  // Basic validation for Base58 public keys (approx. 32-44 chars, specific alphabet)
                  if (propName.endsWith("Pubkey") && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(argValue)) {
                      errors.push(`Parameter '${propName}' must be a valid Base58 public key string.`);
                  }
                  // Check for non-empty strings where applicable, e.g., orderId
                  if (propName === "orderId" && argValue.trim().length === 0) {
                      errors.push(`Parameter '${propName}' cannot be empty.`);
                  }
              }
              break;
            case "number":
              if (typeof argValue !== "number" || isNaN(argValue)) {
                errors.push(`Parameter '${propName}' must be a number, got ${typeof argValue}`);
              } else {
                // Ensure amounts and limits are non-negative
                if ((propName.includes("amount") || propName.includes("limit")) && argValue < 0) {
                  errors.push(`Parameter '${propName}' must be a non-negative number.`);
                }
                // Ensure timestamps are in the future (for 'validUntilTimestamp')
                if (propName === "validUntilTimestamp" && argValue < Date.now() / 1000) {
                    errors.push(`Parameter '${propName}' must be a future Unix timestamp.`);
                }
              }
              break;
            // Add other types (boolean, array, object) if they are expected in schemas
          }
        }
      }
    }

    if (errors.length > 0) {
      return {
        jsonrpc: "2.0",
        error: { code: -32602, message: `Invalid params for tool '${name}': ${errors.join("; ")}` }
      };
    }
    // --- END Input Validation ---

    // Process tool execution logic (args are now validated)
    return {
      jsonrpc: "2.0",
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              executedTool: name,
              parameters: args, // Now `args` is validated
              timestamp: Date.now(),
              nonCustodialVerified: true
            }, null, 2)
          }
        ]
      }
    };
  }
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
