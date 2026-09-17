import { Request, Response } from 'express';
import { DualRailSagaOrchestrator } from '../saga/DualRailSagaOrchestrator';
import { verifyWebhookHmac } from './webhookHmac';

export class WebhookController {
  constructor(
    private saga: DualRailSagaOrchestrator,
    private webhookSecret: string
  ) {}

  async verifyHmacAsync(rawBody: string, signatureHeader: string): Promise<boolean> {
    const res = await verifyWebhookHmac(rawBody, signatureHeader, this.webhookSecret);
    return res.isValid;
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    const signature = (req.headers['x-signature-hmac'] || req.headers['x-nexa-signature']) as string;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!signature) {
      res.status(401).json({ error: 'Missing HMAC signature header' });
      return;
    }

    const isValid = await this.verifyHmacAsync(rawBody, signature);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid HMAC signature' });
      return;
    }

    try {
      const bodyObj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { orderId, txid, idempotencyKey } = bodyObj;
      const status = await this.saga.handlePixWebhook(orderId, txid, idempotencyKey || txid);
      res.status(200).json({ status, received: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
