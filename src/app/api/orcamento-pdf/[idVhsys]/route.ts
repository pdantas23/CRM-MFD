// GET /api/orcamento-pdf/[idVhsys]
// Serve INLINE o PDF OFICIAL do orçamento gerado pelo VHSYS (preview em aba).
//
// O VHSYS não expõe geração de PDF pela API v2, mas a página pública de preview
// do orçamento tem download direto do PDF; o hash da URL é uma ofuscação
// determinística dos ids (ver lib/vhsys/orcamento-link.ts). Aqui resolvemos o
// orçamento no espelho (com RLS — a sessão determina o que pode ver), buscamos o
// PDF no VHSYS e o repassamos com Content-Disposition: inline — assim o navegador
// abre o preview numa aba em vez de baixar (o /download/ do VHSYS vem como
// attachment). O algoritmo fica fora do cliente e o acesso é autenticado.
// Segue o padrão de /api/orcamento-completo/[idVhsys]/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getContaAtiva } from "@/lib/accounts/contexto";
import { garantirIdEmpresa } from "@/lib/vhsys/empresa";
import { urlPdfOrcamento } from "@/lib/vhsys/orcamento-link";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { idVhsys: string } }
) {
  const idVhsys = parseInt(params.idVhsys, 10);
  if (!Number.isInteger(idVhsys) || idVhsys <= 0) {
    return NextResponse.json({ erro: "idVhsys inválido." }, { status: 400 });
  }

  // Consulta com RLS ativo — a sessão do usuário determina o que pode ver.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const conta = await getContaAtiva();
  const { data: orc, error } = await supabase
    .from("vhsys_orcamentos")
    .select("numero")
    .eq("conta_id", conta.id)
    .eq("id_vhsys", idVhsys)
    .single();

  if (error || !orc) {
    return NextResponse.json({ erro: "Orçamento não encontrado." }, { status: 404 });
  }

  const numero = (orc as { numero: number | null }).numero;
  if (!numero) {
    return NextResponse.json({ erro: "Orçamento sem número." }, { status: 422 });
  }

  const empresaId = await garantirIdEmpresa({
    id: conta.id,
    tokens: {
      accessToken: conta.tokens.accessToken,
      secretToken: conta.tokens.secretToken,
      apiBase: conta.apiBase,
    },
  });
  if (!empresaId) {
    return NextResponse.json(
      { erro: "Não foi possível resolver a empresa VHSYS da conta." },
      { status: 502 }
    );
  }

  const url = urlPdfOrcamento({ idOrcamento: idVhsys, empresaId, numero });

  // Proxy do PDF (em vez de redirect) para servi-lo INLINE. UA de navegador
  // porque o app.vhsys.com.br (Cloudflare) rejeita clientes sem User-Agent.
  let pdfResp: Response;
  try {
    pdfResp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ erro: "Falha ao contatar o VHSYS." }, { status: 502 });
  }
  if (!pdfResp.ok || !pdfResp.body) {
    return NextResponse.json({ erro: "Falha ao obter o PDF no VHSYS." }, { status: 502 });
  }

  // ?dl=1 → força o download (attachment); sem o param → inline (preview em aba
  // / dentro do iframe da página /orcamento-pdf/[idVhsys]).
  const dl = req.nextUrl.searchParams.get("dl") === "1";
  return new NextResponse(pdfResp.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${dl ? "attachment" : "inline"}; filename="orcamento_${numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
