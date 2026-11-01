/**
 * NexaPay Integration Test Script - Porta 3001
 */

import { WebhookHmacVerifier } from './src/lib/security/webhookHmac';

const BASE_URL = 'http://localhost:3001/api/v1';
const WEBHOOK_SECRET = 'nexa_sec_live_development_secret_key';

async function runTests() {
  console.log('🧪 [NexaPay Tests] Iniciando testes de integração na porta 3001...\n');

  try {
    console.log('1️⃣ Testando POST /api/v1/checkout...');
    const checkoutRes = await fetch(`${BASE_URL}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'mch_enterprise_99',
        merchantName: 'NexaLoja Teste',
        merchantCity: 'Blumenau',
        pixKey: 'suporte@nexapay.io',
        amountBrl: 150.00,
        amountUsdcExpected: 27.50,
        merchantWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
      })
    });

    const responseText = await checkoutRes.text();
    let checkoutData;
    try {
      checkoutData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Resposta não é JSON: ${responseText}`);
    }

    if (!checkoutRes.ok || !checkoutData.success) {
      throw new Error(`Falha no checkout: ${JSON.stringify(checkoutData)}`);
    }

    console.log('   ✅ Checkout criado com sucesso!');
    console.log(`      - Order ID: ${checkoutData.orderId}`);
    console.log(`      - Pix Copia e Cola: ${checkoutData.rails.pixCopiaECola.substring(0, 30)}...`);
    console.log(`      - Solana Pay URL: ${checkoutData.rails.solanaPayUrl}\n`);

    const orderId = checkoutData.orderId;

    console.log('2️⃣ Testando POST /api/v1/webhook/pix com assinatura HMAC...');
    const payloadBody = JSON.stringify({ orderId });
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payloadBody}`;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload));
    const signatureHex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const hmacHeader = `t=${timestamp},v1=${signatureHex}`;

    const webhookRes = await fetch(`${BASE_URL}/webhook/pix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexa-Signature': hmacHeader
      },
      body: payloadBody
    });

    const webhookData = await webhookRes.json() as any;
    if (!webhookRes.ok || !webhookData.success) {
      throw new Error(`Falha no webhook Pix: ${JSON.stringify(webhookData)}`);
    }

    console.log('   ✅ Webhook Pix validado e processado com sucesso!');
    console.log(`      - Novo Status: ${webhookData.order.status}`);
    console.log(`      - Rail Utilizado: ${webhookData.order.railUsed}\n`);

    console.log('3️⃣ Testando consulta GET /api/v1/order/' + orderId);
    const statusRes = await fetch(`${BASE_URL}/order/${orderId}`);
    const statusData = await statusRes.json() as any;

    if (!statusRes.ok || !statusData.success) {
      throw new Error(`Falha ao consultar status: ${JSON.stringify(statusData)}`);
    }

    console.log('   ✅ Status consultado com sucesso!');
    console.log(`      - Estado Final: ${statusData.order.status}\n`);
    console.log('🎉 Todos os testes passaram com sucesso na porta 3001!');

  } catch (error: any) {
    console.error('❌ [NexaPay Tests] Erro:', error.message);
  }
}

runTests();
