// Teste controlado de escrita VHSYS — SERVER-ONLY.
// Cria um pedido com referencia_pedido='TESTE-APAGAR', testa o campo extra
// "situacao" no POST /status, e exclui o registro ao final.
// NUNCA tocar em pedidos/orçamentos reais.
//
// Uso: npx tsx scripts/vhsys-teste-escrita.ts

import { readFileSync } from "node:fs";

// Carrega .env.local usando o mesmo padrão de vhsys-pull-inicial.ts
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=(.*)$/);
  if (!m || process.env[m[1]]) continue;
  let val = m[2].trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  process.env[m[1]] = val;
}

const BASE = process.env.VHSYS_API_BASE ?? "https://api.vhsys.com/v2";
const ACCESS = process.env.VHSYS_ACCESS_TOKEN;
const SECRET = process.env.VHSYS_SECRET_ACCESS_TOKEN;

if (!ACCESS || !SECRET) {
  console.error("ERRO: VHSYS_ACCESS_TOKEN / VHSYS_SECRET_ACCESS_TOKEN ausentes em .env.local");
  process.exit(1);
}

// Tokens lidos — NÃO imprimir.
const HEADERS: Record<string, string> = {
  "access-token": ACCESS,
  "secret-access-token": SECRET,
  "User-Agent": process.env.APP_USER_AGENT ?? "CRM/0.1",
  "Content-Type": "application/json",
  "Cache-Control": "no-cache",
};

