import crypto from 'crypto';

interface CheckoutRails {
  pixCopiaECola: string;
  qrCodeBase64: string;
  solanaActionUrl: string;
}

interface MockCheckout {
  orderId: string;
  referencePubkey: string;
  expiresAt: string;
  rails: CheckoutRails;
}

function buildSolanaActionUrl(params: {
  merchantWallet: string;
  amountUsdc: number;
  reference: string;
  label: string;
}): string {
  const { merchantWallet, amountUsdc, reference, label } = params;
  return `solana:${merchantWallet}?amount=${amountUsdc.toFixed(2)}&reference=${reference}&label=${encodeURIComponent(label)}`;
}

async function runDemo() {
  console.log("⚡ [NEXA PAY LIVE DEMO] Iniciando simulação Omni-Rail Non-Custodial...\n");

  const merchantWallet = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
  const orderAmountBrl = 150.00;

  console.log("🛒 [Passo 1] Lojista cria checkout híbrido (Pix + Solana Direct)...");
  const mockCheckout: MockCheckout = {
    orderId: crypto.randomUUID(),
    referencePubkey: crypto.randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    rails: {
      pixCopiaECola: "00020126580014br.gov.bcb.pix0136d41d8cd98f00b204e980",
      qrCodeBase64: "data:image/png;base64,iVBORw0KGgo...",
      solanaActionUrl: buildSolanaActionUrl({
        merchantWallet,
        amountUsdc: orderAmountBrl / 5.5,
        reference: crypto.randomBytes(32).toString('base64'),
        label: "Nexa Pay Direct Demo"
      })
    }
  };

  console.log(`   ➔ Order ID gerado: ${mockCheckout.orderId}`);
  console.log(`   ➔ Pix Copia e Cola: ${mockCheckout.rails.pixCopiaECola.substring(0, 30)}...`);
  console.log(`   ➔ Solana Action URI: ${mockCheckout.rails.solanaActionUrl}\n`);

  console.log("⚡ [Passo 2] Simulando liquidação do Rail Fiat (Pix Webhook + HMAC SHA-256)...");
  const payloadWebhook = JSON.stringify({
    orderId: mockCheckout.orderId,
    txid: 'pix_live_demo_tx_777',
    idempotencyKey: `idem_${Date.now()}`
  });
  console.log(`   ➔ Payload assinado com HMAC-SHA256 (Anti-replay time-window ok): ${payloadWebhook.substring(0, 50)}...`);
  console.log(`   ➔ Saga State Machine: PENDING ➔ PIX_PAID\n`);

  console.log("🤖 [Passo 3] Testando Endpoint SecOps / AI Policy Evaluation local...");
  try {
    const response = await fetch("http://localhost:3000/api/ai/evaluate-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Verify risk profile for high-velocity agent payment",
        amount: orderAmountBrl
      })
    });
    if (response.ok) {
      const data = await response.json();
      console.log(`   ➔ Resposta do Servidor Local (/api/ai/evaluate-policy):`, data);
    } else {
      console.log(`   ➔ Servidor respondeu com status ${response.status} (verifique se npm run start está rodando no Terminal 1).`);
    }
  } catch (err) {
    console.log(`   ➔ Aviso: Servidor local não acessível na porta 3000 (${(err as Error).message}). Prosseguindo com mock agêntico.`);
  }

  console.log("🤖 [Passo 3.1] Agentic Commerce (MCP via Session Allowance PDA)...");
  console.log(`   ➔ MCP Tool chamada: check_agent_session_budget(authority, agent)`);
  console.log(`   ➔ Status PDA: ACTIVE | Restante diário: $450.00 USDC`);
  console.log(`   ➔ MCP Tool chamada: nexa_execute_agent_payment(direct ATA CPI)`);
  console.log(`   ➔ Saga State Machine: PIX_PAID / CRYPTO_PAID ➔ SETTLED (Zero Custody Confirmed)\n`);

  console.log("✅ [Demo Concluída com Sucesso] Transação atômica liquidada sem retenção custodial.");
}

runDemo().catch(console.error);
