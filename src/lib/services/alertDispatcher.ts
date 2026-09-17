import { verifyWebhookHmac } from '../security/webhookHmac';

export interface DesyncAlertPayload {
  orderId: string;
  merchantId: string;
  pixTxid?: string;
  status: 'COMPENSATING' | 'DESYNC_ERROR';
  reason: string;
  timestamp: string;
}

export interface AlertDispatchResult {
  alertId: string;
  delivered: boolean;
  statusCode?: number;
  error?: string;
}

export class AlertService {
  constructor(
    private merchantWebhookUrl: string,
    private alertSigningSecret: string,
    private timeoutMs: number = 5000
  ) {}

  /**
   * Generates a signed Webhook payload to notify merchant alerting systems (PagerDuty, Webhook receiver)
   */
  async dispatchCompensationAlert(payload: DesyncAlertPayload): Promise<AlertDispatchResult> {
    const alertId = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const bodyString = JSON.stringify({ ...payload, alertId });

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.alertSigningSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${bodyString}`));
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.merchantWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nexa-Alert-Id': alertId,
          'X-Nexa-Signature': `t=${timestamp},v1=${signature}`,
        },
        body: bodyString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return {
        alertId,
        delivered: res.ok,
        statusCode: res.status,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        alertId,
        delivered: false,
        error: err.message || 'Alert dispatch failed',
      };
    }
  }

  /**
   * Helper to dispatch payment desync warning
   */
  async dispatchDesyncAlert(orderId: string, merchantId: string, reason: string, pixTxid?: string): Promise<AlertDispatchResult> {
    return this.dispatchCompensationAlert({
      orderId,
      merchantId,
      pixTxid,
      status: 'DESYNC_ERROR',
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}
