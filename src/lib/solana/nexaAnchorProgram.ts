import { Buffer } from "buffer";
import { PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { AgentSessionAllowance, NexaTransaction, PaymentMethod } from "../../types";

// Helper to safely parse any string into a valid Solana PublicKey without throwing base58 errors
export function toValidPublicKey(pubkeyInput: string | PublicKey, fallbackSeed = "nexa_default"): PublicKey {
  if (pubkeyInput instanceof PublicKey) return pubkeyInput;
  try {
    return new PublicKey(pubkeyInput.trim());
  } catch {
    const seedBytes = Buffer.from((fallbackSeed + "11111111111111111111111111111111").slice(0, 32));
    return PublicKey.findProgramAddressSync([seedBytes], SystemProgram.programId)[0];
  }
}

// Official Nexa Pay Anchor Program ID (Derived deterministically for devnet / mainnet)
export const NEXA_PROGRAM_ID = PublicKey.findProgramAddressSync(
  [Buffer.from("nexa_pay_program_v1")],
  SystemProgram.programId
)[0];

export const SPL_TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey("whirLbMiicVdio4qvUfM5KAgZXPXWizZaXksYZXWvgX");

// Default Token Mints (Solana Devnet / Mainnet representation)
export const MINTS = {
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  EURC: new PublicKey("HzwqbKZw8HxMN6bF2yFZMgKgUS2q28gH69wGgG6p58k3"),
};

// Anchor Smart Contract Source Code (Rust)
export const ANCHOR_RUST_SOURCE = {
  lib: `// Nexa Pay Core - Non-Custodial Hybrid Solana & PIX Settlement Program
// Framework: Anchor 0.30.1

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub mod state;
use state::*;

declare_id!("NexaP1ayX1111111111111111111111111111111111");

#[program]
pub mod nexa_pay_core {
    use super::*;

    pub fn pay_direct(
        ctx: Context<PayDirect>,
        amount: u64,
        expected_reference: Pubkey,
    ) -> Result<()> {
        require!(
            ctx.remaining_accounts.iter().any(|acc| acc.key() == expected_reference),
            ErrorCode::ReferenceMissing
        );

        let cpi_accounts = Transfer {
            from: ctx.accounts.payer_token.to_account_info(),
            to: ctx.accounts.merchant_token.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

        emit!(PaymentSettledDirect {
            reference: expected_reference,
            amount,
            payer: ctx.accounts.payer.key(),
            merchant: ctx.accounts.merchant_token.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn delegate_agent_allowance(
        ctx: Context<DelegateAgentAllowance>,
        daily_limit: u64,
        valid_until: i64,
    ) -> Result<()> {
        let allowance = &mut ctx.accounts.agent_allowance;
        let clock = Clock::get()?;
        allowance.authority = ctx.accounts.authority.key();
        allowance.agent_pubkey = ctx.accounts.agent_pubkey.key();
        allowance.daily_limit = daily_limit;
        allowance.daily_spent = 0;
        allowance.last_reset_timestamp = clock.unix_timestamp;
        allowance.valid_until = valid_until;
        Ok(())
    }

    pub fn pay_via_agent_session(
        ctx: Context<PayViaAgentSession>,
        amount: u64,
        expected_reference: Pubkey,
    ) -> Result<()> {
        require!(
            ctx.remaining_accounts.iter().any(|acc| acc.key() == expected_reference),
            ErrorCode::ReferenceMissing
        );

        let clock = Clock::get()?;
        let allowance = &mut ctx.accounts.agent_allowance;
        require!(clock.unix_timestamp <= allowance.valid_until, ErrorCode::SessionExpired);

        if clock.unix_timestamp.saturating_sub(allowance.last_reset_timestamp) >= 86400 {
            allowance.daily_spent = 0;
            allowance.last_reset_timestamp = clock.unix_timestamp;
        }

        require!(
            allowance.daily_spent.checked_add(amount).unwrap() <= allowance.daily_limit,
            ErrorCode::DailyLimitExceeded
        );

        allowance.daily_spent = allowance.daily_spent.checked_add(amount).unwrap();

        require!(ctx.accounts.agent_signer.key() == allowance.agent_pubkey, ErrorCode::InvalidAgent);

        let cpi_accounts = Transfer {
            from: ctx.accounts.payer_token.to_account_info(),
            to: ctx.accounts.merchant_token.to_account_info(),
            authority: ctx.accounts.agent_signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

        emit!(PaymentSettledDirect {
            reference: expected_reference,
            amount,
            payer: allowance.authority,
            merchant: ctx.accounts.merchant_token.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct PayDirect<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub payer_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub merchant_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(daily_limit: u64, valid_until: i64)]
pub struct DelegateAgentAllowance<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: storage pubkey for agent
    pub agent_pubkey: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = AgentAllowance::LEN,
        seeds = [b"allowance", authority.key().as_ref(), agent_pubkey.key().as_ref()],
        bump
    )]
    pub agent_allowance: Account<'info, AgentAllowance>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PayViaAgentSession<'info> {
    pub agent_signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"allowance", agent_allowance.authority.as_ref(), agent_signer.key().as_ref()],
        bump
    )]
    pub agent_allowance: Account<'info, AgentAllowance>,
    #[account(mut)]
    pub payer_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub merchant_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct PaymentSettledDirect {
    pub reference: Pubkey,
    pub amount: u64,
    pub payer: Pubkey,
    pub merchant: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Reference account missing from transaction remaining_accounts.")]
    ReferenceMissing,
    #[msg("Agent session expired.")]
    SessionExpired,
    #[msg("Daily spending limit exceeded for agent session.")]
    DailyLimitExceeded,
    #[msg("Invalid agent signature.")]
    InvalidAgent,
}`,

  state: `// state.rs - Program Derived Address Structures

use anchor_lang::prelude::*;

#[account]
pub struct AgentAllowance {
    pub authority: Pubkey,
    pub agent_pubkey: Pubkey,
    pub daily_limit: u64,
    pub daily_spent: u64,
    pub last_reset_timestamp: i64,
    pub valid_until: i64,
}

impl AgentAllowance {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8;
}

#[account]
pub struct MerchantProfile {
    pub authority: Pubkey,
    pub merchant_name: String, // 32 chars
    pub pix_key_hash: [u8; 32],
    pub total_settled_lamports: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct AgentSessionAllowance {
    pub buyer: Pubkey,
    pub agent_key: Pubkey,
    pub merchant: Pubkey,
    pub allowed_mint: Pubkey,
    pub max_spend_per_tx: u64,
    pub daily_limit_lamports: u64,
    pub spent_today_lamports: u64,
    pub last_reset_timestamp: i64,
    pub expiry_timestamp: i64,
    pub is_revoked: bool,
    pub bump: u8,
}

impl AgentSessionAllowance {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1;
}`,

  instructions: `// instructions/process_direct_payment.rs - Zero-Custody Token Direct Transfer

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::ErrorCode;

// Refer to nexa_pay_core module for handler execution logic.`,

  errors: `// errors.rs - Error Enums for Nexa Pay Protocol

use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Reference account missing from transaction remaining_accounts.")]
    ReferenceMissing,
    #[msg("Agent session expired.")]
    SessionExpired,
    #[msg("Daily spending limit exceeded for agent session.")]
    DailyLimitExceeded,
    #[msg("Invalid agent signature.")]
    InvalidAgent,
}`,

  tests: `// tests/nexa_pay_core.ts - Anchor Integration Test Suite

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NexaPayCore } from "../target/types/nexa_pay_core";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

describe("nexa_pay_core tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.NexaPayCore as Program<NexaPayCore>;

  it("fails direct payment if reference is missing", async () => {
    const reference = Keypair.generate().publicKey;
    const payer = provider.wallet.payer;
    try {
      await program.methods
        .payDirect(new anchor.BN(100), reference)
        .accounts({
          payer: payer.publicKey,
          payerToken: PublicKey.default,
          merchantToken: PublicKey.default,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc({ remainingAccounts: [] });
      expect.fail("Should have failed due to missing reference");
    } catch (e: any) {
      expect(e.error.errorCode.code).to.equal("ReferenceMissing");
    }
  });
});`,
};

// Anchor Program IDL Specification
export const NEXA_ANCHOR_IDL = {
  version: "0.1.0",
  name: "nexa_pay_core",
  instructions: [
    {
      name: "payDirect",
      accounts: [
        { name: "payer", isMut: true, isSigner: true },
        { name: "payerToken", isMut: true, isSigner: false },
        { name: "merchantToken", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "amount", type: "u64" },
        { name: "expectedReference", type: "publicKey" },
      ],
    },
    {
      name: "delegateAgentAllowance",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "agentPubkey", isMut: false, isSigner: false },
        { name: "agentAllowance", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "dailyLimit", type: "u64" },
        { name: "validUntil", type: "i64" },
      ],
    },
    {
      name: "payViaAgentSession",
      accounts: [
        { name: "agentSigner", isMut: false, isSigner: true },
        { name: "agentAllowance", isMut: true, isSigner: false },
        { name: "payerToken", isMut: true, isSigner: false },
        { name: "merchantToken", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "amount", type: "u64" },
        { name: "expectedReference", type: "publicKey" },
      ],
    },
  ],
  events: [
    {
      name: "PaymentSettledDirect",
      fields: [
        { name: "reference", type: "publicKey", index: false },
        { name: "amount", type: "u64", index: false },
        { name: "payer", type: "publicKey", index: false },
        { name: "merchant", type: "publicKey", index: false },
        { name: "timestamp", type: "i64", index: false },
      ],
    },
  ],
  accounts: [
    {
      name: "AgentAllowance",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "agentPubkey", type: "publicKey" },
          { name: "dailyLimit", type: "u64" },
          { name: "dailySpent", type: "u64" },
          { name: "lastResetTimestamp", type: "i64" },
          { name: "validUntil", type: "i64" },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: "ReferenceMissing", msg: "Reference account missing from transaction remaining_accounts." },
    { code: 6001, name: "SessionExpired", msg: "Agent session expired." },
    { code: 6002, name: "DailyLimitExceeded", msg: "Daily spending limit exceeded for agent session." },
    { code: 6003, name: "InvalidAgent", msg: "Invalid agent signature." },
  ],
};

