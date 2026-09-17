/**
 * Edge-Ready Cryptographic HMAC-SHA256 Webhook Verification
 * Built using standard Web Crypto API (SubtleCrypto) compatible with Node, Cloudflare Workers, and Browser
 */

export interface WebhookVerificationResult {
  isValid: boolean;
  timestamp: number;
  reason?: string;
}

/**
 * Verify HMAC SHA-256 signature for incoming PSP / PIX webhooks
 * Standard header format: x-nexa-signature: t=1726590000,v1=9f8a...
 */
export async function verifyWebhookHmac(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds: number = 300
): Promise<WebhookVerificationResult> {
  if (!signatureHeader || !secret) {
    return { isValid: false, timestamp: 0, reason: "Missing signature header or secret key" };
  }

  // Parse header: "t=1726590000,v1=hash..."
  const parts = signatureHeader.split(",");
  let timestampStr = "";
  let receivedSignature = "";

  for (const part of parts) {
    const [k, v] = part.split("=");
    if (k?.trim() === "t") timestampStr = v?.trim() || "";
    if (k?.trim() === "v1") receivedSignature = v?.trim() || "";
  }

  if (!timestampStr || !receivedSignature) {
    return { isValid: false, timestamp: 0, reason: "Malformed signature header format" };
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { isValid: false, timestamp: 0, reason: "Invalid timestamp format" };
  }

  // Anti-Replay Attack Check (Tolerance Window)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimestamp - timestamp) > toleranceSeconds) {
    return { isValid: false, timestamp, reason: `Timestamp outside tolerance window (${toleranceSeconds}s)` };
  }

  // Compute expected HMAC SHA-256 signature over: `${timestamp}.${rawBody}`
  const signedPayload = `${timestamp}.${rawBody}`;
  const encoder = new TextEncoder();

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload)
    );

    const expectedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time string comparison simulation to prevent timing attacks
    const isValid = timingSafeEqualStr(receivedSignature.toLowerCase(), expectedHex.toLowerCase());

    return {
      isValid,
      timestamp,
      reason: isValid ? undefined : "HMAC signature mismatch",
    };
  } catch (err: any) {
    return { isValid: false, timestamp, reason: `Crypto error: ${err.message}` };
  }
}

/**
 * Constant-time comparison helper
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
