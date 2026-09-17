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
  } catch {
    // Client-side fallback if server API is unavailable
    const isApproved = params.requestedAmountUsd <= params.policyParams.maxSpendPerTx;
    return {
      approved: isApproved,
      riskScore: isApproved ? 15 : 85,
      reasoning: isApproved
        ? `Request of $${params.requestedAmountUsd.toFixed(2)} is within the PDA single transaction allowance limit ($${params.policyParams.maxSpendPerTx.toFixed(2)}).`
        : `Request of $${params.requestedAmountUsd.toFixed(2)} exceeds allowance cap ($${params.policyParams.maxSpendPerTx.toFixed(2)}). PDA policy rejected transaction.`,
      recommendedPriorityFeeLamports: 5000,
      mode: "Client Local Policy Engine",
    };
  }
}
