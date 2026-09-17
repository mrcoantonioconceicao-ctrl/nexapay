import React, { useState, useEffect } from "react";
import { 
  QrCode, 
  Copy, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  CreditCard, 
  ExternalLink,
  Zap,
  Sparkles,
  DollarSign
} from "lucide-react";
import { FXRates, MerchantAccount, PaymentMethod, NexaTransaction } from "../types";
import { generatePixEmvPayload, generateQrDataUrl } from "../lib/pix/emvQrGenerator";
import { buildDirectMerchantPaymentTx, generateMockSignature, toValidPublicKey } from "../lib/solana/nexaAnchorProgram";
import { PublicKey } from "@solana/web3.js";

interface MerchantPOSProps {
  merchant: MerchantAccount;
  buyerPubkey: string;
  fxRates: FXRates;
  onPaymentSettled: (tx: NexaTransaction) => void;
}

export const MerchantPOS: React.FC<MerchantPOSProps> = ({
  merchant,
  buyerPubkey,
  fxRates,
  onPaymentSettled,
}) => {
  const [amountUsd, setAmountUsd] = useState<number>(25.0);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("USDC");
  const [pixPayload, setPixPayload] = useState<string>("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recentReceipt, setRecentReceipt] = useState<NexaTransaction | null>(null);

  // Calculate Conversions with null/undefined safety
  const safeUsd = typeof amountUsd === "number" && !isNaN(amountUsd) ? amountUsd : 0;
  const usdcRate = fxRates?.USDC_BRL ?? 5.465;
  const solRate = fxRates?.SOL_USD ?? 136.35;
  const amountBrl = safeUsd * usdcRate;
  const amountSol = solRate > 0 ? safeUsd / solRate : 0;

  // Generate QR & URI whenever parameters change
  useEffect(() => {
    async function updateQr() {
      if (selectedMethod === "PIX_BRL") {
        const res = generatePixEmvPayload({
          pixKey: merchant.pixKey,
          merchantName: merchant.name,
          txAmount: amountBrl,
          txId: `NEXA-${Date.now().toString().slice(-6)}`,
          description: "Order #84920 - Nexa Pay POS",
        });
        setPixPayload(res.payload);
        const dataUrl = await generateQrDataUrl(res.payload);
        setQrCodeDataUrl(dataUrl);
      } else {
        // Solana Pay URI format: solana:<merchant_pubkey>?amount=<amount>&spl-token=<mint_pubkey>&label=<merchant_name>
        const formattedAmount = selectedMethod === "SOL" ? amountSol.toFixed(4) : safeUsd.toFixed(2);
        const solanaPayUri = `solana:${merchant.solanaWallet}?amount=${formattedAmount}&spl-token=${selectedMethod}&label=${encodeURIComponent(merchant.name)}`;
        setPixPayload(solanaPayUri);
        const dataUrl = await generateQrDataUrl(solanaPayUri);
        setQrCodeDataUrl(dataUrl);
      }
    }
    updateQr();
  }, [selectedMethod, amountUsd, amountBrl, amountSol, merchant, safeUsd]);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setRecentReceipt(null);

    // Simulate network delay for sub-second finality (~420ms)
    await new Promise((resolve) => setTimeout(resolve, 450));

    const buyerKey = toValidPublicKey(buyerPubkey, "buyer");
    const merchantKey = toValidPublicKey(merchant.solanaWallet, "merchant");

    const tokenAmount = selectedMethod === "SOL" ? amountSol : safeUsd;
    const { signature, slot } = buildDirectMerchantPaymentTx(buyerKey, merchantKey, tokenAmount, selectedMethod);

    const txReceipt: NexaTransaction = {
      signature,
      slot,
      blockTime: new Date().toLocaleTimeString(),
      confirmationStatus: "finalized",
      finalityMs: 412,
      type: selectedMethod === "PIX_BRL" ? "CPI_PIX_OFFRAMP" : "DIRECT_MERCHANT_TRANSFER",
      buyerPubkey,
      merchantPubkey: merchant.solanaWallet,
      amount: tokenAmount,
      tokenSymbol: selectedMethod,
      fiatEquivalentBrl: amountBrl,
      cpiInnerInstructionsCount: selectedMethod === "PIX_BRL" ? 3 : 1,
      isZeroCustodyConfirmed: true,
      logs: [
        `Program NexaP1ayX1111111111111111111111111111111111 invoke [1]`,
        `Program log: Instruction: ProcessDirectPayment`,
        `Program log: Transferring ${(tokenAmount ?? 0).toFixed(4)} ${selectedMethod} directly to merchant ATA`,
        `Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]`,
        `Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success`,
        `Program log: ZERO-CUSTODY verified: Program vault balance remained 0`,
        `Program NexaP1ayX1111111111111111111111111111111111 success`,
      ],
    };

    setIsProcessing(false);
    setRecentReceipt(txReceipt);
    onPaymentSettled(txReceipt);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Merchant Context */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xl">
            {merchant.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{merchant.name}</h2>
              <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Gateway Active
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-3 mt-1 font-mono">
              <span>PIX Key: {merchant.pixKey}</span>
              <span>•</span>
              <span>
                Solana: {merchant.solanaWallet.slice(0, 6)}...{merchant.solanaWallet.slice(-4)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-right font-mono">
          <div>
            <div className="text-[10px] uppercase text-slate-500 font-semibold">Volume Settled</div>
            <div className="text-lg font-bold text-slate-100">${merchant.totalVolumeUsd.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500 font-semibold">Direct Receipts</div>
            <div className="text-lg font-bold text-cyan-400">{merchant.totalSettlements} txs</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: POS Terminal Input */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              Dynamic Invoice Terminal
            </h3>
            <span className="text-xs text-slate-400 font-mono">Zero Escrow</span>
          </div>

          {/* Amount Inputs */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Payment Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">$</span>
              <input
                type="number"
                min="0.10"
                step="0.50"
                value={amountUsd}
                onChange={(e) => setAmountUsd(Math.max(0.01, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-4 py-3 text-2xl font-bold text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Currency Conversions Preview */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-center font-mono text-xs">
            <div>
              <div className="text-[10px] text-slate-500">USDC</div>
              <div className="font-semibold text-slate-200">${amountUsd.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">PIX (BRL)</div>
              <div className="font-semibold text-emerald-400">R$ {amountBrl.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">SOL</div>
              <div className="font-semibold text-purple-400">{amountSol.toFixed(4)}</div>
            </div>
          </div>

          {/* Payment Token / Rail Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Select Settlement Rail
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod("USDC")}
                className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
                  selectedMethod === "USDC"
                    ? "bg-cyan-950/40 border-cyan-500 text-cyan-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-white">USDC</div>
                  <div className="text-[10px] text-slate-400">Solana SPL Token</div>
                </div>
                <div className="h-3 w-3 rounded-full bg-cyan-400"></div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod("SOL")}
                className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
                  selectedMethod === "SOL"
                    ? "bg-purple-950/40 border-purple-500 text-purple-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-white">SOL</div>
                  <div className="text-[10px] text-slate-400">Native Solana</div>
                </div>
                <div className="h-3 w-3 rounded-full bg-purple-400"></div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod("PIX_BRL")}
                className={`col-span-2 p-3 rounded-lg border text-left transition flex items-center justify-between ${
                  selectedMethod === "PIX_BRL"
                    ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    PIX Instant QR (BRL)
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                      BACEN Standard
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">Instant Off-Ramp via Orca CPI Pool</div>
                </div>
                <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
              </button>
            </div>
          </div>

          {/* Quick Preset Amount Buttons */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Quick Preset
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 100].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmountUsd(preset)}
                  className="py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-xs font-mono font-semibold text-slate-300 transition"
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live QR Code & Settlement Gateway */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                {selectedMethod === "PIX_BRL" ? "BACEN PIX Copia e Cola" : "Solana Pay QR Code"}
              </h3>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-mono flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Awaiting Sub-Second Finality
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* QR Code Canvas Frame */}
              <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center shadow-2xl border border-slate-700">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="Payment QR Code" className="w-48 h-48 object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                    Generating QR...
                  </div>
                )}
                <div className="mt-2 text-[10px] text-slate-700 font-mono text-center">
                  {selectedMethod === "PIX_BRL" ? "Scan with Nubank, Itaú, Inter, etc." : "Scan with Phantom / Solflare"}
                </div>
              </div>

              {/* Payment Details Breakdown */}
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Payable Amount:</span>
                    <span className="font-bold text-white font-mono">
                      {selectedMethod === "PIX_BRL"
                        ? `R$ ${amountBrl.toFixed(2)}`
                        : selectedMethod === "SOL"
                        ? `${amountSol.toFixed(4)} SOL`
                        : `$${amountUsd.toFixed(2)} USDC`}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Target Merchant:</span>
                    <span className="font-mono text-slate-200">{merchant.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Custody Architecture:</span>
                    <span className="text-emerald-400 font-semibold font-mono">DIRECT TO MERCHANT</span>
                  </div>
                </div>

                {/* Copia e Cola / URI string */}
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">
                    {selectedMethod === "PIX_BRL" ? "PIX String (EMV Code)" : "Solana Pay URI"}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixPayload}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-400 truncate focus:outline-none"
                    />
                    <button
                      onClick={handleCopyPayload}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 rounded font-medium transition flex items-center gap-1 shrink-0"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Simulate Payment Action Button */}
                <button
                  disabled={isProcessing}
                  onClick={handleSimulatePayment}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Executing Sub-Second Transfer...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Simulate Instant Payment ({selectedMethod})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sub-second Finality Confirmation Banner */}
          {recentReceipt && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">Payment Finalized</h4>
                      <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                        {recentReceipt.finalityMs}ms Finality
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 font-mono">
                      Signature: {recentReceipt.signature.slice(0, 16)}...{recentReceipt.signature.slice(-16)}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <div className="text-slate-400">Slot #{recentReceipt.slot}</div>
                  <div className="text-emerald-400 font-bold">ZERO-CUSTODY VERIFIED</div>
                </div>
              </div>

              {/* Logs Drawer */}
              <div className="mt-3 bg-slate-950 p-3 rounded border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                {recentReceipt.logs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-slate-600">&gt;</span>
                    <span className={log.includes("ZERO-CUSTODY") ? "text-emerald-400 font-bold" : "text-slate-300"}>
                      {log}
                    </span>
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
