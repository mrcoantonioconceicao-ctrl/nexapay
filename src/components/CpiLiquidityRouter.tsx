import React, { useState } from "react";
import { 
  GitBranch, 
  ArrowRight, 
  Zap, 
  Sliders, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  RefreshCw,
  Cpu,
  TrendingUp,
  Activity
} from "lucide-react";
import { FXRates, PaymentMethod, CpiRouteExecution, CpiHop } from "../types";
import { ORCA_WHIRLPOOL_PROGRAM_ID, SPL_TOKEN_PROGRAM_ID, NEXA_PROGRAM_ID } from "../lib/solana/nexaAnchorProgram";

interface CpiLiquidityRouterProps {
  fxRates: FXRates;
}

export const CpiLiquidityRouter: React.FC<CpiLiquidityRouterProps> = ({ fxRates }) => {
  const [sourceToken, setSourceToken] = useState<PaymentMethod>("SOL");
  const [amountIn, setAmountIn] = useState<number>(0.25);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [priorityFee, setPriorityFee] = useState<number>(5000);
  const [computeUnits, setComputeUnits] = useState<number>(200000);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<CpiRouteExecution | null>(null);

  // Calculated Outputs with safe guards
  const safeAmountIn = typeof amountIn === "number" && !isNaN(amountIn) ? amountIn : 0;
  const solUsdRate = fxRates?.SOL_USD ?? 136.35;
  const usdcBrlRate = fxRates?.USDC_BRL ?? 5.465;
  const amountInUsd = sourceToken === "SOL" ? safeAmountIn * solUsdRate : safeAmountIn;
  const estBrlOut = amountInUsd * usdcBrlRate * (1 - (slippage || 0) / 100);

  const handleSimulateCpiSwap = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    await new Promise((resolve) => setTimeout(resolve, 450));

    const hops: CpiHop[] = [
      {
        step: 1,
        name: "Compute Budget Optimization",
        programId: "ComputeBudget111111111111111111111111111111",
        instructionName: "SetComputeUnitPrice & SetComputeUnitLimit",
        inputToken: `${priorityFee} micro-lamports`,
        outputToken: `${computeUnits.toLocaleString()} CU Limit`,
        estAmountIn: `${priorityFee}`,
        estAmountOut: `${computeUnits}`,
        priceImpactPct: 0.0,
        status: "settled",
      },
      {
        step: 2,
        name: "Orca Whirlpool CPI Swap",
        programId: ORCA_WHIRLPOOL_PROGRAM_ID.toBase58(),
        instructionName: "swap_v2 (CPI invoke_signed)",
        inputToken: `${safeAmountIn.toFixed(4)} ${sourceToken}`,
        outputToken: `$${amountInUsd.toFixed(2)} USDC`,
        estAmountIn: `${safeAmountIn.toFixed(4)}`,
        estAmountOut: `${amountInUsd.toFixed(2)}`,
        priceImpactPct: 0.04,
        status: "settled",
      },
      {
        step: 3,
        name: "BACEN PIX Liquidity Off-Ramp Bridge",
        programId: NEXA_PROGRAM_ID.toBase58(),
        instructionName: "route_cpi_liquidity (Direct-to-BACEN)",
        inputToken: `$${amountInUsd.toFixed(2)} USDC`,
        outputToken: `R$ ${estBrlOut.toFixed(2)} BRL`,
        estAmountIn: `${amountInUsd.toFixed(2)}`,
        estAmountOut: `${estBrlOut.toFixed(2)}`,
        priceImpactPct: 0.01,
        status: "settled",
      },
    ];

    const result: CpiRouteExecution = {
      routeId: `CPI-ROUTE-${Date.now().toString().slice(-6)}`,
      sourceToken,
      destSettlement: "MERCHANT_PIX_BRL",
      amountIn,
      amountOut: estBrlOut,
      fxRateUsed: fxRates.USDC_BRL,
      slippagePct: slippage,
      priorityFeeLamports: priorityFee,
      computeUnitsUsed: 142850,
      hops,
    };

    setIsExecuting(false);
    setExecutionResult(result);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-cyan-400" />
              CPI Liquidity Routing Engine
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Cross-Program Invocation
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Automates multi-hop liquidity routing on Solana using CPI (`invoke_signed`). Converts volatile crypto assets into instant BRL PIX settlements directly into merchant accounts with minimal price impact and slippage protection.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">AMM Pool Partner</span>
            <span className="font-bold text-purple-400">Orca Whirlpools</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Slippage Guard</span>
            <span className="font-bold text-emerald-400">{slippage}% Max</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Router Configuration Panel */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Route Parameters
            </h3>
            <span className="text-[10px] text-cyan-400 font-mono">Sub-Second Pipeline</span>
          </div>

          {/* Input Asset & Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Source Asset
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["SOL", "USDC", "EURC"] as PaymentMethod[]).map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => setSourceToken(token)}
                  className={`py-2 text-xs font-mono font-bold rounded border transition ${
                    sourceToken === token
                      ? "bg-cyan-950/60 border-cyan-500 text-cyan-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Input Amount ({sourceToken})
            </label>
            <input
              type="number"
              min="0.01"
              step="0.1"
              value={amountIn}
              onChange={(e) => setAmountIn(parseFloat(e.target.value) || 0.01)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-lg font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Slippage Tolerance Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-400">Slippage Tolerance:</span>
              <span className="text-cyan-400 font-bold">{slippage}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-950"
            />
          </div>

          {/* Compute Unit & Priority Fee Optimizer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                Priority Fee (Lamports)
              </label>
              <input
                type="number"
                step="1000"
                value={priorityFee}
                onChange={(e) => setPriorityFee(parseInt(e.target.value) || 1000)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                Compute Unit Limit
              </label>
              <input
                type="number"
                step="10000"
                value={computeUnits}
                onChange={(e) => setComputeUnits(parseInt(e.target.value) || 100000)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Estimated Conversion Summary */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Input Value (USD):</span>
              <span className="text-white font-bold">${(amountInUsd ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Estimated Merchant PIX:</span>
              <span className="text-emerald-400 font-bold text-sm">R$ {(estBrlOut ?? 0).toFixed(2)} BRL</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[10px]">
              <span>Effective FX Rate:</span>
              <span>1 USD = R$ {(fxRates?.USDC_BRL ?? 5.465).toFixed(2)}</span>
            </div>
          </div>

          <button
            disabled={isExecuting}
            onClick={handleSimulateCpiSwap}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-lg shadow-lg shadow-purple-500/20 transition flex items-center justify-center gap-2"
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Invoking Cross-Program Route...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Simulate CPI Liquidity Execution
              </>
            )}
          </button>
        </div>

        {/* Right Column: Visual CPI Routing Graph & Inner Instruction Stack */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Visual Pipeline & Inner Instruction Stack
              </h3>
              <span className="text-xs text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20 font-mono">
                Atomic Transaction Bundle
              </span>
            </div>

            {/* Visual Route Hops Pipeline */}
            <div className="space-y-4">
              {/* Hop 1: Buyer Input */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    01
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Buyer Input Token</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {amountIn} {sourceToken} (${amountInUsd.toFixed(2)})
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </div>

              {/* Hop 2: Orca Whirlpool CPI Swap */}
              <div className="bg-purple-950/20 p-4 rounded-xl border border-purple-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold text-xs">
                    02
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      Orca Whirlpool CPI Swap
                      <span className="text-[9px] bg-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded font-mono">
                        invoke_signed
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {sourceToken} &rarr; USDC (Price Impact: 0.04%)
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </div>

              {/* Hop 3: BACEN PIX Settlement Rail */}
              <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs">
                    03
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      BACEN PIX Direct Off-Ramp
                      <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                        Instant Finality
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      USDC &rarr; R$ {estBrlOut.toFixed(2)} BRL into Merchant Account
                    </div>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Execution Result Log Stack */}
          {executionResult && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  CPI Execution Success ({executionResult.routeId})
                </span>
                <span className="text-[10px] text-slate-400">
                  CU Used: {executionResult.computeUnitsUsed.toLocaleString()} / {computeUnits.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2">
                {executionResult.hops.map((hop) => (
                  <div key={hop.step} className="bg-slate-900 p-2.5 rounded border border-slate-800/80 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-300 font-bold">
                      <span>Step {hop.step}: {hop.name}</span>
                      <span className="text-purple-400">{hop.instructionName}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Program ID: {hop.programId.slice(0, 16)}...</span>
                      <span className="text-emerald-400">{hop.outputToken}</span>
                    </div>
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
