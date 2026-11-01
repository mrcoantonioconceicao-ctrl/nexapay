/**
 * NexaPay Solana PDA Helper
 * Deriva as Program Derived Addresses (PDAs) para as delegações de agentes de IA.
 */

// Simulação de utilitário de PublicKey / Buffer para ambiente Node/Bun/Web3
export class NexaPdaHelper {
  /**
   * Deriva a PDA de Allowance com base nas seeds do programa Anchor:
   * seeds = [b"allowance", authority.toBuffer(), agent.toBuffer()]
   */
  public static deriveAllowancePda(
    programIdString: string,
    authorityString: string,
    agentString: string
  ): { pda: string; bump: number } {
    // Em produção com @solana/web3.js:
    // PublicKey.findProgramAddressSync([Buffer.from("allowance"), authority.toBuffer(), agent.toBuffer()], programId)
    
    // Simulação determinística robusta baseada em hash para o ambiente atual
    const combinedSeed = `nexa_allowance_${authorityString}_${agentString}_${programIdString}`;
    let hash = 0;
    for (let i = 0; i < combinedSeed.length; i++) {
      hash = (hash << 5) - hash + combinedSeed.charCodeAt(i);
      hash |= 0;
    }
    
    const mockBump = Math.abs(hash) % 255;
    const mockPda = `PDA_${Math.abs(hash).toString(16)}_NexaAllowance`;

    return {
      pda: mockPda,
      bump: mockBump
    };
  }
}
