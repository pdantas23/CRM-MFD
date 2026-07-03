// Registro de notificações — SERVER-ONLY (helper, não é Server Action).
// Chamado pela emissão de pedido, aprovação de pagamento e pela sync. Usa o
// service role e é BEST-EFFORT: nunca lança (falha só é logada), para não
// quebrar o fluxo principal. Dedupe garantido pelo índice único
// (conta_id, tipo, pedido_id_vhsys) + ignoreDuplicates.

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

const ROLES_PEDIDO_EMITIDO = ["financeiro", "superadmin"];
const ROLES_PAGAMENTO_APROVADO = ["admin", "superadmin"];

export interface DadosNotificacaoPedido {
  contaId: string;
  pedidoIdVhsys: number;
  pedidoNumero: number | null;
  nomeCliente: string | null;
  /** Quem causou o evento; null = origem VHSYS (sync). */
  atorUserId: string | null;
  atorNome: string | null;
}

async function inserir(
  admin: Admin,
  tipo: "pedido_emitido" | "pagamento_aprovado",
  roles: string[],
  d: DadosNotificacaoPedido
): Promise<void> {
  try {
    await admin.from("notificacoes").upsert(
      {
        conta_id: d.contaId,
        tipo,
        roles_alvo: roles,
        pedido_id_vhsys: d.pedidoIdVhsys,
        pedido_numero: d.pedidoNumero,
        nome_cliente: d.nomeCliente,
        ator_user_id: d.atorUserId,
        ator_nome: d.atorNome,
      },
      { onConflict: "conta_id,tipo,pedido_id_vhsys", ignoreDuplicates: true }
    );
  } catch (e) {
    console.error(`registrar notificação ${tipo}:`, e);
  }
}

/** Pedido emitido (chegou em "aguardando pagamento") → financeiro + superadmin. */
export async function registrarPedidoEmitido(admin: Admin, d: DadosNotificacaoPedido): Promise<void> {
  await inserir(admin, "pedido_emitido", ROLES_PEDIDO_EMITIDO, d);
}

/** Pagamento aprovado (libera cadastro de entrega) → admin + superadmin. */
export async function registrarPagamentoAprovado(admin: Admin, d: DadosNotificacaoPedido): Promise<void> {
  await inserir(admin, "pagamento_aprovado", ROLES_PAGAMENTO_APROVADO, d);
}
