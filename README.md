# ⚡ Nexa Pay — Enterprise Non-Custodial Hybrid Payment Infrastructure (Solana & PIX)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-Anchor%20v0.30-purple.svg)](https://solana.com)
[![PIX](https://img.shields.io/badge/BACEN-PIX%20EMV%20Compliant-brightgreen.svg)](https://www.bcb.gov.br/estabilidadefinanceira/pix)
[![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-orange.svg)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)

**Nexa Pay** é uma infraestrutura de pagamentos híbrida empresarial, não-custodial e resiliente, projetada para conectar o ecossistema financeiro brasileiro (**BACEN PIX**) ao ecossistema de criptoativos de baixa latência (**Solana USDC & SPL Tokens**).

A plataforma combina contratos inteligentes em **Anchor/Rust**, um orquestrador de transações distribuídas (**Dual-Rail Saga Engine**), verificação criptográfica **HMAC SHA-256**, exposição nativa para Agentes de IA através do **Model Context Protocol (MCP)** e um **SDK isomórfico sem dependências externas**.

---

## 📐 Visão Geral da Arquitetura

```
                            +----------------------------------+
                            |          CLIENT / AI AGENT       |
                            +----------------------------------+
                                     |                |
                    Solana Pay / Actions              PIX EMV Copia e Cola
                                     |                |
                                     v                v
                       +------------------------------------+
                       |    NEXA PAY DUAL-RAIL SAGA ENGINE   |
                       |  (src/lib/saga/DualRailSaga.ts)    |
                       +------------------------------------+
                          /                                \
                         /                                  \
                        v                                    v
       +---------------------------------+  +-----------------------------------+
       |     SOLANA ANCHOR PROGRAM       |  |       BACEN PIX PSP WEBHOOK       |
       |  (Escrowless Direct ATA CPI)    |  |   (HMAC SHA-256 WebhookController)|
       +---------------------------------+  +-----------------------------------+
                        \                                   /
                         \                                 /
                          v                               v
                       +------------------------------------+
                       |   MERCHANT DIRECT SETTLED ACCOUNT   |
                       |      (Zero Custody Guarantee)      |
                       +------------------------------------+
```

---

## 🗝️ Pilares Criptoeconômicos e Garantias Arquiteturais

1. **Custódia Zero (Escrowless Transfer)**:
   - Nenhum fundo ou token USDC/SPL permanece retido em contas de depósito ou cofres intermediários do contrato.
   - A liquidação é feita diretamente da carteira do pagador para a *Associated Token Account* (ATA) do lojista via Cross-Program Invocation (CPI) no *SPL Token Program*.

2. **Sessões Delegadas para Agentes de IA (Agentic Allowance PDA)**:
   - Permite que Agentes de IA autônomos realizem pagamentos via programa Anchor sem expor as chaves privadas do usuário.
   - Autorização delimitada via PDA (`seeds = [b"allowance", authority, agent_pubkey]`) com limite diário em USDC (`daily_limit_usdc`) e data limite de expiração (`valid_until`).

3. **Orquestrador de Saga Dual-Rail (Dual-Rail Saga Orchestrator)**:
   - Maquininha de estados para resolução concorrente de pedidos (`PENDING` ➔ `PIX_PAID` / `CRYPTO_PAID` ➔ `SETTLED`).
   - Tabela de eventos de intenção (`intent_events`) com garantia de **idempotência estrita** e tratamento automático de desincronização (`COMPENSATING`).

4. **Protocolo MCP Nativo (Model Context Protocol)**:
   - Exposição de ferramentas JSON-RPC 2.0 nativas para LLMs e Agentes Autônomos (`nexa_create_agent_allowance`, `nexa_execute_agent_payment`, `nexa_create_hybrid_pix_checkout`, `nexa_verify_dual_rail_status`).

5. **Segurança de Webhooks Baseada em Web Crypto API**:
   - Assinatura e validação de webhooks usando HMAC SHA-256 com janela de tolerância temporal anti-replay (padrão `t=timestamp,v1=signature`) e comparação em tempo constante.

6. **SDK Isomórfico Zero-Dependency (`@nexapay/sdk`)**:
   - Cliente TypeScript puro baseado no `fetch` nativo com retentativas automáticas (*exponential backoff*), compatível com Edge Runtimes (Cloudflare Workers, Vercel Edge, Deno, Bun, Node.js 18+).

---

## 🗂️ Estrutura do Repositório

```text
├── src/
│   ├── lib/
│   │   ├── solana/
│   │   │   └── nexaAnchorProgram.ts    # Contrato inteligente Anchor/Rust, IDL e programa ID
│   │   ├── saga/
│   │   │   └── DualRailSagaOrchestrator.ts # Motor de Saga Dual-Rail com trava FOR UPDATE e idempotência
│   │   ├── security/
│   │   │   ├── webhookHmac.ts          # Verificador de assinatura HMAC SHA-256 (Web Crypto API)
│   │   │   └── WebhookController.ts    # Endpoint HTTP para recebimento de webhooks bancários
│   │   ├── pix/
│   │   │   └── pixAdapter.ts           # Gerador de payload PIX EMV Copia e Cola dinâmico
│   │   ├── mcp/
│   │   │   └── nexaMcpTools.ts         # Servidor e especificações MCP JSON-RPC 2.0 para Agentes de IA
│   │   ├── sdk/
│   │   │   └── nexaClient.ts           # SDK Isomórfico oficial (@nexapay/sdk)
│   │   └── services/
│   │       ├── alertDispatcher.ts      # Serviço de notificação/PagerDuty para estado COMPENSATING
│   │       └── exportService.ts        # Exportador de extrato B2B paginado via cursor (CSV/JSON)
│   ├── components/
│   │   ├── AnchorCodeInspector.tsx     # Console de depuração e inspeção dos módulos em tempo real
│   │   ├── DualRailSagaSimulator.tsx   # Simulador visual interativo de fluxos de liquidação
│   │   └── WalletProvider.tsx          # Provedor Web3 Solana Wallet Adapter
│   ├── App.tsx                         # Aplicação principal e painel operacional
│   └── main.tsx                        # Entry point Vite/React
├── metadata.json                       # Metadados e permissões da aplicação
└── package.json                        # Dependências e scripts do projeto
```

---

## 📜 Smart Contract Anchor (`nexa_pay`)

O contrato inteligente Solana foi desenvolvido em **Anchor v0.30** para garantir execuções atômicas e seguras.

### Instruções do Contrato

1. **`create_agent_allowance`**:
   Cria uma conta PDA que autoriza um Agente de IA a gastar até um determinado valor diário em USDC até uma data limite.
   ```rust
   pub fn create_agent_allowance(
       ctx: Context<CreateAgentAllowance>,
       daily_limit_usdc: u64,
       valid_until: i64,
   ) -> Result<()>
   ```

2. **`execute_agent_payment`**:
   Executa a transferência direta de tokens da carteira delegante para a ATA do lojista, descontando do saldo limite diário da PDA.
   ```rust
   pub fn execute_agent_payment(
       ctx: Context<ExecuteAgentPayment>,
       amount_usdc: u64,
   ) -> Result<()>
   ```

3. **`process_direct_payment`**:
   Processa o pagamento direto entre comprador e vendedor sem custódia intermediária.

---

## 🤖 Integração com Agentes de IA via MCP

O **Nexa Pay** expõe nativamente ferramentas para servidores **Model Context Protocol (MCP)** em JSON-RPC 2.0:

```json
[
  {
    "name": "nexa_create_agent_allowance",
    "description": "Delegate non-custodial spending allowance PDA to an AI agent on Solana",
    "inputSchema": {
      "type": "object",
      "properties": {
        "authorityPubkey": { "type": "string" },
        "agentPubkey": { "type": "string" },
        "dailyLimitUsdc": { "type": "number" },
        "validUntilTimestamp": { "type": "number" }
      },
      "required": ["authorityPubkey", "agentPubkey", "dailyLimitUsdc", "validUntilTimestamp"]
    }
  },
  {
    "name": "nexa_execute_agent_payment",
    "description": "Execute zero-custody autonomous payment via active agent allowance PDA",
    "inputSchema": {
      "type": "object",
      "properties": {
        "agentPubkey": { "type": "string" },
        "merchantTokenAccount": { "type": "string" },
        "amountUsdc": { "type": "number" },
        "referencePubkey": { "type": "string" }
      },
      "required": ["agentPubkey", "merchantTokenAccount", "amountUsdc", "referencePubkey"]
    }
  }
]
```

---

## 📦 Exemplo de Uso do SDK Client (`@nexapay/sdk`)

Instale ou utilize o SDK isomórfico em sua aplicação Node.js, Next.js, Cloudflare Worker ou Deno:

```typescript
import { NexaPayClient } from './lib/sdk/nexaClient';

const client = new NexaPayClient({
  apiKey: 'nexa_live_secret_key_12345',
  baseUrl: 'https://api.nexapay.io',
  environment: 'production'
});

// 1. Criar Checkout Híbrido (PIX + Solana)
const checkout = await client.createCheckout({
  merchantId: 'mch_enterprise_99',
  amountBrl: 150.00,
  merchantWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  itemDescription: 'Plano Anual SaaS Enterprise'
});

console.log('PIX Copia e Cola:', checkout.rails.pixCopiaECola);
console.log('Solana Action Link:', checkout.rails.solanaActionUrl);

// 2. Verificar Status da Transação
const status = await client.getOrderStatus(checkout.orderId);
console.log('Status do Pedido:', status.status); // 'SETTLED'
```

---

## 🛠️ Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js**: v18.0.0 ou superior
- **npm** ou **pnpm**

### Passo a Passo

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/seu-usuario/nexa-pay.git
   cd nexa-pay
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Iniciar o Servidor de Desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse a aplicação no navegador através de `http://localhost:3000`.

4. **Validar Código (Linter & Build)**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 🛡️ Licença

Este projeto está licenciado sob a licença **MIT** — veja o arquivo [LICENSE](LICENSE) para mais detalhes.
