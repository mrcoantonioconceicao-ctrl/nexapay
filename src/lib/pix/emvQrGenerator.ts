import QRCode from "qrcode";
import { PixEmvRequest, PixEmvResponse } from "../../types";

/**
 * Client-Side EMV QRCPS (EMVCo) CRC16 Implementation
 * Standard BACEN (Central Bank of Brazil) PIX Specification
 */
export function computePixCrc16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;
  const bytes = new TextEncoder().encode(payload);

  for (const b of bytes) {
    for (let i = 0; i < 8; i++) {
      const bit = ((b >> (7 - i)) & 1) === 1;
      const c15 = ((crc >> 15) & 1) === 1;
      crc <<= 1;
      if (c15 !== bit) {
        crc ^= polynomial;
      }
    }
  }
  crc &= 0xffff;
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${tag}${len}${value}`;
}

/**
 * Generate BACEN PIX Dynamic / Static EMV Payload
 */
export function generatePixEmvPayload(req: PixEmvRequest): PixEmvResponse {
  const p00 = formatTlv("00", "01"); // Payload Format Indicator
  const p01 = formatTlv("01", "12"); // Dynamic Initiation
  
  // Tag 26: Merchant Account Information
  const gui = formatTlv("00", "br.gov.bcb.pix");
  const key = formatTlv("01", req.pixKey);
  const desc = req.description ? formatTlv("02", req.description) : "";
  const merchantInfo = formatTlv("26", `${gui}${key}${desc}`);
  
  const category = formatTlv("52", "0000"); // Category
  const currency = formatTlv("53", "986"); // BRL Currency Code
  const amountStr = req.txAmount ? Number(req.txAmount).toFixed(2) : "";
  const amount = amountStr ? formatTlv("54", amountStr) : "";
  const country = formatTlv("58", "BR");
  const name = formatTlv("59", req.merchantName.slice(0, 25).toUpperCase());
  const city = formatTlv("60", (req.merchantCity || "SAO PAULO").slice(0, 15).toUpperCase());
  
  // Tag 62: Additional Data Field (TXID)
  const txId = req.txId || `NEXA${Date.now()}`;
  const reference = formatTlv("05", txId.slice(0, 25));
  const additionalData = formatTlv("62", reference);
  
  const rawWithoutCrc = `${p00}${p01}${merchantInfo}${category}${currency}${amount}${country}${name}${city}${additionalData}6304`;
  const crc = computePixCrc16(rawWithoutCrc);
  const fullPayload = `${rawWithoutCrc}${crc}`;

  return {
    success: true,
    payload: fullPayload,
    crc,
    txId,
    formattedAmount: amountStr ? `R$ ${amountStr}` : "Open Amount",
  };
}

/**
 * Render QR code as Data URL (image/png)
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });
  } catch (err) {
    console.error("Failed to render QR Code Data URL:", err);
    return "";
  }
}
