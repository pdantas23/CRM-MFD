"use client";
// Modal de detalhe da entrega: dados da entrega, ORÇAMENTO atrelado (cabeçalho,
// itens e valores) e gestão de múltiplos anexos (upload/remoção só admin).
//
// A entrega é identificada pelo NÚMERO DO ORÇAMENTO. O orçamento é resolvido
// automaticamente: por orcamento_id (vínculo gravado) ou, na ausência dele,
// pelo numero_orcamento textual. Anexos = anexo legado + entrega_anexos.

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, AtrasadaBadge, EntregueBadge, ehAtrasada } from "@/components/ui/Badge";
import { formatBRL, formatarData } from "@/lib/format";
import {
  vincularEntregaOrcamento,
  marcarEntregaEntregue,
  desmarcarEntregaEntregue,
} from "@/lib/entregas/acoes";
import { hojeISOSaoPaulo } from "@/lib/entregas/hoje";
import type { Entrega, EntregaAnexo } from "@/lib/types/database";

interface ItemApi {
  id_ped_produto: number;
  desc_produto: string;
  qtde_produto: string;
  valor_unit_produto: string;
  desconto_produto?: number;
}

interface ItemExibido {
  id_ped_produto: number;
  desc_produto: string;
  qtde: number;
  valor_unit: number;
  desconto: number;
}

interface OrcamentoVinculo {
  id_vhsys: number;
  numero: number;
  nome_cliente: string;
  vendedor_nome: string | null;
  valor_total: number | null;
  data_orcamento: string | null;
  validade: string | null;
  referencia: string | null;
  obs: string | null;
}

interface Props {
  entrega: Entrega;
  isAdmin: boolean;
  onClose: () => void;
  /** Chamado após upload/remoção de anexo para o pai dar router.refresh(). */
  onChanged?: () => void;
}

const COLS_ORC =
  "id_vhsys, numero, nome_cliente, vendedor_nome, valor_total, data_orcamento, validade, referencia, obs";

function pathDoBucket(url: string): string | null {
  const partes = url.split(`/anexos-entregas/`);
  return partes[1] ?? null;
}

function totalItem(i: ItemExibido): number {
  return i.qtde * i.valor_unit * (1 - i.desconto / 100);
}

