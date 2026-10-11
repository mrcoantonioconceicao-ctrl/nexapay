import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.PGUSER || 'postgres'}@localhost:5432/nexapay`
});

const server = new Server(
  { name: 'nexapay-sovereign-node', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'nexapay_create_intent',
      description: 'Cria ou reinicializa uma ordem de pagamento com status PENDING',
      inputSchema: {
        type: 'object',
        properties: { orderId: { type: 'string' } },
        required: ['orderId']
      }
    },
    {
      name: 'nexapay_query_status',
      description: 'Consulta o estado atômico de uma ordem no PostgreSQL móvel',
      inputSchema: {
        type: 'object',
        properties: { orderId: { type: 'string' } },
        required: ['orderId']
      }
    },
    {
      name: 'nexapay_list_audit',
      description: 'Inspeciona os últimos logs de auditoria de webhooks HMAC validados',
      inputSchema: { type: 'object', properties: {} }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const client = await pool.connect();
  try {
    const { name, arguments: args } = request.params;
    if (name === 'nexapay_create_intent') {
      const { orderId } = args as { orderId: string };
      await client.query(
        "INSERT INTO orders (id, status) VALUES ($1, 'PENDING') ON CONFLICT (id) DO UPDATE SET status = 'PENDING'",
        [orderId]
      );
      return { content: [{ type: 'text', text: `Ordem ${orderId} state: PENDING` }] };
    }
    if (name === 'nexapay_query_status') {
      const { orderId } = args as { orderId: string };
      const res = await client.query('SELECT id, status, updated_at FROM orders WHERE id = $1', [orderId]);
      return { content: [{ type: 'text', text: JSON.stringify(res.rows[0] || { status: 'NOT_FOUND' }) }] };
    }
    if (name === 'nexapay_list_audit') {
      const res = await client.query('SELECT order_id, txid, processed_at FROM webhook_audit_logs ORDER BY processed_at DESC LIMIT 5');
      return { content: [{ type: 'text', text: JSON.stringify(res.rows) }] };
    }
    throw new Error(`Tool not found: ${name}`);
  } finally {
    client.release();
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[NexaPay MCP Stdio] Active');
}

main().catch((err) => {
  console.error('[NexaPay MCP Stdio] Fatal error:', err);
  process.exit(1);
});
