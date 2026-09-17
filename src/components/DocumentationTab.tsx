import React from "react";
import { 
  FileText, 
  ShieldCheck, 
  Zap, 
  GitBranch, 
  Bot, 
  Layers, 
  Code2, 
  CheckCircle2, 
  Cpu, 
  Globe 
} from "lucide-react";

export const DocumentationTab: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-cyan-500/20">
            N
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Nexa Pay Technical Specifications & Architectural Whitepaper
            </h1>
            <p className="text-xs text-cyan-400 font-mono mt-0.5">
              Production-Ready Non-Custodial Solana + PIX Payment Infrastructure
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          Nexa Pay is a zero-custody hybrid payment gateway designed for high-throughput, sub-second crypto settlements and instant Brazilian PIX off-ramping. Built on Solana with the Anchor framework, Nexa Pay introduces autonomous Agentic Session Allowance PDAs, enabling AI agents and micro-services to execute payments seamlessly without repetitive wallet signature prompts.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Custody Model</span>
            <span className="font-bold text-emerald-400">ZERO CUSTODY</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Smart Contract</span>
            <span className="font-bold text-cyan-400">Anchor 0.30.1 Rust</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Settlement Speed</span>
            <span className="font-bold text-purple-400">~410ms Finality</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">PIX Specification</span>
            <span className="font-bold text-slate-200">BACEN EMV QRCPS</span>
          </div>
        </div>
      </div>

      {/* Section 1: Zero-Custody Core Invariants */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">1. Zero-Custody Guarantee & Invariants</h2>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Traditional payment gateways pool funds in intermediate program escrows or central hot wallets. Nexa Pay strictly enforces a <strong>Zero-Custody Architecture</strong>:
          </p>

          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Direct-to-Merchant Token Transfer:</strong> SPL tokens move atomically from the buyer&apos;s Associated Token Account (ATA) directly to the merchant&apos;s ATA via standard SPL Token Program CPI transfers.
              </div>
            </li>
            <li className="flex items-start gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Program Vault Balance Invariant = 0:</strong> The Nexa Pay program derived addresses never hold user or merchant funds in escrow. Program compromise cannot lead to loss of customer funds.
              </div>
            </li>
            <li className="flex items-start gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">On-Chain Receipt Event Logging:</strong> Emits lightweight Anchor events with memo references, allowing sub-second indexers to verify finality instantly.
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 2: Agentic Session Allowance PDAs */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <Bot className="w-6 h-6 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">2. Agentic Session Allowance via PDAs</h2>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Autonomous AI agents (e.g., automated trading bots, LLM API micro-buyers, SaaS compute agents) require frictionless payment execution without asking human users to approve wallet popups for every $0.05 request.
          </p>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono space-y-2 text-[11px]">
            <div className="text-cyan-400 font-bold">Anchor PDA Seed Derivation Strategy:</div>
            <div className="bg-slate-900 p-2.5 rounded text-slate-200 border border-slate-800/80">
              Pubkey::find_program_address(&amp;[b&quot;session&quot;, buyer.key().as_ref(), agent.key().as_ref(), merchant.key().as_ref()], program_id)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-white text-xs">On-Chain Spending Caps</h4>
              <p className="text-slate-400 text-[11px]">
                Enforces single transaction max spend caps (`max_spend_per_tx`) and 24-hour rolling daily budget caps (`daily_limit_lamports`).
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-white text-xs">Instant Revocation &amp; Rent Reclamation</h4>
              <p className="text-slate-400 text-[11px]">
                The buyer can invoke `revoke_allowance` at any time to close the PDA account and reclaim the rent-exempt SOL lamports back to their wallet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: CPI Liquidity Routing & PIX Hybrid Off-Ramping */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <GitBranch className="w-6 h-6 text-purple-400" />
          <h2 className="text-lg font-bold text-white">3. CPI Liquidity Routing &amp; Hybrid PIX Integration</h2>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            To settle crypto directly into Brazilian Reais (BRL) via the Central Bank of Brazil (BACEN) PIX instant rail, Nexa Pay uses <strong>Cross-Program Invocations (CPI)</strong> to execute single-tx swaps on Orca Whirlpools or Raydium AMM pools.
          </p>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] space-y-2">
            <div className="text-purple-400 font-bold">EMV QRCPS (BACEN PIX Standard) Payload Format:</div>
            <p className="text-slate-400">
              Payload includes format indicator (00), Initiation Method (01), Merchant Account (26: br.gov.bcb.pix), Currency (53: 986 BRL), Additional Data (62: TXID reference), and CRC16-CCITT checksum (Tag 63).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
