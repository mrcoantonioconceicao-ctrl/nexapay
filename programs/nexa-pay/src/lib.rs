use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer, Token, TokenAccount};

declare_id!("NexaPay11111111111111111111111111111111111");

#[program]
pub mod nexa_pay {
    use super::*;

    /**
     * Inicializa a PDA de Delegação de Gastos para o Agente de IA (Agentic Allowance)
     */
    pub fn create_agent_allowance(
        ctx: Context<CreateAgentAllowance>,
        daily_limit_usdc: u64,
        valid_until: i64,
    ) -> Result<()> {
        let allowance = &mut ctx.accounts.allowance;
        allowance.authority = ctx.accounts.authority.key();
        allowance.agent = ctx.accounts.agent.key();
        allowance.daily_limit_usdc = daily_limit_usdc;
        allowance.spent_today = 0;
        allowance.valid_until = valid_until;
        allowance.bump = ctx.bumps.allowance;

        msg!("[NexaPay] Agentic Allowance PDA criada com sucesso para o agente: {}", allowance.agent);
        Ok(())
    }

    /**
     * Executa o pagamento autônomo (Escrowless Direct ATA CPI) validando os limites da PDA
     */
    pub fn execute_agent_payment(
        ctx: Context<ExecuteAgentPayment>,
        amount_usdc: u64,
    ) -> Result<()> {
        let allowance = &mut ctx.accounts.allowance;
        
        // Validações de segurança on-chain
        require!(Clock::get()?.unix_timestamp < allowance.valid_until, NexaError::AllowanceExpired);
        require!(allowance.spent_today + amount_usdc <= allowance.daily_limit_usdc, NexaError::DailyLimitExceeded);

        allowance.spent_today += amount_usdc;

        // Executa a transferência via CPI (Cross-Program Invocation) do SPL Token
        let authority_key = allowance.authority;
        let seeds = &[
            b"allowance",
            authority_key.as_ref(),
            allowance.agent.as_ref(),
            &[allowance.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.authority_token_account.to_account_info(),
            to: ctx.accounts.merchant_token_account.to_account_info(),
            authority: ctx.accounts.allowance.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::transfer(cpi_ctx, amount_usdc)?;

        msg!("[NexaPay] Pagamento autônomo executado via CPI no valor de {} USDC", amount_usdc);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateAgentAllowance<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: O pubkey do agente autorizado
    pub agent: AccountInfo<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"allowance", authority.key().as_ref(), agent.key().as_ref()],
        bump
    )]
    pub allowance: Account<'info, AgentAllowance>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteAgentPayment<'info> {
    pub agent: Signer<'info>,

    #[account(
        mut,
        seeds = [b"allowance", allowance.authority.as_ref(), agent.key().as_ref()],
        bump = allowance.bump,
        has_one = agent
    )]
    pub allowance: Account<'info, AgentAllowance>,

    #[account(mut)]
    pub authority_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub merchant_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct AgentAllowance {
    pub authority: Pubkey,          // Dono da carteira / fundos
    pub agent: Pubkey,              // Chave pública do Agente de IA autorizado
    pub daily_limit_usdc: u64,      // Limite diário em unidades de USDC
    pub spent_today: u64,           // Quanto já foi gasto no período
    pub valid_until: i64,           // Timestamp de expiração da permissão
    pub bump: u8,                   // Bump seed da PDA
}

#[error_code]
pub enum NexaError {
    #[msg("A permissão de gastos do agente expirou.")]
    AllowanceExpired,
    #[msg("O pagamento excede o limite diário autorizado para o agente.")]
    DailyLimitExceeded,
}
