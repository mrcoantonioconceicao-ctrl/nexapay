/**
 * NexaPay PIX Adapter
 * Responsável por gerar a string oficial do payload Pix EMV (Copia e Cola) 
 * com base no manual do Banco Central do Brasil para QR Codes Dinâmicos.
 */

export interface PixPayloadParams {
  pixKey: string;          // Chave Pix do lojista (CPF, CNPJ, E-mail, Telefone ou Chave Aleatória)
  merchantName: string;    // Nome do beneficiário (até 25 caracteres)
  merchantCity: string;    // Cidade do beneficiário (até 15 caracteres)
  amountBrl: number;       // Valor da transação em Reais (ex: 150.00)
  txId: string;            // Identificador único da transação (orderId ou reference)
  description?: string;    // Descrição opcional
}

export class PixAdapter {
  private static formatField(id: string, value: string): string {
    const length = value.length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
  }

  private static calculateCRC16(payload: string): string {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    const bytes = Buffer.from(payload, 'utf8');

    for (let i = 0; i < bytes.length; i++) {
      crc ^= (bytes[i] << 8);
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc = crc << 1;
        }
      }
    }

    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * Gera a string completa do Pix Copia e Cola (EMV QR Code)
   */
  public static generateCopiaECola(params: PixPayloadParams): string {
    const gui = this.formatField('00', 'br.gov.bcb.pix');
    const key = this.formatField('01', params.pixKey);
    const desc = params.description ? this.formatField('02', params.description) : '';
    
    const merchantAccountInfo = this.formatField('26', gui + key + desc);
    const mcc = this.formatField('52', '0000'); // Merchant Category Code
    const currency = this.formatField('53', '986'); // BRL = 986
    const amount = this.formatField('54', params.amountBrl.toFixed(2));
    const country = this.formatField('58', 'BR');
    const merchantName = this.formatField('59', params.merchantName.substring(0, 25).normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    const merchantCity = this.formatField('60', params.merchantCity.substring(0, 15).normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    
    // Additional Data Field (TxID)
    const txIdField = this.formatField('05', params.txId.substring(0, 25));
    const additionalData = this.formatField('62', txIdField);

    // Monta o payload sem o CRC no final
    let payloadWithoutCrc = 
      this.formatField('01', '01') + // Payload Format Indicator
      merchantAccountInfo +
      mcc +
      currency +
      amount +
      country +
      merchantName +
      merchantCity +
      additionalData +
      '6304'; // ID do CRC16 com tamanho 04

    // Calcula e concatena o CRC16
    const crc = this.calculateCRC16(payloadWithoutCrc);
    return payloadWithoutCrc + crc;
  }
}
