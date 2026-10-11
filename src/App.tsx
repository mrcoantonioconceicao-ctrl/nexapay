import React, { useState } from 'react';
import { QrCode, ShieldCheck, Zap, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('ord_demo_999');
  const [txHash, setTxHash] = useState('');

  const handleCreateOrder = () => {
    try {
      setLoading(true);
      setTimeout(() => {
        setOrderId(`nex_ord_${Math.floor(Math.random() * 89999 + 10000)}`);
        setLoading(false);
        setStep(2);
      }, 800);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleExecuteSettlement = () => {
    try {
      setLoading(true);
      setTimeout(() => {
        setTxHash(`5KzQ...${Math.floor(Math.random() * 8999 + 1000)}SolanaTx`);
        setLoading(false);
        setStep(3);
      }, 1000);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const resetDemo = () => {
    setStep(1);
    setTxHash('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-emerald-500 to-cyan-500 p-2 rounded-xl text-slate-950 font-bold">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">NexaPay <span className="text-emerald-400 text-xs px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">Live Demo</span></h1>
            <p className="text-xs text-slate-400">Gateway Dual-Rail Não Custodial (PIX + Solana)</p>
          </div>
        </div>
        <div className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
          Status Termux: <span className="text-emerald-400 font-semibold">● Online</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col justify-center">
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className={`p-4 rounded-xl border transition-all ${step >= 1 ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-1">Ato 1</div>
            <div className="font-bold text-sm">1. Geração do Pedido (PIX)</div>
          </div>
          <div className={`p-4 rounded-xl border transition-all ${step >= 2 ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-1">Ato 2</div>
            <div className="font-bold text-sm">2. Intermediação Não Custodial</div>
          </div>
          <div className={`p-4 rounded-xl border transition-all ${step >= 3 ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-1">Ato 3</div>
            <div className="font-bold text-sm">3. Liquidação Instantânea</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-emerald-400">
                <QrCode className="w-8 h-8" />
                <h2 className="text-2xl font-bold text-white">Checkout do Lojista (PDV)</h2>
              </div>
              <p className="text-slate-400 max-w-2xl">
                O cliente realiza uma compra na banca/estabelecimento. O NexaPay gera um pedido instantâneo com conversão automatizada em tempo real.
              </p>
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div>
                  <div className="text-xs text-slate-500 uppercase">Produto Selecionado</div>
                  <div className="text-lg font-semibold text-white">Assinatura / Produto Premium NexaPay</div>
                  <div className="text-2xl font-black text-emerald-400 mt-2">R$ 150,00 <span className="text-xs text-slate-400 font-normal">≈ 0.85 SOL</span></div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={loading}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <>Gerar Cobrança PIX <ArrowRight className="w-5 h-5" /></>}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-cyan-400">
                <ShieldCheck className="w-8 h-8" />
                <h2 className="text-2xl font-bold text-white">Motor Dual-Rail & Não Custodial</h2>
              </div>
              <p className="text-slate-400 max-w-2xl">
                O pagamento PIX foi detectado via Webhook seguro. O NexaPay atua estritamente como roteador, sem reter fundos, garantindo liquidez atômica on-chain.
              </p>
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                <div className="flex justify-between text-sm py-2 border-b border-slate-800">
                  <span className="text-slate-400">ID da Ordem:</span>
                  <span className="font-mono text-emerald-400">{orderId}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-slate-800">
                  <span className="text-slate-400">Modelo de Custódia:</span>
                  <span className="text-cyan-400 font-semibold">100% Descentralizado (Smart Contract / Worker)</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="text-slate-400">Rede de Destino:</span>
                  <span className="text-white">Solana Mainnet/Devnet Settlement</span>
                </div>
                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleExecuteSettlement}
                    disabled={loading}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <>Processar Liquidação On-Chain <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Compra Finalizada com Sucesso!</h2>
                <p className="text-slate-400 mt-1">O lojista recebeu os fundos instantaneamente na carteira dele on-chain.</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-w-md mx-auto text-left space-y-2">
                <div className="text-xs text-slate-500 uppercase">Recibo da Transação</div>
                <div className="text-sm font-mono text-emerald-400 truncate">Hash: {txHash}</div>
                <div className="text-xs text-slate-400">Status: <span className="text-emerald-400 font-bold">SETTLED</span></div>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={resetDemo}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Reiniciar Demonstração para a Banca
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
