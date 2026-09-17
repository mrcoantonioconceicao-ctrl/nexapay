import React, { useState } from "react";
import { 
  Layers, 
  Copy, 
  Check, 
  Eye, 
  Zap, 
  X, 
  CreditCard, 
  QrCode, 
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { MerchantAccount, WidgetConfig, PaymentMethod } from "../types";
import { generatePixEmvPayload, generateQrDataUrl } from "../lib/pix/emvQrGenerator";

interface CheckoutEmbedConfiguratorProps {
  merchant: MerchantAccount;
  buyerPubkey: string;
}

export const CheckoutEmbedConfigurator: React.FC<CheckoutEmbedConfiguratorProps> = ({ merchant, buyerPubkey }) => {
  const [config, setConfig] = useState<WidgetConfig>({
    merchantName: merchant.name,
    merchantWallet: merchant.solanaWallet,
    pixKey: merchant.pixKey,
    themeColor: "#06B6D4", // Cyan
    accentColor: "#10B981", // Emerald
    darkMode: true,
    enabledMethods: ["USDC", "SOL", "PIX_BRL"],
    allowAgenticMode: true,
    collectShipping: false,
    buttonText: "Pay with Nexa Pay",
  });

  const [copiedReact, setCopiedReact] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [showModalPreview, setShowModalPreview] = useState(false);

  // Widget Modal Test state
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("USDC");
  const [modalStep, setModalStep] = useState<"SELECT" | "PAY" | "SUCCESS">("SELECT");

  const reactCodeSnippet = `import { NexaPayCheckout } from "@nexa-pay/react";

export function CheckoutButton() {
  return (
    <NexaPayCheckout
      merchantWallet="${config.merchantWallet}"
      pixKey="${config.pixKey}"
      amountUsd={25.00}
      acceptedTokens={${JSON.stringify(config.enabledMethods)}}
      allowAgenticSession={${config.allowAgenticMode}}
      onSuccess={(receipt) => {
        console.log("Settled signature:", receipt.signature);
      }}
      buttonText="${config.buttonText}"
      darkMode={${config.darkMode}}
    />
  );
}`;

  const htmlCodeSnippet = `<!-- Nexa Pay Inline Embed Widget -->
<div 
  id="nexa-pay-checkout" 
  data-merchant="${config.merchantWallet}"
  data-pix-key="${config.pixKey}"
  data-amount="25.00"
  data-theme="${config.darkMode ? "dark" : "light"}"
></div>
<script src="https://cdn.nexapay.io/v1/checkout.js" async></script>`;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-cyan-400" />
              Embeddable Checkout Widget Builder
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              SDK & Embed Configurator
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Configure custom checkout buttons and embeddable modals for e-commerce stores, SaaS apps, or AI agent API platforms. Supports direct Solana token transfers and instant PIX QR off-ramping.
          </p>
        </div>

        <button
          onClick={() => {
            setModalStep("SELECT");
            setShowModalPreview(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Test Interactive Checkout Modal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Config Panel */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h3 className="text-base font-semibold text-white border-b border-slate-800 pb-3">
            Widget Customization
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Button Text
            </label>
            <input
              type="text"
              value={config.buttonText}
              onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Accepted Payment Rails
            </label>
            <div className="space-y-2">
              {[
                { id: "USDC", label: "USDC (Solana SPL)" },
                { id: "SOL", label: "SOL (Native Solana)" },
                { id: "PIX_BRL", label: "PIX Instant QR (BRL)" },
              ].map((item) => {
                const isChecked = config.enabledMethods.includes(item.id as PaymentMethod);
                return (
                  <label key={item.id} className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...config.enabledMethods, item.id as PaymentMethod]
                          : config.enabledMethods.filter((m) => m !== item.id);
                        setConfig({ ...config, enabledMethods: updated });
                      }}
                      className="rounded accent-cyan-500 bg-slate-950 border-slate-800"
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Features Toggles */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Allow Agentic PDA Session Allowance</span>
              <input
                type="checkbox"
                checked={config.allowAgenticMode}
                onChange={(e) => setConfig({ ...config, allowAgenticMode: e.target.checked })}
                className="rounded accent-cyan-500 bg-slate-950 border-slate-800"
              />
            </label>
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Dark Mode Styling</span>
              <input
                type="checkbox"
                checked={config.darkMode}
                onChange={(e) => setConfig({ ...config, darkMode: e.target.checked })}
                className="rounded accent-cyan-500 bg-slate-950 border-slate-800"
              />
            </label>
          </div>
        </div>

        {/* Right Column: Snippets Exporter */}
        <div className="lg:col-span-7 space-y-6">
          {/* React Snippet */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                React Component Snippet (`@nexa-pay/react`)
              </h4>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(reactCodeSnippet);
                  setCopiedReact(true);
                  setTimeout(() => setCopiedReact(false), 2000);
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 rounded font-medium transition flex items-center gap-1"
              >
                {copiedReact ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedReact ? "Copied" : "Copy"}
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto">
              {reactCodeSnippet}
            </pre>
          </div>

          {/* HTML Embed Snippet */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white font-mono">HTML Embed Script Tag</h4>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(htmlCodeSnippet);
                  setCopiedHtml(true);
                  setTimeout(() => setCopiedHtml(false), 2000);
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 rounded font-medium transition flex items-center gap-1"
              >
                {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedHtml ? "Copied" : "Copy"}
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-purple-300 overflow-x-auto">
              {htmlCodeSnippet}
            </pre>
          </div>
        </div>
      </div>

      {/* Interactive Modal Preview */}
      {showModalPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowModalPreview(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/20">
                N
              </div>
              <div>
                <h3 className="font-bold text-white text-base">{config.merchantName}</h3>
                <p className="text-xs text-slate-400 font-mono">Total: $25.00 USD</p>
              </div>
            </div>

            {modalStep === "SELECT" && (
              <div className="space-y-4">
                <label className="block text-xs uppercase text-slate-400 font-semibold">
                  Choose Payment Method
                </label>
                <div className="space-y-2">
                  {config.enabledMethods.map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMethod(m)}
                      className={`w-full p-3 rounded-lg border text-left font-mono text-xs flex items-center justify-between transition ${
                        selectedMethod === m
                          ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span>{m === "PIX_BRL" ? "PIX Instant QR (R$ 136.63 BRL)" : m}</span>
                      <div className={`h-2.5 w-2.5 rounded-full ${selectedMethod === m ? "bg-cyan-400" : "bg-slate-700"}`}></div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setModalStep("PAY")}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-lg transition"
                >
                  Proceed to Pay ($25.00)
                </button>
              </div>
            )}

            {modalStep === "PAY" && (
              <div className="space-y-4 text-center">
                <div className="bg-white p-3 rounded-xl inline-block">
                  <QrCode className="w-40 h-40 text-slate-950 mx-auto" />
                </div>
                <p className="text-xs font-mono text-slate-300">
                  Scan QR code with your Solana wallet or PIX banking app
                </p>
                <button
                  onClick={() => setModalStep("SUCCESS")}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  Simulate Webhook Settlement Event
                </button>
              </div>
            )}

            {modalStep === "SUCCESS" && (
              <div className="space-y-4 text-center py-4">
                <div className="h-16 w-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Payment Confirmed!</h4>
                  <p className="text-xs text-slate-400 font-mono mt-1">Sub-second finality verified on Solana</p>
                </div>
                <button
                  onClick={() => setShowModalPreview(false)}
                  className="px-6 py-2 bg-slate-800 text-slate-200 text-xs rounded-lg font-bold hover:bg-slate-700"
                >
                  Close Modal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
