import React, { useState } from 'react';
import { ShieldCheck, QrCode, Cpu, CheckCircle2, Zap } from 'lucide-react';

export const DualRailSagaSimulator: React.FC = () => {
  const [step, setStep] = useState<number>(0);
  const [orderId, setOrderId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleInitCheckout = () => {
    const id = 'ord_' + Math.random().toString(36).substring(2, 9);
    setOrderId(id);
    setStep(1);
    addLog(`Checkout criado: ${id}. Rails Pix + Solana ativados.`);
  };

  const handlePixPay = () => {
    setStep(2);
    addLog(`Webhook Pix HMAC-SHA256 validado. Saga state: PENDING ➔ PIX_PAID`);
  };

  const handleAgentPay = async () => {
    setStep(3);
    addLog(`MCP check_agent_session_budget OK ($450.00 USDC remanescente).`);
    addLog(`CPI Direct ATA executado na Solana. Saga state: SETTLED.`);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 shadow-2xl font-mono">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="text-emerald-400 w-6 h-6" />
          <h2 className="text-xl font-bold tracking-tight">NexaPay Dual-Rail Live Visualizer</h2>
        </div>
        <span className="px-3 py-1 text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full">
          Non-Custodial Active
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 my-6">
        <button
          onClick={handleInitCheckout}
          className={`p-4 rounded-lg border text-left transition ${
            step >= 1 ? 'bg-emerald-950/40 border-emerald-600 text-white' : 'bg-slate-800 border-slate-700 hover:border-slate-500'
          }`}
        >
          <div className="text-xs text-slate-400">PASSO 1</div>
          <div className="font-bold flex items-center gap-1 mt-1"><QrCode size={16} /> Init Dual-Rail</div>
        </button>

        <button
          onClick={handlePixPay}
          disabled={step < 1}
          className={`p-4 rounded-lg border text-left transition ${
            step >= 2 ? 'bg-emerald-950/40 border-emerald-600 text-white' : 'bg-slate-800 border-slate-700 hover:border-slate-500 disabled:opacity-50'
          }`}
        >
          <div className="text-xs text-slate-400">PASSO 2</div>
          <div className="font-bold flex items-center gap-1 mt-1"><ShieldCheck size={16} /> Pix + HMAC</div>
        </button>

        <button
          onClick={handleAgentPay}
          disabled={step < 2}
          className={`p-4 rounded-lg border text-left transition ${
            step >= 3 ? 'bg-emerald-950/40 border-emerald-600 text-white' : 'bg-slate-800 border-slate-700 hover:border-slate-500 disabled:opacity-50'
          }`}
        >
          <div className="text-xs text-slate-400">PASSO 3</div>
          <div className="font-bold flex items-center gap-1 mt-1"><Cpu size={16} /> MCP Settlement</div>
        </button>
      </div>

      {orderId && (
        <div className="mb-4 p-3 bg-slate-800/80 rounded border border-slate-700 text-sm">
          <span className="text-slate-400">Order ID ativo:</span> <span className="text-emerald-400 font-semibold">{orderId}</span>
        </div>
      )}

      <div className="bg-black/60 rounded-lg p-4 h-48 overflow-y-auto border border-slate-800 text-xs space-y-1">
        {logs.length === 0 ? (
          <span className="text-slate-500">Aguardando gatilhos da demo...</span>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="text-emerald-300">
              {log}
            </div>
          ))
        )}
      </div>

      {step === 3 && (
        <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-700 rounded-lg flex items-center gap-3 text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">Zero Custody Confirmed: Fundos liquidados de ponta a ponta sem custódia intermediária.</span>
        </div>
      )}
    </div>
  );
};
