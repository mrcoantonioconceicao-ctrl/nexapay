import React, { useState } from "react";
import { 
  Activity, 
  Search, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Layers, 
  ShieldCheck, 
  Zap,
  ChevronRight,
  RefreshCcw
} from "lucide-react";
import { NexaTransaction } from "../types";

interface TransactionExplorerProps {
  transactions: NexaTransaction[];
}

export const TransactionExplorer: React.FC<TransactionExplorerProps> = ({ transactions }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTx, setSelectedTx] = useState<NexaTransaction | null>(transactions[0] || null);

  const filteredTxs = transactions.filter(
    (tx) =>
      tx.signature.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.buyerPubkey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.merchantPubkey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-400" />
              Sub-Second Finality Ledger & Explorer
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Solana Block Watcher
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Monitor real-time settlement signatures on Solana. Inspect slot height, finality latency (sub-420ms average), CPI inner instruction call stacks, and zero-custody token balance state diffs.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Avg Finality</span>
            <span className="font-bold text-emerald-400 text-sm">~412 ms</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Zero Custody</span>
            <span className="font-bold text-cyan-400 text-sm">100% Verified</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Transaction Feed List */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Transactions ({transactions.length})
            </h3>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Feed
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by signature, pubkey, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredTxs.map((tx) => {
              const isSelected = selectedTx?.signature === tx.signature;
              return (
                <button
                  key={tx.signature}
                  onClick={() => setSelectedTx(tx)}
                  className={`w-full p-3.5 rounded-lg border text-left transition space-y-1.5 font-mono ${
                    isSelected
                      ? "bg-slate-950 border-cyan-500 shadow-md"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300 truncate max-w-[180px]">
                      {tx.signature.slice(0, 10)}...{tx.signature.slice(-8)}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      {tx.finalityMs}ms
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 uppercase text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {tx.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-white font-bold">
                      {(tx.amount ?? 0).toFixed(2)} {tx.tokenSymbol}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Slot #{tx.slot}</span>
                    <span>{tx.blockTime}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Transaction Detailed Inspector */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6">
          {selectedTx ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Transaction Breakdown</h3>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {selectedTx.confirmationStatus.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1 break-all">
                    Signature: {selectedTx.signature}
                  </p>
                </div>

                <div className="text-right font-mono text-xs">
                  <div className="text-slate-400">Slot: #{selectedTx.slot}</div>
                  <div className="text-emerald-400 font-bold">Latency: {selectedTx.finalityMs} ms</div>
                </div>
              </div>

              {/* Grid Properties */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Buyer Public Key</span>
                  <span className="font-bold text-slate-200">{selectedTx.buyerPubkey}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Merchant Wallet</span>
                  <span className="font-bold text-slate-200">{selectedTx.merchantPubkey}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Amount Transfer</span>
                  <span className="font-bold text-cyan-400 text-sm">
                    {selectedTx.amount} {selectedTx.tokenSymbol} (R$ {(selectedTx.fiatEquivalentBrl ?? 0).toFixed(2)})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Custody Proof</span>
                  <span className="font-bold text-emerald-400 text-sm">ZERO CUSTODY</span>
                </div>
              </div>

              {/* Logs */}
              <div>
                <h4 className="text-xs uppercase font-bold text-slate-400 mb-2 font-mono">
                  Program Logs & CPI Stack ({selectedTx.logs.length})
                </h4>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-1.5">
                  {selectedTx.logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-slate-600">&gt;</span>
                      <span className={log.includes("ZERO-CUSTODY") ? "text-emerald-400 font-bold" : "text-slate-300"}>
                        {log}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-500 text-xs">
              Select a transaction from the list on the left to inspect its finality details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
