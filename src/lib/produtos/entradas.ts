// Notas de entrada (VHSYS /entradas-mercadoria) → aba Produtos — SERVER-ONLY.
// Chamado pelo cron de sync, no máximo a cada INTERVALO_MIN por conta. Para cada
// produto de cada nota NOVA (id_entrada > cursor da conta):
//   - última compra = data da nota (só avança, nunca volta);
//   - preço de custo = valor unitário da nota, SE a unidade da nota for a mesma
//     do cadastro; senão só a data muda e o motivo vai para aviso_compra.
// Produto do VHSYS ainda sem precificação ganha um registro com as taxas padrão.
// Nada é enviado ao VHSYS: a linha fica "Diferente" até o envio manual.

import { createAdminClient } from "@/lib/supabase/admin";
import type { VhsysTokens } from "@/lib/accounts/repo";
import { runComTokensVhsys, vhsysGet, vhsysGetTodos } from "@/lib/vhsys/client";
import { carregarConfigs } from "./dados";

const INTERVALO_MIN = 30;

interface Entrada {
  id_entrada: number;
  data_pedido: string;
  status_pedido: string;
  nota_numero: string | number | null;
  lixeira: string;
}

interface ItemEntrada {
  id_produto: number;
  unidade_produto: string;
  valor_unit_produto: string;
}

interface Compra {
  data: string;
  nota: string;
  valorUnit: number;
  unidade: string;
}

const unidade = (u: unknown) => String(u ?? "").trim().toUpperCase();
const dataBR = (iso: string) => iso.split("-").reverse().join("/");

export async function sincronizarComprasNotas(conta: { id: string; tokens: VhsysTokens }): Promise<string> {
  const admin = createAdminClient();
  const { data: cfg } = await admin
    .from("precificacao_config")
    .select("entradas_ultimo_id, entradas_verificado_em")
    .eq("conta_id", conta.id)
    .maybeSingle();
  const estado = cfg as { entradas_ultimo_id: number | null; entradas_verificado_em: string | null } | null;
  if (!estado) return "sem config de precificação";
  if (
    estado.entradas_verificado_em &&
    Date.now() - new Date(estado.entradas_verificado_em).getTime() < INTERVALO_MIN * 60_000
  ) {
    return "aguardando intervalo";
  }

  const entradas = (
    await runComTokensVhsys(conta.tokens, () => vhsysGetTodos<Entrada>("/entradas-mercadoria"))
  )
    .filter((e) => e.lixeira !== "Sim" && e.status_pedido !== "Cancelado")
    .sort((a, b) => a.id_entrada - b.id_entrada);
  const maiorId = entradas.reduce((m, e) => Math.max(m, Number(e.id_entrada)), 0);

  const marcar = (ultimoId: number | null) =>
    admin
      .from("precificacao_config")
      .update({ entradas_ultimo_id: ultimoId, entradas_verificado_em: new Date().toISOString() })
      .eq("conta_id", conta.id);

  // Primeira execução: só posiciona o cursor (o histórico veio da planilha).
  if (estado.entradas_ultimo_id === null) {
    await marcar(maiorId);
    return `cursor inicial em ${maiorId}`;
  }

  const novas = entradas.filter((e) => e.id_entrada > estado.entradas_ultimo_id!);
  if (novas.length === 0) {
    await marcar(estado.entradas_ultimo_id);
    return "nenhuma nota nova";
  }

  // Última compra por produto entre as notas novas (a mais recente vence).
  // Nota ainda sem itens (lançamento em andamento) segura o cursor para ser
  // relida na próxima rodada.
  const compras = new Map<number, Compra>();
  let cursor = estado.entradas_ultimo_id;
  let travado = false;
  for (const e of novas) {
    const { data: itens } = await runComTokensVhsys(conta.tokens, () =>
      vhsysGet<ItemEntrada>(`/entradas-mercadoria/${e.id_entrada}/produtos`)
    );
    if (itens.length === 0) {
      travado = true;
      continue;
    }
    if (!travado) cursor = e.id_entrada;
    for (const it of itens) {
      const atual = compras.get(it.id_produto);
      const data = String(e.data_pedido ?? "");
      if (atual && atual.data > data) continue;
      compras.set(it.id_produto, {
        data,
        nota: String(e.nota_numero ?? e.id_entrada),
        valorUnit: Number(String(it.valor_unit_produto ?? "").replace(",", ".")) || 0,
        unidade: unidade(it.unidade_produto),
      });
    }
    await new Promise((r) => setTimeout(r, 120)); // cortesia com a API
  }

  const ids = Array.from(compras.keys());
  const [{ data: registros }, { data: produtos }, configs] = await Promise.all([
    admin
      .from("precificacao_produtos")
      .select("id, id_vhsys, ultima_compra")
      .eq("conta_id", conta.id)
      .in("id_vhsys", ids),
    admin
      .from("vhsys_produtos")
      .select("id_vhsys, descricao, unidade")
      .eq("conta_id", conta.id)
      .eq("lixeira", false)
      .in("id_vhsys", ids),
    carregarConfigs([conta.id]),
  ]);
  const registroPor = new Map(
    ((registros ?? []) as { id: string; id_vhsys: number; ultima_compra: string | null }[]).map((r) => [
      Number(r.id_vhsys),
      r,
    ])
  );
  const produtoPor = new Map(
    ((produtos ?? []) as { id_vhsys: number; descricao: string; unidade: string | null }[]).map((p) => [
      Number(p.id_vhsys),
      p,
    ])
  );
  const padrao = configs.get(conta.id)!;

  let atualizados = 0;
  for (const [idVhsys, c] of Array.from(compras.entries())) {
    const prod = produtoPor.get(idVhsys);
    if (!prod) continue; // produto excluído / fora do espelho
    const reg = registroPor.get(idVhsys);
    if (reg?.ultima_compra && reg.ultima_compra > c.data) continue;

    const unidadeCadastro = unidade(prod.unidade);
    const mesmaUnidade = !unidadeCadastro || !c.unidade || unidadeCadastro === c.unidade;
    const atualizaCusto = mesmaUnidade && c.valorUnit > 0;
    const campos = {
      ultima_compra: c.data || null,
      ...(atualizaCusto ? { preco_custo: c.valorUnit } : {}),
      aviso_compra: atualizaCusto
        ? null
        : c.valorUnit > 0
          ? `Nota ${c.nota} (${dataBR(c.data)}): R$ ${c.valorUnit.toFixed(2).replace(".", ",")}/${c.unidade}, ` +
            `unidade diferente do cadastro (${unidadeCadastro}) — custo não atualizado.`
          : `Nota ${c.nota} (${dataBR(c.data)}) sem valor unitário — custo não atualizado.`,
      atualizado_em: new Date().toISOString(),
      alterado_em: new Date().toISOString(),
    };

    const { error } = reg
      ? await admin.from("precificacao_produtos").update(campos).eq("id", reg.id)
      : await admin.from("precificacao_produtos").insert({
          ...campos,
          conta_id: conta.id,
          id_vhsys: idVhsys,
          produto: prod.descricao.trim(),
          custo_op: padrao.custoOpPadrao,
          comissao: padrao.comissaoPadrao,
          imposto_saida: padrao.impostoSaidaPadrao,
        });
    if (!error) atualizados++;
  }

  await marcar(cursor);
  return `${novas.length} nota(s) nova(s), ${atualizados} produto(s) atualizados`;
}
