import React, { useState, useEffect } from "react";
import { 
  Zap, 
  ShieldCheck, 
  Terminal, 
  GitBranch, 
  Store, 
  Code2, 
  FileText, 
  Globe, 
  Activity, 
  Wallet,
  Layers,
  Sparkles
} from "lucide-react";
import { FXRates } from "../types";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  buyerWalletPubkey: string;
  onRotateWallet: () => void;
  fxRates: FXRates;
  openSpecModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  buyerWalletPubkey,
  onRotateWallet,
  fxRates,
  openSpecModal,
}) => {
  const [slot, setSlot] = useState(312849102);
  const [tps, setTps] = useState(2894);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlot((s) => s + 1);
      setTps(2800 + Math.floor(Math.random() * 250));
    }, 400);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: "pos", label: "Merchant POS & Gateway", icon: Store },
    { id: "agentic", label: "Agentic Session PDAs", icon: Zap },
    { id: "cpi", label: "CPI Liquidity Router", icon: GitBranch },
    { id: "anchor", label: "Anchor Program & IDL", icon: Code2 },
    { id: "explorer", label: "Finality Explorer", icon: Activity },
    { id: "widget", label: "Checkout Widget", icon: Layers },
    { id: "docs", label: "Architecture Specs", icon: FileText },
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      {/* Top Banner Bar: FX Rates & Solana Devnet Status */}
      <div className="bg-slate-900/90 text-xs px-4 py-1.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            SOLANA DEVNET / MAINNET HYBRID
          </span>
          <span className="hidden sm:inline-block">Slot: #{slot.toLocaleString()}</span>
          <span className="hidden md:inline-block">TPS: {tps.toLocaleString()}</span>
          <span className="hidden lg:inline-block text-slate-500">Avg Finality: ~410ms</span>
        </div>

        <div className="flex items-center gap-4 text-slate-300 overflow-x-auto py-0.5">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">USDC/BRL:</span>
            <span className="font-semibold text-emerald-400">R$ {(fxRates?.USDC_BRL ?? 5.465).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">SOL/BRL:</span>
            <span className="font-semibold text-cyan-400">R$ {(fxRates?.SOL_BRL ?? 745.20).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">SOL/USD:</span>
            <span className="font-semibold text-purple-400">${(fxRates?.SOL_USD ?? 136.35).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Primary Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 font-extrabold text-xl tracking-wider border border-cyan-400/30">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Nexa Pay
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Non-Custodial
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Solana & Hybrid PIX Payment Infrastructure • Anchor Smart Contracts
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={openSpecModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Zero-Custody Proof
          </button>

          {/* Connected Devnet Keypair Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs font-mono">
            <Wallet className="w-4 h-4 text-emerald-400 ml-1" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 leading-none">Buyer Keypair</span>
              <span className="font-semibold text-slate-200 text-xs">
                {buyerWalletPubkey.slice(0, 4)}...{buyerWalletPubkey.slice(-4)}
              </span>
            </div>
            <button
              onClick={onRotateWallet}
              title="Rotate Keypair"
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-cyan-300 font-sans transition ml-1"
            >
              Rotate
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-1 overflow-x-auto scrollbar-none border-t border-slate-800/80 pt-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition whitespace-nowrap border-b-2 ${
                isActive
                  ? "bg-slate-900 text-cyan-400 border-cyan-400 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