/**
 * Derive Core Agent Allowance PDA
 * Seed pattern: ["allowance", authority_pubkey, agent_pubkey]
 */
export function deriveAgentAllowancePDA(
  authorityPubkey: string | PublicKey,
  agentPubkey: string | PublicKey
): { pda: PublicKey; bump: number } {
  const authorityKey = toValidPublicKey(authorityPubkey, "authority");
  const agentKey = toValidPublicKey(agentPubkey, "agent");

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("allowance"),
      authorityKey.toBuffer(),
      agentKey.toBuffer(),
    ],
    NEXA_PROGRAM_ID
  );
  return { pda, bump };
}

/**
 * Derive Agent Session Allowance PDA
 * Seed pattern: ["session", buyer_pubkey, agent_pubkey, merchant_pubkey]
 */
export function deriveAgentSessionPDA(
  buyerPubkey: string | PublicKey,
  agentPubkey: string | PublicKey,
  merchantPubkey: string | PublicKey
): { pda: PublicKey; bump: number } {
  const buyerKey = toValidPublicKey(buyerPubkey, "buyer");
  const agentKey = toValidPublicKey(agentPubkey, "agent");
  const merchantKey = toValidPublicKey(merchantPubkey, "merchant");

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("session"),
      buyerKey.toBuffer(),
      agentKey.toBuffer(),
      merchantKey.toBuffer(),
    ],
    NEXA_PROGRAM_ID
  );
  return { pda, bump };
}

/**
 * Generate mock transaction signatures & simulated finality metrics
 */
export function generateMockSignature(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let sig = "";
  for (let i = 0; i < 88; i++) {
    sig += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sig;
}

/**
 * Simulates on-chain zero-custody token transfer build
 */
export function buildDirectMerchantPaymentTx(
  buyerPubkey: string | PublicKey,
  merchantPubkey: string | PublicKey,
  amountSolOrUsdc: number,
  tokenSymbol: PaymentMethod
): { transaction: Transaction; signature: string; slot: number } {
  const dummyTx = new Transaction();
  const buyerKey = toValidPublicKey(buyerPubkey, "buyer");
  const merchantKey = toValidPublicKey(merchantPubkey, "merchant");
  
  // Add memo & system/token instruction representation
  dummyTx.add(
    SystemProgram.transfer({
      fromPubkey: buyerKey,
      toPubkey: merchantKey,
      lamports: Math.floor(amountSolOrUsdc * 1e9),
    })
  );

  const slot = Math.floor(310000000 + Math.random() * 500000);
  const signature = generateMockSignature();

  return { transaction: dummyTx, signature, slot };
}
