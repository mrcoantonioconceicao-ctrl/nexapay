import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { MerchantPOS } from "./components/MerchantPOS";
import { AgenticAllowanceWorkspace } from "./components/AgenticAllowanceWorkspace";
import { CpiLiquidityRouter } from "./components/CpiLiquidityRouter";
import { AnchorCodeInspector } from "./components/AnchorCodeInspector";
import { TransactionExplorer } from "./components/TransactionExplorer";
import { CheckoutEmbedConfigurator } from "./components/CheckoutEmbedConfigurator";
import { DocumentationTab } from "./components/DocumentationTab";
import { ArchitecturalSpecModal } from "./components/ArchitecturalSpecModal";
import { 
  FXRates, 
  MerchantAccount, 
  AgentSessionAllowance, 
  NexaTransaction 
} from "./types";
import { deriveAgentSessionPDA, NEXA_PROGRAM_ID, MINTS, toValidPublicKey } from "./lib/solana/nexaAnchorProgram";
import { Keypair, PublicKey } from "@solana/web3.js";

// Deterministic valid Base58 public keys for simulation
const INITIAL_BUYER_PUBKEY = toValidPublicKey("buyer_solana_devnet_wallet").toBase58();
const INITIAL_MERCHANT_1_PUBKEY = toValidPublicKey("merchant_devstore_brasil").toBase58();
const INITIAL_MERCHANT_2_PUBKEY = toValidPublicKey("merchant_cloudcompute_ai").toBase58();
const INITIAL_AGENT_PUBKEY = toValidPublicKey("autonomous_ai_agent_identity").toBase58();

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("pos");
  const [specModalOpen, setSpecModalOpen] = useState<boolean>(false);

  // Buyer Wallet Keypair State (Devnet Simulation)
  const [buyerWalletPubkey, setBuyerWalletPubkey] = useState<string>(INITIAL_BUYER_PUBKEY);

  const handleRotateWallet = () => {
    const randomKey = Keypair.generate().publicKey.toBase58();
    setBuyerWalletPubkey(randomKey);
  };

  // FX Rates State
  const [fxRates, setFxRates] = useState<FXRates>({
    USDC_BRL: 5.465,
    SOL_BRL: 745.20,
    SOL_USD: 136.35,
    EURC_BRL: 5.92,
    updatedAt: new Date().toISOString(),
    provider: "Nexa Liquidity Aggregator Engine",
  });

  useEffect(() => {
    async function fetchFx() {
      try {
        const res = await fetch("/api/fx-rates");
        if (res.ok) {
          const data = await res.json();
          if (data.rates) {
            setFxRates(data);
          }
        }
      } catch {
        // Fallback to initial default rates
      }
    }
    fetchFx();
  }, []);

  // Merchants Data State
  const [merchants] = useState<MerchantAccount[]>([
    {
      id: "mch_devstore",
      name: "DevStore Brasil Ltda",
      pixKey: "nexa.merchant@devstore.br",
      solanaWallet: INITIAL_MERCHANT_1_PUBKEY,
      usdcTokenAccount: `ATA${INITIAL_MERCHANT_1_PUBKEY.slice(0, 32)}`,
      category: "E-Commerce & Digital Goods",
      totalVolumeUsd: 148500.0,
      totalSettlements: 1240,
      autoPixOfframp: true,
    },
    {
      id: "mch_cloudai",
      name: "CloudCompute AI Services",
      pixKey: "api.billing@cloudcompute.com.br",
      solanaWallet: INITIAL_MERCHANT_2_PUBKEY,
      usdcTokenAccount: `ATA${INITIAL_MERCHANT_2_PUBKEY.slice(0, 32)}`,
      category: "AI API Infrastructure",
      totalVolumeUsd: 89200.0,
      totalSettlements: 890,
      autoPixOfframp: false,
    },
  ]);

  // Initial Agent Session Allowances PDAs
  const [allowances, setAllowances] = useState<AgentSessionAllowance[]>(() => {
    const buyerKey = toValidPublicKey(INITIAL_BUYER_PUBKEY);
    const agentKey = toValidPublicKey(INITIAL_AGENT_PUBKEY);
    const merchKey = toValidPublicKey(INITIAL_MERCHANT_1_PUBKEY);
    const { pda, bump } = deriveAgentSessionPDA(buyerKey, agentKey, merchKey);

    return [
      {
        pdaPublicKey: pda.toBase58(),
        bump,
        buyerPublicKey: buyerKey.toBase58(),
        agentPublicKey: agentKey.toBase58(),
        merchantPublicKey: merchKey.toBase58(),
        allowedTokenMint: MINTS.USDC.toBase58(),
        maxSpendPerTx: 20.0,
        dailyLimitUsd: 200.0,
        spentTodayUsd: 35.5,
        remainingDailyUsd: 164.5,
        expiryTimestamp: Math.floor(Date.now() / 1000) + 86400 * 7,
        createdAt: new Date().toLocaleTimeString(),
        revoked: false,
        totalTransactionsCount: 3,
        allowanceScope: ["API Micro-payments", "Compute Cycles"],
      },
    ];
  });

  // Transaction Explorer History
  const [transactions, setTransactions] = useState<NexaTransaction[]>([
    {
      signature: "5Kx9v2W8L1mP94kJ82mP11111111111111111111111111111111111111111111111111111111111111111111",
      slot: 312849100,
      blockTime: "13:35:10",
      confirmationStatus: "finalized",
      finalityMs: 405,
      type: "DIRECT_MERCHANT_TRANSFER",
      buyerPubkey: INITIAL_BUYER_PUBKEY,
      merchantPubkey: INITIAL_MERCHANT_1_PUBKEY,
      amount: 25.0,
      tokenSymbol: "USDC",
      fiatEquivalentBrl: 136.63,
      cpiInnerInstructionsCount: 1,
      isZeroCustodyConfirmed: true,
      logs: [
        `Program ${NEXA_PROGRAM_ID.toBase58().slice(0, 16)}... invoke [1]`,
        "Program log: Instruction: ProcessDirectPayment",
        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
        "Program log: ZERO-CUSTODY verified: Program vault balance remained 0",
        `Program ${NEXA_PROGRAM_ID.toBase58().slice(0, 16)}... success`,
      ],
    },
    {
      signature: "3Jz7w4R2M9nQ85pK111111111111111111111111111111111111111111111111111111111111111111111111",
      slot: 312849042,
      blockTime: "13:30:22",
      confirmationStatus: "finalized",
      finalityMs: 420,
      type: "AGENTIC_PDA_PAYMENT",
      buyerPubkey: INITIAL_BUYER_PUBKEY,
      merchantPubkey: INITIAL_MERCHANT_1_PUBKEY,
      amount: 12.5,
      tokenSymbol: "USDC",
      fiatEquivalentBrl: 68.31,
      cpiInnerInstructionsCount: 2,
      isZeroCustodyConfirmed: true,
      logs: [
        `Program ${NEXA_PROGRAM_ID.toBase58().slice(0, 16)}... invoke [1]`,
        "Program log: Instruction: ExecuteAgenticPayment",
        "Program log: PDA Signer verified bump 254",
        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
        `Program ${NEXA_PROGRAM_ID.toBase58().slice(0, 16)}... success`,
      ],
    },
  ]);

  const handleGrantAllowance = (newAllowance: AgentSessionAllowance) => {
    setAllowances([newAllowance, ...allowances]);
  };

  const handleRevokeAllowance = (pdaPubkey: string) => {
    setAllowances((prev) =>
      prev.map((a) => (a.pdaPublicKey === pdaPubkey ? { ...a, revoked: true } : a))
    );
  };

  const handleExecuteAgentPayment = (pdaPubkey: string, amountUsd: number) => {
    setAllowances((prev) =>
      prev.map((a) => {
        if (a.pdaPublicKey === pdaPubkey) {
          const newSpent = a.spentTodayUsd + amountUsd;
          return {
            ...a,
            spentTodayUsd: newSpent,
            remainingDailyUsd: Math.max(0, a.dailyLimitUsd - newSpent),
            totalTransactionsCount: a.totalTransactionsCount + 1,
          };
        }
        return a;
      })
    );

    // Add receipt to explorer feed
    const target = allowances.find((a) => a.pdaPublicKey === pdaPubkey);
    const newTx: NexaTransaction = {
      signature: `SIG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      slot: 312849150 + Math.floor(Math.random() * 50),
      blockTime: new Date().toLocaleTimeString(),
      confirmationStatus: "finalized",
      finalityMs: 410,
      type: "AGENTIC_PDA_PAYMENT",
      buyerPubkey: target?.buyerPublicKey || buyerWalletPubkey,
      merchantPubkey: target?.merchantPublicKey || merchants[0].solanaWallet,
      amount: amountUsd,
      tokenSymbol: "USDC",
      fiatEquivalentBrl: amountUsd * fxRates.USDC_BRL,
      cpiInnerInstructionsCount: 2,
      isZeroCustodyConfirmed: true,
      logs: [
        "Program NexaP1ayX1111111111111111111111111111111111 invoke [1]",
        "Program log: Instruction: ExecuteAgenticPayment",
        "Program log: Agentic PDA Allowance verified",
        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
        "Program NexaP1ayX1111111111111111111111111111111111 success",
      ],
    };
    setTransactions([newTx, ...transactions]);
  };

  const handlePaymentSettled = (newTx: NexaTransaction) => {
    setTransactions([newTx, ...transactions]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        buyerWalletPubkey={buyerWalletPubkey}
        onRotateWallet={handleRotateWallet}
        fxRates={fxRates}
        openSpecModal={() => setSpecModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === "pos" && (
          <MerchantPOS
            merchant={merchants[0]}
            buyerPubkey={buyerWalletPubkey}
            fxRates={fxRates}
            onPaymentSettled={handlePaymentSettled}
          />
        )}

        {activeTab === "agentic" && (
          <AgenticAllowanceWorkspace
            buyerPubkey={buyerWalletPubkey}
            merchants={merchants}
            allowances={allowances}
            onGrantAllowance={handleGrantAllowance}
            onRevokeAllowance={handleRevokeAllowance}
            onExecuteAgentPayment={handleExecuteAgentPayment}
          />
        )}

        {activeTab === "cpi" && <CpiLiquidityRouter fxRates={fxRates} />}

        {activeTab === "anchor" && <AnchorCodeInspector />}

        {activeTab === "explorer" && <TransactionExplorer transactions={transactions} />}

        {activeTab === "widget" && (
          <CheckoutEmbedConfigurator merchant={merchants[0]} buyerPubkey={buyerWalletPubkey} />
        )}

        {activeTab === "docs" && <DocumentationTab />}
      </main>

      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            Nexa Pay • Solana &amp; Hybrid PIX Non-Custodial Infrastructure
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Program: NexaP1ay...1111</span>
            <span>•</span>
            <span>Anchor 0.30.1</span>
            <span>•</span>
            <button
              onClick={() => setSpecModalOpen(true)}
              className="text-cyan-400 hover:underline"
            >
              Zero-Custody Proof
            </button>
          </div>
        </div>
      </footer>

      <ArchitecturalSpecModal isOpen={specModalOpen} onClose={() => setSpecModalOpen(false)} />
    </div>
  );
}