export function EntregaModal({ entrega, isAdmin, onClose, onChanged }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  // Anexo legado (coluna em entregas) — removível, mas não recriável.
  const [legado, setLegado] = useState<{ url: string; nome: string } | null>(
    entrega.anexo_url ? { url: entrega.anexo_url, nome: entrega.anexo_nome ?? "Anexo" } : null
  );
  const [anexos, setAnexos] = useState<EntregaAnexo[] | null>(null);

  // Vínculo gravado (orcamento_id) ou resolução automática pelo numero_orcamento.
  const [orcId, setOrcId] = useState<string | null>(entrega.orcamento_id);
  const numeroTextual = Number(entrega.numero_orcamento) || null;
  const [orcamento, setOrcamento] = useState<OrcamentoVinculo | null>(null);
  const [carregandoOrc, setCarregandoOrc] = useState(
    Boolean(entrega.orcamento_id) || Boolean(numeroTextual)
  );
  const [itens, setItens] = useState<ItemExibido[] | null>(null);
  const [carregandoItens, setCarregandoItens] = useState(false);

  // Vínculo retroativo (entregas sem orçamento resolvido) — só admin.
  const [termoVinc, setTermoVinc] = useState(entrega.numero_orcamento || "");
  const [vinculando, setVinculando] = useState(false);
  const [erroVinc, setErroVinc] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Baixa de entrega (estado "entregue") — só admin.
  const entregue = Boolean(entrega.entregue_em);
  const atrasada = ehAtrasada(entrega, hojeISOSaoPaulo());
  const [pendingBaixa, startBaixa] = useTransition();
  const [avisoBaixa, setAvisoBaixa] = useState<string | null>(null);

  function marcarEntregue() {
    setAvisoBaixa(null);
    startBaixa(async () => {
      const res = await marcarEntregaEntregue(entrega.id);
      if (!res.ok) setAvisoBaixa(res.erro);
      else if (res.aviso) setAvisoBaixa(res.aviso);
      onChanged?.();
      onClose();
    });
  }

  function desmarcarEntregue() {
    setAvisoBaixa(null);
    startBaixa(async () => {
      const res = await desmarcarEntregaEntregue(entrega.id);
      if (!res.ok && res.erro) {
        setAvisoBaixa(res.erro);
        return;
      }
      onChanged?.();
      onClose();
    });
  }

  // Carrega anexos ao abrir.
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("entrega_anexos")
      .select("*")
      .eq("entrega_id", entrega.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setAnexos((data ?? []) as EntregaAnexo[]));
  }, [entrega.id]);

  // Resolve o orçamento (por orcamento_id ou pelo número) e carrega os itens.
  useEffect(() => {
    if (!orcId && !numeroTextual) {
      setCarregandoOrc(false);
      return;
    }
    setCarregandoOrc(true);
    const supabase = createClient();
    let cancelado = false;

    (async () => {
      const consulta = orcId
        ? supabase.from("vhsys_orcamentos").select(COLS_ORC).eq("id", orcId).maybeSingle()
        : supabase
            .from("vhsys_orcamentos")
            .select(COLS_ORC)
            .eq("numero", numeroTextual as number)
            .eq("lixeira", false)
            .limit(1)
            .maybeSingle();

      const { data } = await consulta;
      if (cancelado) return;
      setCarregandoOrc(false);
      if (!data) return;
      const orc = data as OrcamentoVinculo;
      setOrcamento(orc);

      setCarregandoItens(true);
      fetch(`/api/orcamento-itens/${orc.id_vhsys}`)
        .then((r) => r.json())
        .then((linhas: ItemApi[]) => {
          if (cancelado) return;
          setItens(
            (Array.isArray(linhas) ? linhas : []).map((i) => ({
              id_ped_produto: i.id_ped_produto,
              desc_produto: i.desc_produto,
              qtde: Number(i.qtde_produto),
              valor_unit: Number(i.valor_unit_produto),
              desconto: Number(i.desconto_produto ?? 0),
            }))
          );
        })
        .catch(() => {
          if (!cancelado) setItens([]);
        })
        .finally(() => {
          if (!cancelado) setCarregandoItens(false);
        });
    })();

    return () => {
      cancelado = true;
    };
    // numeroTextual deriva de entrega (estável); orcId muda no vínculo retroativo.
  }, [orcId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function vincularOrcamento() {
    const termo = termoVinc.trim();
    if (!termo) return;
    const numero = Number(termo);
    if (!Number.isInteger(numero) || numero <= 0) {
      setErroVinc("Informe um número de orçamento válido.");
      return;
    }
    setVinculando(true);
    setErroVinc(null);
    try {
      const res = await vincularEntregaOrcamento(entrega.id, numero);
      if (!res.ok) {
        setErroVinc(res.erro);
        return;
      }
      setOrcId(res.orcamentoId); // dispara o carregamento dos dados/itens
      onChanged?.();
    } catch (err) {
      setErroVinc(err instanceof Error ? err.message : "Erro ao vincular orçamento.");
    } finally {
      setVinculando(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    if (arquivos.length === 0) return;

    setEnviando(true);
    setErro(null);
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const novos: EntregaAnexo[] = [];
      for (const file of arquivos) {
        const ext = file.name.split(".").pop();
        const path = `${entrega.id}/${Date.now()}-${novos.length}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("anexos-entregas")
          .upload(path, file, { upsert: true });
        if (upErr) throw new Error("Falha ao fazer upload do anexo.");

        const { data: pub } = supabase.storage
          .from("anexos-entregas")
          .getPublicUrl(path);

        const { data: inserido, error: insErr } = await supabase
          .from("entrega_anexos")
          .insert({
            entrega_id: entrega.id,
            url: pub.publicUrl,
            nome: file.name,
            created_by: user.id,
          })
          .select()
          .single();
        if (insErr) throw insErr;
        novos.push(inserido as EntregaAnexo);
      }

      setAnexos((prev) => [...(prev ?? []), ...novos]);
      onChanged?.();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar anexo.");
    } finally {
      setEnviando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removerAnexo(anexo: EntregaAnexo) {
    setRemovendoId(anexo.id);
    setErro(null);
    const supabase = createClient();
    try {
      const path = pathDoBucket(anexo.url);
      if (path) await supabase.storage.from("anexos-entregas").remove([path]);
      const { error } = await supabase
        .from("entrega_anexos")
        .delete()
        .eq("id", anexo.id);
      if (error) throw error;
      setAnexos((prev) => (prev ?? []).filter((a) => a.id !== anexo.id));
      onChanged?.();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover anexo.");
    } finally {
      setRemovendoId(null);
    }
  }

  async function removerLegado() {
    if (!legado) return;
    setRemovendoId("__legado__");
    setErro(null);
    const supabase = createClient();
    try {
      const path = pathDoBucket(legado.url);
      if (path) await supabase.storage.from("anexos-entregas").remove([path]);
      const { error } = await supabase
        .from("entregas")
        .update({ anexo_url: null, anexo_nome: null })
        .eq("id", entrega.id);
      if (error) throw error;
      setLegado(null);
      onChanged?.();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover anexo.");
    } finally {
      setRemovendoId(null);
    }
  }

  const itensLista = itens ?? [];
  const totalCalculado = itensLista.reduce((s, i) => s + totalItem(i), 0);
  const temDesconto = itensLista.some((i) => i.desconto > 0);
  const qtdItens = itensLista.length;
  const semAnexos = !legado && (anexos?.length ?? 0) === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">
              {entrega.nome_cliente}
            </h2>
            <p className="text-sm text-gray-500">
              Entrega · {formatarData(entrega.data)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={entrega.status} />
            {entregue ? <EntregueBadge /> : atrasada ? <AtrasadaBadge /> : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* ── Dados da entrega ─────────────────────────────────── */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Dados da entrega
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Campo label="CPF / CNPJ" valor={entrega.cpf_cnpj} />
              <Campo label="Nº Orçamento" valor={entrega.numero_orcamento} />
              <Campo label="Bairro" valor={entrega.bairro} />
              <Campo label="Endereço" valor={entrega.endereco} full />
            </dl>
          </section>

          {/* ── Orçamento atrelado ───────────────────────────────── */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Orçamento
            </h3>

            {carregandoOrc ? (
              <div className="h-28 animate-pulse rounded-lg bg-gray-100" />
            ) : orcamento ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                {/* Cabeçalho do orçamento */}
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Orçamento #{orcamento.numero}
                    </p>
                    {orcamento.vendedor_nome && (
                      <p className="text-xs text-gray-500">
                        Vendedor: {orcamento.vendedor_nome}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Valor total</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatBRL(Number(orcamento.valor_total ?? 0))}
                    </p>
                  </div>
                </div>

                {/* Metadados do orçamento */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-gray-100 px-4 py-3 text-sm sm:grid-cols-3">
                  <Campo
                    label="Data"
                    valor={orcamento.data_orcamento ? formatarData(orcamento.data_orcamento) : "—"}
                  />
                  <Campo
                    label="Validade"
                    valor={orcamento.validade ? formatarData(orcamento.validade) : "—"}
                  />
                  <Campo label="Itens" valor={carregandoItens ? "…" : String(qtdItens)} />
                  {orcamento.referencia && (
                    <Campo label="Referência" valor={orcamento.referencia} />
                  )}
                  {orcamento.obs && <Campo label="Observação" valor={orcamento.obs} full />}
                </dl>

                {/* Itens */}
                <div className="px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Produtos do orçamento
                  </p>
                  {carregandoItens ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-5 animate-pulse rounded bg-gray-100" />
                      ))}
                    </div>
                  ) : qtdItens === 0 ? (
                    <p className="text-sm text-gray-400">Sem itens cadastrados.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-gray-400">
                            <th className="pb-1.5 text-left font-medium">Produto</th>
                            <th className="w-12 pb-1.5 text-right font-medium">Qtde</th>
                            <th className="w-24 pb-1.5 text-right font-medium">Unitário</th>
                            {temDesconto && (
                              <th className="w-14 pb-1.5 text-right font-medium">Desc.</th>
                            )}
                            <th className="w-24 pb-1.5 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itensLista.map((item) => (
                            <tr key={item.id_ped_produto} className="border-b last:border-0">
                              <td className="py-1.5 pr-2 text-gray-800">{item.desc_produto}</td>
                              <td className="py-1.5 text-right text-gray-700">{item.qtde}</td>
                              <td className="py-1.5 text-right text-gray-700">
                                {formatBRL(item.valor_unit)}
                              </td>
                              {temDesconto && (
                                <td className="py-1.5 text-right text-gray-500">
                                  {item.desconto > 0 ? `${item.desconto}%` : "—"}
                                </td>
                              )}
                              <td className="py-1.5 text-right font-medium text-gray-900">
                                {formatBRL(totalItem(item))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td
                              colSpan={temDesconto ? 4 : 3}
                              className="pt-2 text-right text-xs font-medium uppercase tracking-wider text-gray-400"
                            >
                              Total calculado
                            </td>
                            <td className="pt-2 text-right text-sm font-bold text-gray-900">
                              {formatBRL(totalCalculado)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : isAdmin ? (
              // Não resolveu o orçamento: admin pode vincular pelo número.
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <label className="mb-1.5 block text-sm font-medium text-blue-900">
                  Vincular pelo número do orçamento
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={termoVinc}
                    onChange={(e) => setTermoVinc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        vincularOrcamento();
                      }
                    }}
                    className="input-base flex-1"
                    placeholder="Número do orçamento"
                  />
                  <button
                    type="button"
                    onClick={vincularOrcamento}
                    disabled={vinculando || !termoVinc.trim()}
                    className="btn-secondary shrink-0 disabled:opacity-60"
                  >
                    {vinculando ? "Vinculando…" : "Vincular"}
                  </button>
                </div>
                {erroVinc && <p className="mt-2 text-xs text-red-600">{erroVinc}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Orçamento não vinculado.</p>
            )}
          </section>

          {/* ── Anexos ───────────────────────────────────────────── */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Anexos
            </h3>

            {erro && (
              <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {erro}
              </p>
            )}

            {anexos === null ? (
              <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <ul className="space-y-2">
                {legado && (
                  <LinhaAnexo
                    nome={legado.nome}
                    url={legado.url}
                    isAdmin={isAdmin}
                    removendo={removendoId === "__legado__"}
                    onRemover={removerLegado}
                  />
                )}
                {anexos.map((a) => (
                  <LinhaAnexo
                    key={a.id}
                    nome={a.nome}
                    url={a.url}
                    isAdmin={isAdmin}
                    removendo={removendoId === a.id}
                    onRemover={() => removerAnexo(a)}
                  />
                ))}
                {semAnexos && (
                  <li className="text-sm text-gray-400">Nenhum anexo.</li>
                )}
              </ul>
            )}

            {isAdmin && (
              <div className="mt-3">
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => fileRef.current?.click()}
                  className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {enviando ? "Enviando…" : "Adicionar anexos"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                />
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4">
          {avisoBaixa && (
            <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {avisoBaixa}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-500">
              {entregue && entrega.entregue_em && (
                <span>Entregue em {formatarData(entrega.entregue_em.slice(0, 10))}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isAdmin &&
                (entregue ? (
                  <button
                    type="button"
                    onClick={desmarcarEntregue}
                    disabled={pendingBaixa}
                    className="btn-secondary disabled:opacity-60"
                  >
                    {pendingBaixa ? "Desmarcando…" : "Desmarcar"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={marcarEntregue}
                    disabled={pendingBaixa}
                    className="btn-primary disabled:opacity-60"
                  >
                    {pendingBaixa ? "Marcando…" : "Marcar como entregue"}
                  </button>
                ))}
              <button type="button" onClick={onClose} className="btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({
  label,
  valor,
  full,
}: {
  label: string;
  valor: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2 sm:col-span-3" : undefined}>
      <dt className="text-xs uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{valor || "—"}</dd>
    </div>
  );
}

function LinhaAnexo({
  nome,
  url,
  isAdmin,
  removendo,
  onRemover,
}: {
  nome: string;
  url: string;
  isAdmin: boolean;
  removendo: boolean;
  onRemover: () => void;
}) {
  return (
    <li className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 items-center gap-2 text-sm text-blue-600 hover:underline"
      >
        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        <span className="truncate">{nome}</span>
      </a>
      {isAdmin && (
        <button
          type="button"
          disabled={removendo}
          onClick={onRemover}
          className="ml-3 shrink-0 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {removendo ? "Removendo…" : "Remover"}
        </button>
      )}
    </li>
  );
}
