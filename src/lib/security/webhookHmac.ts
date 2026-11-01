/**
 * NexaPay Security - HMAC SHA-256 Webhook Verifier
 * Garante autenticidade das requisições de webhook do PSP (PIX) e previne ataques de Replay.
 */

export interface WebhookValidationOptions {
  signatureHeader: string | null; // Ex: "t=1729760000,v1=abc123hash..."
  rawBody: string;                 // Corpo bruto da requisição (string)
  secret: string;                  // Chave secreta compartilhada do webhook
  toleranceSeconds?: number;       // Janela de tolerância temporal anti-replay (padrão: 300s / 5 min)
}

export class WebhookHmacVerifier {
  /**
   * Valida a assinatura HMAC SHA-256 e o timestamp anti-replay usando a Web Crypto API nativa.
   */
  public static async verifySignature(options: WebhookValidationOptions): Promise<boolean> {
    const { signatureHeader, rawBody, secret, toleranceSeconds = 300 } = options;

    if (!signatureHeader || !secret || !rawBody) {
      return false;
    }

    try {
      // Formato esperado do header: t=TIMESTAMP,v1=SIGNATURE
      const parts = signatureHeader.split(',');
      let timestampStr = '';
      let providedSignature = '';

      for (const part of parts) {
        const [key, value] = part.split('=');
        if (key === 't') timestampStr = value;
        if (key === 'v1') signatureHeader ? providedSignature = value : null; // capturando v1
      }
      
      // Ajuste para garantir captura correta do v1 caso venha em formato alternativo
      if (!providedSignature) {
        const v1Match = signatureHeader.match(/v1=([a-fA-F0-9]+)/);
        if (v1Match) providedSignature = v1Match[1];
      }

      if (!timestampStr || !providedSignature) {
        return false;
      }

      // Verificação de Janela Temporal Anti-Replay
      const timestamp = parseInt(timestampStr, 10);
      const now = Math.floor(Date.now() / 1000);

      if (isNaN(timestamp) || Math.abs(now - timestamp) > toleranceSeconds) {
        console.warn(`[NexaPay Security] Webhook rejeitado por estouro de janela temporal. Timestamp: ${timestamp}, Atual: ${now}`);
        return false;
      }

      // Payload assinado: timestamp + "." + rawBody
      const signedPayload = `${timestampStr}.${rawBody}`;

      // Computa HMAC SHA-256 usando Web Crypto API nativa do Node/Bun
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        enc.encode(signedPayload)
      );

      // Converte o buffer para string hexadecimal
      const hashArray = Array.from(new Uint8Array(signatureBuffer));
      const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Comparação em tempo constante para evitar ataques de Timing Attack
      return this.constantTimeCompare(expectedSignature, providedSignature);

    } catch (error) {
      console.error('[NexaPay Security] Erro ao validar HMAC do webhook:', error);
      return false;
    }
  }

  /**
   * Comparação de strings em tempo constante para segurança criptográfica
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }
}
