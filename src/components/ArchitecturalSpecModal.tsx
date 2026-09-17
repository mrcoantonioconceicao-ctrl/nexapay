import React from "react";
import { X, ShieldCheck, CheckCircle2, Lock, FileCode } from "lucide-react";

interface ArchitecturalSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitecturalSpecModal: React.FC<ArchitecturalSpecModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Zero-Custody Architectural Invariants</h3>
            <p className="text-xs text-slate-400 font-mono">Nexa Pay Smart Contract Verification</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Invariant 1: Direct Transfer Escrowless Routing
            </div>
            <p className="text-slate-400 text-[11px]">
              Tokens bypass program vaults completely. The instruction `process_direct_payment` transfers SPL tokens directly from `buyer_token_account` to `merchant_token_account` using standard Token Program CPI.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              Invariant 2: Agentic Session Allowance PDA Isolation
            </div>
            <p className="text-slate-400 text-[11px]">
              PDAs store spending limits (`max_spend_per_tx`, `daily_limit`) without acquiring custody over user private keys. Buyers retain 100% ownership and can revoke the PDA at any moment.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
            <div className="text-purple-400 font-bold flex items-center gap-1.5">
              <FileCode className="w-4 h-4" />
              Invariant 3: CPI Liquidity Atomic Swaps
            </div>
            <p className="text-slate-400 text-[11px]">
              Multi-hop liquidity swaps execute atomically using CPI (`invoke_signed`). If slippage tolerance or BACEN off-ramp fails, the entire transaction reverts seamlessly with zero lost funds.
            </p>
          </div>
        </div>

        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition"
          >
            Understood &amp; Verified
          </button>
        </div>
      </div>
    </div>
  );
};
