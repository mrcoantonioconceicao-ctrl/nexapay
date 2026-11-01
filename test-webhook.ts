import { createHmac } from 'crypto';

const WEBHOOK_SECRET = 'nexa_sec_live_development_secret_key';
const ORDER_ID = 'ord_1793557031821_80803f89'; // Substitua pelo orderId gerado no seu último checkout se preferir

async function testWebhook() {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    orderId: ORDER_ID,
    txId: `pix_tx_${Date.now()}`,
    amountBrl: 150.00,
    paidAt: new Date().toISOString()
  });

  // Monta a string assinada conforme o padrão HMAC
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  const signatureHeader = `t=${timestamp},v1=${signature}`;

  console.log('📡 Disparando Webhook Pix para o servidor local...');
  console.log(`Payload: ${payload}`);
  console.log(`Header X-Signature: ${signatureHeader}\n`);

  const response = await fetch('http://localhost:3001/api/v1/webhook/pix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signatureHeader
    },
    body: payload
  });

  const result = await response.json();
  console.log('📥 Resposta do Servidor:', JSON.stringify(result, null, 2));
}

testWebhook();
