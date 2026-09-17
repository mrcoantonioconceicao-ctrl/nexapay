export interface PixChargeRequest {
  merchantDoc: string; // CNPJ / CPF
  amountBrl: number;
  orderId: string;
  pixKey: string;
}

export interface PixChargeResponse {
  txid: string;
  pixCopiaECola: string;
  qrCodeBase64: string;
}

export class PixAdapter {
  constructor(private pspApiUrl: string, private pspApiKey: string) {}

  async generateDynamicPix(req: PixChargeRequest): Promise<PixChargeResponse> {
    // Generate deterministic sha256 txid compatible with Web Crypto and Node
    const text = `${req.orderId}-${Date.now()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const txid = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 35);
    
    // Simulação de chamada corporativa ao PSP/BaaS regulado (Direto para PJ do lojista)
    // Em produção, faz POST para endpoint SPI do PSP com MTLS / Bearer Token
    const payload = {
      txid,
      calendar: { exp: 3600 },
      value: { original: req.amountBrl.toFixed(2) },
      chave: req.pixKey,
      infoAdicional: [
        { nome: 'NexaPayOrderId', valor: req.orderId }
      ]
    };

    // Mock de retorno padronizado de SPI/PSP
    return {
      txid,
      pixCopiaECola: `00020126580014br.gov.bcb.pix0136${txid}5204000053039865802BR5913NexaPayPJ6009Blumenau62070503***63041A1B`,
      qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAPAAA...' // Base64 mock
    };
  }
}
