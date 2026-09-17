import React, { useState } from "react";
import { 
  Zap, 
  Bot, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Key, 
  Clock, 
  Play, 
  RotateCcw, 
  Sparkles,
  Terminal,
  Cpu,
  ArrowUpRight
} from "lucide-react";
import { AgentSessionAllowance, MerchantAccount } from "../types";
import { deriveAgentSessionPDA, NEXA_PROGRAM_ID, toValidPublicKey } from "../lib/solana/nexaAnchorProgram";
import { evaluateAgenticPolicy, AiEvaluationResult } from "../lib/gemini/agenticEvaluator";
import { PublicKey } from "@solana/web3.js";

interface AgenticAllowanceWorkspaceProps {
  buyerPubkey: string;
  merchants: MerchantAccount[];
  allowances: AgentSessionAllowance[];
  onGrantAllowance: (newAllowance: AgentSessionAllowance) => void;
  onRevokeAllowance: (pdaPubkey: string) => void;
  onExecuteAgentPayment: (pdaPubkey: string, amountUsd: number) => void;
}

export const AgenticAllowanceWorkspace: React.FC<AgenticAllowanceWorkspaceProps> = ({
  buyerPubkey,
  merchants,
  allowances,
  onGrantAllowance,
  onRevokeAllowance,
  onExecuteAgentPayment,
}) => {
  const [selectedMerchant, setSelectedMerchant] = useState<string>(merchants[0]?.solanaWallet || "");
  const [agentKey, setAgentKey] = useState<string>(toValidPublicKey("autonomous_ai_agent_identity").toBase58());
  const [maxPerTx, setMaxPerTx] = useState<number>(15.0);
  const [dailyLimit, setDailyLimit] = useState<number>(150.0);
  const [durationHours, setDurationHours] = useState<number>(24);

  // Simulation execution state
  const [simulatingPda, setSimulatingPda] = useState<string | null>(null);
  const [simAmount, setSimAmount] = useState<number>(12.5);
  const [simResult, setSimResult] = useState<{
    success: boolean;
    logs: string[];
    aiResult?: AiEvaluationResult;
  } | null>(null);

  // Compute live PDA address using Solana Web3
  let computedPda = "";
  let computedBump = 255;
  try {
    const buyerKey = toValidPublicKey(buyerPubkey, "buyer");
    const agentPK = toValidPublicKey(agentKey, "agent");
    const merchKey = toValidPublicKey(selectedMerchant || merchants[0].solanaWallet, "merchant");
    const { pda, bump } = deriveAgentSessionPDA(buyerKey, agentPK, merchKey);
    computedPda = pda.toBase58();
    computedBump = bump;
  } catch {
    computedPda = "Invalid PublicKey formatting";
  }

  const handleCreateAllowance = () => {
    if (!computedPda || computedPda.includes("Invalid")) return;

    const newAllowance: AgentSessionAllowance = {
      pdaPublicKey: computedPda,
      bump: computedBump,
      buyerPublicKey: buyerPubkey,
      agentPublicKey: agentKey,
      merchantPublicKey: selectedMerchant,
      allowedTokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      maxSpendPerTx: maxPerTx,
      dailyLimitUsd: dailyLimit,
      spentTodayUsd: 0,
      remainingDailyUsd: dailyLimit,
      expiryTimestamp: Math.floor(Date.now() / 1000) + durationHours * 3600,
      createdAt: new Date().toLocaleTimeString(),
      revoked: false,
      totalTransactionsCount: 0,
      allowanceScope: ["API Micro-payments", "Compute Cycles", "Auto-offramp"],
    };

    onGrantAllowance(newAllowance);
  };

  const handleRunAgentExecution = async (allowance: AgentSessionAllowance) => {
    setSimulatingPda(allowance.pdaPublicKey);
    setSimResult(null);

    // Call Gemini Autonomous Policy Evaluator
    const aiRes = await evaluateAgenticPolicy({
      agentId: allowance.agentPublicKey.slice(0, 8),
      requestedAmountUsd: simAmount,
      merchantPubkey: allowance.merchantPublicKey,
      historicalSpendUsd: allowance.spentTodayUsd,
      policyParams: {
        maxSpendPerTx: allowance.maxSpendPerTx,
        maxDailyLimit: allowance.dailyLimitUsd,
        allowedCategories: allowance.allowanceScope,
      },
      prompt: "Autonomous agent requesting micro-payment execution for API token call",
    });

    await new Promise((resolve) => setTimeout(resolve, 350));

    if (aiRes.approved && simAmount <= allowance.maxSpendPerTx && simAmount <= allowance.remainingDailyUsd) {
      onExecuteAgentPayment(allowance.pdaPublicKey, simAmount);
      setSimResult({
        success: true,
        aiResult: aiRes,
        logs: [
          `Anchor Instruction: execute_agentic_payment`,
          `PDA Signer Verification: [session, buyer, agent, merchant] bump=${allowance.bump}`,
          `Zero-Custody CPI: Transferring $${(simAmount ?? 0).toFixed(2)} USDC directly to Merchant ATA`,
          `No Wallet Signature Prompt Required (Agent Delegated Allowance)`,
          `Sub-second finality confirmed in slot #312849150`,
        ],
      });
    } else {
      setSimResult({
        success: false,
        aiResult: aiRes,
        logs: [
          `Anchor Instruction: execute_agentic_payment REJECTED`,
          `Error 6002: ExceedsMaxSpendPerTx (Requested $${(simAmount ?? 0).toFixed(2)} > Cap $${(allowance?.maxSpendPerTx ?? 0).toFixed(2)})`,
          `PDA Security Guard Vetoed Transaction`,
        ],
      });
    }
    setSimulatingPda(null);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bot className="w-6 h-6 text-cyan-400" />
              Agentic Session Allowance Workspace
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Anchor PDA Delegation
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Grant autonomous AI agents spending limits via Program Derived Addresses (PDAs). 
            Agents can settle micro-payments automatically without popping up wallet confirmation dialogs for every transaction, while enforcing strict on-chain guardrails.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Active Sessions</span>
            <span className="font-bold text-cyan-400 text-sm">
              {allowances.filter((a) => !a.revoked).length} PDAs
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Program ID</span>
            <span className="font-bold text-slate-300">NexaP1ay...1111</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Grant New Allowance PDA Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              Provision Agent Allowance PDA
            </h3>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded font-mono">
              Rent Exempt
            </span>
          </div>

          {/* Target Merchant */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Target Merchant
            </label>
            <select
              value={selectedMerchant}
              onChange={(e) => setSelectedMerchant(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {merchants.map((m) => (
                <option key={m.solanaWallet} value={m.solanaWallet}>
                  {m.name} ({m.solanaWallet.slice(0, 6)}...{m.solanaWallet.slice(-4)})
                </option>
              ))}
            </select>
          </div>

          {/* Agent Public Key */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Agent Identity Public Key
            </label>
            <input
              type="text"
              value={agentKey}
              onChange={(e) => setAgentKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Spending Caps */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                Max Per Tx ($)
              </label>
              <input
                type="number"
                min="1"
                step="5"
                value={maxPerTx}
                onChange={(e) => setMaxPerTx(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                24h Daily Limit ($)
              </label>
              <input
                type="number"
                min="5"
                step="25"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseFloat(e.target.value) || 5)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Session Expiry Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[6, 24, 168].map((hrs) => (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => setDurationHours(hrs)}
                  className={`py-1.5 text-xs font-mono rounded border transition ${
                    durationHours === hrs
                      ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {hrs === 168 ? "7 Days" : `${hrs} Hours`}
                </button>
              ))}
            </div>
          </div>

          {/* Live PDA Mathematical Derivation Box */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Anchor PDA Seed Derivation Formula
            </div>
            <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800/60 overflow-x-auto">
              [b&quot;session&quot;, buyer_pubkey, agent_pubkey, merchant_pubkey]
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>Derived PDA:</span>
              <span className="text-slate-200 font-bold">{computedPda.slice(0, 8)}...{computedPda.slice(-8)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Bump Seed:</span>
              <span className="text-purple-400 font-bold">{computedBump}</span>
            </div>
          </div>

          <button
            onClick={handleCreateAllowance}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Initialize Allowance PDA On-Chain
          </button>
        </div>

        {/* Right Column: Active Session PDAs & Agent Simulation */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Sessions List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                Active Agent Session PDAs ({allowances.length})
              </h3>
              <span className="text-xs text-slate-400 font-mono">Zero Popup Signings</span>
            </div>

            {allowances.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No active session PDAs found. Use the form on the left to provision one.
              </div>
            ) : (
              <div className="space-y-3">
                {allowances.map((a) => {
                  const isExpired = Date.now() / 1000 > a.expiryTimestamp;
                  return (
                    <div
                      key={a.pdaPublicKey}
                      className={`p-4 rounded-xl border transition space-y-3 ${
                        a.revoked || isExpired
                          ? "bg-slate-950/50 border-slate-800 text-slate-500"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-cyan-300">
                              PDA: {a.pdaPublicKey.slice(0, 8)}...{a.pdaPublicKey.slice(-8)}
                            </span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              bump: {a.bump}
                            </span>
                            {a.revoked ? (
                              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">
                                REVOKED
                              </span>
                            ) : isExpired ? (
                              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                                EXPIRED
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-1">
                            Agent: {a.agentPublicKey.slice(0, 6)}...{a.agentPublicKey.slice(-4)}
                          </div>
                        </div>

                        {!a.revoked && !isExpired && (
                          <button
                            onClick={() => onRevokeAllowance(a.pdaPublicKey)}
                            className="px-2.5 py-1 bg-red-950/50 hover:bg-red-900/80 text-red-300 border border-red-800/60 text-xs rounded transition font-medium flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Revoke
                          </button>
                        )}
                      </div>

                      {/* Spend Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] font-mono mb-1">
                          <span className="text-slate-400">Daily Budget Spent:</span>
                          <span className="text-cyan-400 font-semibold">
                            ${(a?.spentTodayUsd ?? 0).toFixed(2)} / ${(a?.dailyLimitUsd ?? 0).toFixed(2)} USDC
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-cyan-500 h-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, ((a?.spentTodayUsd ?? 0) / (a?.dailyLimitUsd || 1)) * 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                        <span>Max Cap per Tx: ${(a?.maxSpendPerTx ?? 0).toFixed(2)}</span>
                        <span>Scope: {(a?.allowanceScope || []).join(", ")}</span>
                      </div>

                      {/* Agentic Execution Tester Section */}
                      {!a.revoked && !isExpired && (
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              Test Agent Auto-Settlement
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">Amount USD:</span>
                              <input
                                type="number"
                                value={simAmount}
                                onChange={(e) => setSimAmount(parseFloat(e.target.value) || 1)}
                                className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-white text-center font-mono"
                              />
                            </div>
                          </div>

                          <button
                            disabled={simulatingPda === a.pdaPublicKey}
                            onClick={() => handleRunAgentExecution(a)}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs rounded border border-slate-700 transition flex items-center justify-center gap-2"
                          >
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                            Trigger Agent Payment Call ($ {(simAmount ?? 0).toFixed(2)})
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Simulation Output Terminal */}
          {simResult && (
            <div
              className={`p-4 rounded-xl border font-mono text-xs space-y-3 ${
                simResult.success
                  ? "bg-emerald-950/30 border-emerald-500/40"
                  : "bg-red-950/30 border-red-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {simResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <h4 className="font-bold text-white">
                    {simResult.success ? "Agent Micro-Payment Executed" : "Agent Payment Vetoed by PDA Guard"}
                  </h4>
                </div>
                <span className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                  {simResult.aiResult?.mode || "Gemini Policy Engine"}
                </span>
              </div>

              {simResult.aiResult && (
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 space-y-1">
                  <div>
                    <span className="text-slate-500">Risk Score:</span>{" "}
                    <span className={simResult.aiResult.riskScore < 50 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {simResult.aiResult.riskScore}/100
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Reasoning:</span> {simResult.aiResult.reasoning}
                  </div>
                </div>
              )}

              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1 text-slate-400 text-[11px]">
                {simResult.logs.map((l, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-slate-600">&gt;</span>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
