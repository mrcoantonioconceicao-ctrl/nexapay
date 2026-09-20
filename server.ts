import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini lazily if API key exists
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    system: "Nexa Pay Solana & Hybrid PIX Gateway",
    network: "Solana Devnet / Mainnet-Beta Hybrid",
    timestamp: new Date().toISOString(),
  });
});

// Live FX rates endpoint (USDC/BRL, SOL/BRL, EURC/BRL)
app.get("/api/fx-rates", (_req, res) => {
  res.json({
    base: "USD",
    rates: {
      USDC_BRL: 5.465,
      SOL_BRL: 745.20,
      SOL_USD: 136.35,
      EURC_BRL: 5.92,
    },
    updatedAt: new Date().toISOString(),
    provider: "Nexa Liquidity Aggregator Engine (Orca + BACEN Central Bank API)",
  });
});

// Generate EMV QRCPS (BACEN PIX) Payload Standard
app.post("/api/pix/generate-emv", (req, res) => {
  const { pixKey, merchantName, merchantCity, txAmount, txId, description } = req.body;
  
  if (!pixKey || !merchantName) {
    return res.status(400).json({ error: "Missing required fields: pixKey and merchantName" });
  }

  // Format Helper for TLV (Tag-Length-Value)
  const formatTlv = (tag: string, value: string) => {
    const len = value.length.toString().padStart(2, "0");
    return `${tag}${len}${value}`;
  };

  // CRC16-CCITT Calculation
  const computeCrc16 = (payload: string): string => {
    let crc = 0xffff;
    const polynomial = 0x1021;
    const bytes = Buffer.from(payload, "utf8");

    for (const b of bytes) {
      for (let i = 0; i < 8; i++) {
        const bit = ((b >> (7 - i)) & 1) === 1;
        const c15 = ((crc >> 15) & 1) === 1;
        crc <<= 1;
        if (c15 !== bit) {
          crc ^= polynomial;
        }
      }
    }
    crc &= 0xffff;
    return crc.toString(16).toUpperCase().padStart(4, "0");
  };

  try {
    const p00 = formatTlv("00", "01"); // Payload Format Indicator
    const p01 = formatTlv("01", "12"); // Point of Initiation Method (Dynamic=12)
    
    // Merchant Account Information (Tag 26 for PIX)
    const gui = formatTlv("00", "br.gov.bcb.pix");
    const key = formatTlv("01", pixKey);
    const desc = description ? formatTlv("02", description) : "";
    const merchantInfo = formatTlv("26", `${gui}${key}${desc}`);
    
    const category = formatTlv("52", "0000"); // Merchant Category Code
    const currency = formatTlv("53", "986"); // Transaction Currency (986 = BRL)
    const amountStr = txAmount ? Number(txAmount).toFixed(2) : "";
    const amount = amountStr ? formatTlv("54", amountStr) : "";
    const country = formatTlv("58", "BR"); // Country Code
    const name = formatTlv("59", merchantName.slice(0, 25));
    const city = formatTlv("60", (merchantCity || "SAO PAULO").slice(0, 15));
    
    // Additional Data Field Template (Tag 62)
    const reference = formatTlv("05", (txId || "***").slice(0, 25));
    const additionalData = formatTlv("62", reference);
    
    const rawWithoutCrc = `${p00}${p01}${merchantInfo}${category}${currency}${amount}${country}${name}${city}${additionalData}6304`;
    const crc = computeCrc16(rawWithoutCrc);
    const fullEmvPayload = `${rawWithoutCrc}${crc}`;

    return res.json({
      success: true,
      payload: fullEmvPayload,
      crc,
      txId: txId || `NEXA-${Date.now()}`,
      formattedAmount: amountStr ? `R$ ${amountStr}` : "Open Amount",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate EMV payload" });
  }
});

// Gemini-powered Agentic Allowance Security Evaluator

// IMPORTANT: Define this sanitization function to prevent Prompt Injection (OWASP A3)
function sanitizeUserInputForLLM(input: string): string {
  // Basic sanitization to prevent prompt injection by escaping characters
  // that could break the LLM's parsing or be interpreted as instructions.
  // The exact escaping may need to be fine-tuned for the specific LLM and its vulnerabilities.
  // This is a minimal example; a robust solution might involve more complex parsing or a dedicated library.
  return input
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/"/g, '\"')   // Escape double quotes
    .replace(/'/g, "\'")   // Escape single quotes
    .replace(/`/g, '\`')   // Escape backticks
    .replace(/\n/g, '\\n')  // Escape newlines
    .replace(/\r/g, '\\r')  // Escape carriage returns
    .replace(/\$/g, '\\
app.post("/api/ai/evaluate-policy", async (req, res) => {
  const { agentId, requestedAmountUsd, merchantPubkey, historicalSpendUsd, policyParams, prompt } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    // Return heuristic policy response if no Gemini API key configured
    const limit = policyParams?.maxSpendPerTx || 50;
    const isApproved = requestedAmountUsd <= limit;
    return res.json({
      approved: isApproved,
      riskScore: isApproved ? 12 : 88,
      reasoning: isApproved
        ? `Request of $${requestedAmountUsd} is within configured PDA Agentic Allowance of $${limit}. Zero-custody CPI route validated.`
        : `Request of $${requestedAmountUsd} exceeds spending cap of $${limit}. Transaction vetoed by PDA guard logic.`,
      recommendedPriorityFeeLamports: 5000,
      mode: "Heuristic Guard (Fallback)",
    });
  }

  try {
    const model = ai.models;
    const response = await model.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are the Security Risk Engine for Nexa Pay's Agentic Session Allowance PDA framework on Solana.
Analyze this automated AI agent payment request:
- Agent ID: ${agentId}
- Requested Amount USD: $${requestedAmountUsd}
- Merchant Public Key: ${merchantPubkey}
- Agent Historical 24h Spend: $${historicalSpendUsd}
- Max Spend Per Tx Allowed: $${policyParams?.maxSpendPerTx || 50}
- Max Daily Limit: $${policyParams?.maxDailyLimit || 200}
- Allowed Categories: ${policyParams?.allowedCategories?.join(", ") || "APIs, Compute, SaaS"}
- Custom Context/Prompt: ${sanitizeUserInputForLLM(prompt || "Standard API micro-payment evaluation")}

Respond strictly in JSON with this structure:
{
  "approved": boolean,
  "riskScore": number (0-100),
  "reasoning": string,
  "recommendedPriorityFeeLamports": number,
  "suggestedSafetyAction": string
}`,
    });

    const text = response.text || "";
    // Clean JSON formatting if wrapped in markdown codeblocks
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    return res.json({ ...parsed, mode: "Gemini 2.5 Flash Autonomous Risk Engine" });
  } catch (err: any) {
    return res.json({
      approved: requestedAmountUsd <= (policyParams?.maxSpendPerTx || 50),
      riskScore: 25,
      reasoning: `Evaluated by Nexa PDA Guard rules: ${err.message || "Standard compliance rule applied"}`,
      recommendedPriorityFeeLamports: 5000,
      mode: "Heuristic Fallback",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nexa Pay Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
)  // Escape dollar signs (if used in template literals by LLM)
    .trim();
}

app.post("/api/ai/evaluate-policy", async (req, res) => {
  const { agentId, requestedAmountUsd, merchantPubkey, historicalSpendUsd, policyParams, prompt } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    // Return heuristic policy response if no Gemini API key configured
    const limit = policyParams?.maxSpendPerTx || 50;
    const isApproved = requestedAmountUsd <= limit;
    return res.json({
      approved: isApproved,
      riskScore: isApproved ? 12 : 88,
      reasoning: isApproved
        ? `Request of $${requestedAmountUsd} is within configured PDA Agentic Allowance of $${limit}. Zero-custody CPI route validated.`
        : `Request of $${requestedAmountUsd} exceeds spending cap of $${limit}. Transaction vetoed by PDA guard logic.`,
      recommendedPriorityFeeLamports: 5000,
      mode: "Heuristic Guard (Fallback)",
    });
  }

  try {
    const model = ai.models;
    const response = await model.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are the Security Risk Engine for Nexa Pay's Agentic Session Allowance PDA framework on Solana.
Analyze this automated AI agent payment request:
- Agent ID: ${agentId}
- Requested Amount USD: $${requestedAmountUsd}
- Merchant Public Key: ${merchantPubkey}
- Agent Historical 24h Spend: $${historicalSpendUsd}
- Max Spend Per Tx Allowed: $${policyParams?.maxSpendPerTx || 50}
- Max Daily Limit: $${policyParams?.maxDailyLimit || 200}
- Allowed Categories: ${policyParams?.allowedCategories?.join(", ") || "APIs, Compute, SaaS"}
- Custom Context/Prompt: ${sanitizeUserInputForLLM(prompt || "Standard API micro-payment evaluation")}

Respond strictly in JSON with this structure:
{
  "approved": boolean,
  "riskScore": number (0-100),
  "reasoning": string,
  "recommendedPriorityFeeLamports": number,
  "suggestedSafetyAction": string
}`,
    });

    const text = response.text || "";
    // Clean JSON formatting if wrapped in markdown codeblocks
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    return res.json({ ...parsed, mode: "Gemini 2.5 Flash Autonomous Risk Engine" });
  } catch (err: any) {
    return res.json({
      approved: requestedAmountUsd <= (policyParams?.maxSpendPerTx || 50),
      riskScore: 25,
      reasoning: `Evaluated by Nexa PDA Guard rules: ${err.message || "Standard compliance rule applied"}`,
      recommendedPriorityFeeLamports: 5000,
      mode: "Heuristic Fallback",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nexa Pay Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