async function req(method: string, path: string, body?: object) {
  const res = await fetch(BASE + path, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store" as RequestCache,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

async function main() {
  console.log("=== TESTE CONTROLADO — ESCRITA VHSYS ===");
  console.log("Registro criado com referencia_pedido='TESTE-APAGAR'");
  console.log("Será excluído (lixeira) ao final.\n");

  // ── PASSO 1: Criar pedido de teste ──────────────────────────────────────
  console.log("PASSO 1: Criando pedido TESTE-APAGAR...");
  const res1 = await req("POST", "/pedidos", {
    nome_cliente: "TESTE AUTOMATICO CRM - APAGAR",
    referencia_pedido: "TESTE-APAGAR",
    obs_pedido: "Registro de teste automatico — excluir imediatamente.",
    status_pedido: "Em Aberto",
    estoque_pedido: 0,
    contas_pedido: 0,
  });
  console.log(`  HTTP ${res1.status}, code: ${res1.json?.code}`);

  if (res1.status !== 200 || Number(res1.json?.code) !== 200) {
    console.error("  FALHA na criação do pedido — abortando.");
    console.error("  Resposta:", JSON.stringify(res1.json));
    process.exit(1);
  }

  const dados = Array.isArray(res1.json.data) ? res1.json.data[0] : res1.json.data;
  const idPed: number = dados?.id_ped;
  const idPedidoSeq: number = dados?.id_pedido;
  console.log(`  Pedido criado — id_ped=${idPed}, id_pedido_seq=${idPedidoSeq}\n`);

  if (!idPed) {
    console.error("  id_ped não retornado — abortando.");
    process.exit(1);
  }

  // ── PASSO 2: GET estado inicial ──────────────────────────────────────────
  console.log("PASSO 2: GET /pedidos/" + idPed + " (estado inicial)...");
  const res2 = await req("GET", `/pedidos/${idPed}`);
  const p1 = Array.isArray(res2.json?.data) ? res2.json.data[0] : res2.json?.data;
  console.log(`  situacao=${p1?.situacao}, status_pedido=${p1?.status_pedido}\n`);

  // ── PASSO 3: POST /status com campo extra "situacao" ─────────────────────
  // Testar se a API aceita campo extra "situacao": 1179 (Pagamento Parcial).
  // 1179 mapeia para "Em Aberto" — se o campo for ignorado, situacao fica null/858.
  console.log("PASSO 3: POST /status com tipo_status='Em Aberto' + situacao=1179...");
  const res3 = await req("POST", `/pedidos/${idPed}/status`, {
    data_status: hojeISO(),
    tipo_status: "Em Aberto",
    obs_status: "Teste campo situacao - APAGAR",
    situacao: 1179,
  });
  console.log(`  HTTP ${res3.status}, code: ${res3.json?.code}`);
  console.log(`  Resposta data: ${JSON.stringify(res3.json?.data)}`);

  const res4 = await req("GET", `/pedidos/${idPed}`);
  const p2 = Array.isArray(res4.json?.data) ? res4.json.data[0] : res4.json?.data;
  const situacaoApos3 = p2?.situacao;
  const campoSituacaoAceito = situacaoApos3 === 1179;
  console.log(`  situacao após PASSO 3: ${situacaoApos3}`);
  console.log(`  >> Campo "situacao" no body: ${campoSituacaoAceito ? "ACEITO (mudou para 1179)" : "IGNORADO (situacao=" + situacaoApos3 + ")"}\n`);

  // ── PASSO 4: POST /status com campo alternativo "id_situacao" ────────────
  console.log("PASSO 4: POST /status com tipo_status='Em Andamento' + id_situacao=857...");
  const res5 = await req("POST", `/pedidos/${idPed}/status`, {
    data_status: hojeISO(),
    tipo_status: "Em Andamento",
    obs_status: "Teste campo id_situacao - APAGAR",
    id_situacao: 857,
  });
  console.log(`  HTTP ${res5.status}, code: ${res5.json?.code}`);

  const res6 = await req("GET", `/pedidos/${idPed}`);
  const p3 = Array.isArray(res6.json?.data) ? res6.json.data[0] : res6.json?.data;
  const situacaoApos4 = p3?.situacao;
  const campoIdSituacaoAceito = situacaoApos4 === 857;
  console.log(`  situacao após PASSO 4: ${situacaoApos4}`);
  console.log(`  >> Campo "id_situacao" no body: ${campoIdSituacaoAceito ? "ACEITO (mudou para 857)" : "IGNORADO (situacao=" + situacaoApos4 + ")"}\n`);

  // ── PASSO 5: Excluir pedido de teste (lixeira) ───────────────────────────
  // Guarda de segurança: confirmar via GET que referencia_pedido='TESTE-APAGAR'
  // antes de excluir — nunca apagar um pedido real por acidente.
  console.log("PASSO 5: Verificando referencia_pedido antes de excluir...");
  const resVerif = await req("GET", `/pedidos/${idPed}`);
  const pVerif = Array.isArray(resVerif.json?.data) ? resVerif.json.data[0] : resVerif.json?.data;
  if (!pVerif || pVerif.referencia_pedido !== "TESTE-APAGAR") {
    console.error(`  ABORTAR: referencia_pedido="${pVerif?.referencia_pedido}" — esperado "TESTE-APAGAR". Excluir manualmente se necessário. id_ped=${idPed}`);
    process.exit(1);
  }
  console.log(`  referencia_pedido="${pVerif.referencia_pedido}" — OK para excluir.`);

  console.log("PASSO 5b: DELETE /pedidos/" + idPed + " (envio para lixeira)...");
  const resDel = await req("DELETE", `/pedidos/${idPed}`);
  console.log(`  HTTP ${resDel.status}, code: ${resDel.json?.code}`);
  const excluido = resDel.status === 200 && Number(resDel.json?.code) === 200;
  console.log(`  Resultado: ${excluido ? "OK — registro na lixeira" : "FALHA — " + JSON.stringify(resDel.json)}\n`);

  // ── PASSO 6: Confirmar exclusão ───────────────────────────────────────────
  console.log("PASSO 6: Confirmando exclusão (GET sem lixeira deve falhar)...");
  const resConf = await req("GET", `/pedidos/${idPed}`);
  const foiExcluido =
    resConf.status === 403 ||
    (Array.isArray(resConf.json?.data) && resConf.json.data[0]?.lixeira === "Sim") ||
    (resConf.json?.data && !Array.isArray(resConf.json.data) && (resConf.json.data as Record<string, unknown>)?.lixeira === "Sim");
  console.log(`  GET sem lixeira: HTTP ${resConf.status}`);
  console.log(`  Confirmação lixeira: ${foiExcluido ? "CONFIRMADO" : "INCONCLUSIVO — verificar manualmente"}\n`);

  // ── RESUMO FINAL ─────────────────────────────────────────────────────────
  console.log("=== RESULTADO FINAL ===");
  console.log(`Pedido de teste: id_ped=${idPed}, id_pedido_seq=${idPedidoSeq}`);
  console.log(`Campo "situacao" aceito pela API: ${campoSituacaoAceito}`);
  console.log(`Campo "id_situacao" aceito pela API: ${campoIdSituacaoAceito}`);
  console.log(`Registro excluído (lixeira): ${excluido}`);

  if (campoSituacaoAceito || campoIdSituacaoAceito) {
    console.log("\n>> IMPLICAÇÃO: movimentos entre situações personalizadas (858/1179/1180) são possíveis.");
    console.log("   Remover a restrição de ambiguidade no comentário de fluxo.ts.");
  } else {
    console.log("\n>> IMPLICAÇÃO: API só aceita tipo_status (enum-base). Movimentos entre");
    console.log("   858/1179/1180 são AMBÍGUOS — UI deve restringir ou exibir aviso.");
    console.log("   Atualizar comentário em fluxo.ts com este resultado.");
  }

  if (!excluido) {
    console.error("\nAVISO CRÍTICO: Registro de teste NÃO foi excluído!");
    console.error(`Excluir manualmente no VHSYS: id_ped=${idPed}`);
    process.exit(1);
  }

  console.log("\n=== FIM DO TESTE ===");
}

main().catch((err) => {
  console.error("Erro inesperado:", err instanceof Error ? err.message : err);
  process.exit(1);
});
