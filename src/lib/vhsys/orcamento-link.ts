// Gera o link PÚBLICO do orçamento no VHSYS (preview HTML e PDF) — SERVER-ONLY.
//
// O VHSYS não expõe geração de PDF pela API v2. Porém, a página pública de
// preview do orçamento (usada pelo botão "compartilhar link" da interface web)
// tem um hash que é apenas uma ofuscação REVERSÍVEL e determinística dos ids do
// orçamento — validado empiricamente em 2026-07-09:
//
//   hash = strrev( base64( deflateRaw( "codigo=<id_orcamento>&empresa=<id_empresa>&id_pedido=<numero>" ) ) )
//
//   preview (HTML): https://app.vhsys.com.br/public/preview/orcamento/<hash>/
//   PDF (download):  https://app.vhsys.com.br/public/preview/orcamento/<hash>/download/
//                    → Content-Type application/pdf, filename "orcamento_<numero>.pdf"
//
// Assim conseguimos o DOCUMENTO OFICIAL do VHSYS (idêntico ao do sistema deles),
// sem recriar o PDF, a partir de dados que já temos no espelho:
//   - id_orcamento (PK)  → coluna id_vhsys de vhsys_orcamentos
//   - numero             → coluna numero de vhsys_orcamentos
//   - id_empresa         → accounts.vhsys_empresa_id (por conta)

import { deflateRawSync } from "node:zlib";

const BASE_PREVIEW = "https://app.vhsys.com.br/public/preview/orcamento";

export interface RefOrcamentoVhsys {
  /** id_orcamento (PK do orçamento no VHSYS) = campo `codigo` do link. */
  idOrcamento: number;
  /** id_empresa da conta VHSYS = campo `empresa` do link. */
  empresaId: number;
  /** número sequencial exibível do orçamento = campo `id_pedido` do link. */
  numero: number;
}

/** Ofuscação reversível do VHSYS: strrev(base64(deflateRaw(querystring))). */
function hashOrcamento({ idOrcamento, empresaId, numero }: RefOrcamentoVhsys): string {
  const payload = `codigo=${idOrcamento}&empresa=${empresaId}&id_pedido=${numero}`;
  const b64 = deflateRawSync(payload).toString("base64");
  return b64.split("").reverse().join("");
}

/** URL da página HTML de visualização pública do orçamento. */
export function urlPreviewOrcamento(ref: RefOrcamentoVhsys): string {
  return `${BASE_PREVIEW}/${hashOrcamento(ref)}/`;
}

/** URL de download direto do PDF oficial do orçamento (application/pdf). */
export function urlPdfOrcamento(ref: RefOrcamentoVhsys): string {
  return `${BASE_PREVIEW}/${hashOrcamento(ref)}/download/`;
}
