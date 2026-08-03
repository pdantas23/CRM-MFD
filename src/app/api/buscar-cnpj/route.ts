// GET /api/buscar-cnpj?cnpj=00000000000000
// Consulta dados cadastrais de CNPJ. Autenticado.
//
// Tenta MÚLTIPLAS fontes em sequência (BrasilAPI → CNPJá Open): as APIs
// públicas gratuitas costumam bloquear/limitar IPs de datacenter (Vercel), e
// cada uma bloqueia de um jeito — com o fallback, basta uma responder. Só
// devolve "não encontrado" (404) quando uma fonte responde de fato que o CNPJ
// não existe; rate-limit/instabilidade viram 502 (mensagem de "tente de novo").

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface DadosCnpj {
  razao: string;
  fantasia: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
}

// Resultado por fonte: encontrado (dados) | não existe (404) | falhou (rede/rate-limit).
type ResultadoFonte =
  | { tipo: "ok"; dados: DadosCnpj }
  | { tipo: "nao_existe" }
  | { tipo: "falha"; status?: number };

async function buscar(url: string, mapear: (d: Record<string, unknown>) => DadosCnpj): Promise<ResultadoFonte> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (res.status === 404 || res.status === 400) return { tipo: "nao_existe" };
    if (!res.ok) return { tipo: "falha", status: res.status };
    const d = (await res.json()) as Record<string, unknown>;
    return { tipo: "ok", dados: mapear(d) };
  } catch {
    return { tipo: "falha" };
  } finally {
    clearTimeout(timer);
  }
}

function s(v: unknown): string {
  return v == null ? "" : String(v);
}

function viaBrasilApi(cnpj: string): Promise<ResultadoFonte> {
  const base = process.env.CNPJ_API_BASE ?? "https://brasilapi.com.br/api/cnpj/v1/";
  return buscar(`${base}${cnpj}`, (d) => ({
    razao: s(d.razao_social),
    fantasia: s(d.nome_fantasia),
    cep: s(d.cep),
    endereco: s(d.logradouro),
    numero: s(d.numero),
    bairro: s(d.bairro),
    cidade: s(d.municipio),
    uf: s(d.uf),
    telefone: s(d.ddd_telefone_1),
    email: s(d.email),
  }));
}

function viaCnpjaOpen(cnpj: string): Promise<ResultadoFonte> {
  return buscar(`https://open.cnpja.com/office/${cnpj}`, (d) => {
    const addr = (d.address ?? {}) as Record<string, unknown>;
    const company = (d.company ?? {}) as Record<string, unknown>;
    const tel = (Array.isArray(d.phones) ? d.phones[0] : undefined) as
      | { area?: unknown; number?: unknown }
      | undefined;
    const mail = (Array.isArray(d.emails) ? d.emails[0] : undefined) as
      | { address?: unknown }
      | undefined;
    return {
      razao: s(company.name),
      fantasia: s(d.alias),
      cep: s(addr.zip),
      endereco: s(addr.street),
      numero: s(addr.number),
      bairro: s(addr.district),
      cidade: s(addr.city),
      uf: s(addr.state),
      telefone: tel?.area && tel?.number ? `(${s(tel.area)}) ${s(tel.number)}` : "",
      email: s(mail?.address),
    };
  });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const cnpj = (req.nextUrl.searchParams.get("cnpj") ?? "").replace(/\D/g, "");
  if (cnpj.length !== 14) {
    return NextResponse.json({ erro: "CNPJ deve ter 14 dígitos." }, { status: 400 });
  }

  const fontes: Array<[string, (c: string) => Promise<ResultadoFonte>]> = [
    ["brasilapi", viaBrasilApi],
    ["cnpja", viaCnpjaOpen],
  ];

  let algumFalhou = false;
  for (const [nome, fn] of fontes) {
    const r = await fn(cnpj);
    if (r.tipo === "ok") return NextResponse.json(r.dados);
    if (r.tipo === "nao_existe") continue; // tenta a próxima; pode existir em outra base
    algumFalhou = true;
    console.warn(`[buscar-cnpj] fonte=${nome} falhou status=${r.status ?? "rede"}`);
  }

  // Nenhuma fonte trouxe dados. Distingue "não existe" de "serviço indisponível".
  return algumFalhou
    ? NextResponse.json(
        { erro: "Serviço de consulta indisponível no momento. Tente novamente." },
        { status: 502 }
      )
    : NextResponse.json({ erro: "CNPJ não encontrado." }, { status: 404 });
}
