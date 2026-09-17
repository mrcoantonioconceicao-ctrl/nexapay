/**
 * Gemini AI Helper for Nexa Pay Policy Evaluation & Architect Assistant
 */

export interface AiEvaluationResult {
  approved: boolean;
  riskScore: number;
  reasoning: string;
  recommendedPriorityFeeLamports: number;
  suggestedSafetyAction?: string;
  mode: string;
}

export async function evaluateAgenticPolicy(params: {
  agentId: string;
  requestedAmountUsd: number;
  merchantPubkey: string;
  historicalSpendUsd: number;
  policyParams: {
    maxSpendPerTx: number;
    maxDailyLimit: number;
    allowedCategories: string[];
  };
  prompt?: string;
}): Promise<AiEvaluationResult> {
  try {
    const response = await fetch("/api/ai/evaluate-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Server responded with error status");
    }

    return await response.json();
  } catch (error) {
    // Fallback if server AI API is unavailable. Default to denial for security.
    console.error("AI policy evaluation API unavailable, falling back to client-side denial:", error);
    return {
      approved: false,
      riskScore: 100,
      reasoning: "AI policy evaluation API is currently unavailable. Transaction rejected for safety and integrity.",
      recommendedPriorityFeeLamports: 0,
      suggestedSafetyAction: "Contact support or try again later if this issue persists.",
      mode: "Client Local Policy Engine (Safe Fallback)",
    };
  }
}
