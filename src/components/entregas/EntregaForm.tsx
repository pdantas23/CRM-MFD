"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/Spinner";
import { Select } from "@/components/ui/Select";
import { buscarOrcamentoParaEntrega, criarEntregaDeOrcamento } from "@/lib/entregas/acoes";
import { formatBRL } from "@/lib/format";
import type { Entrega, EntregaFormData, Periodo, StatusEntrega } from "@/lib/types/database";

interface ItemApi {
  id_ped_produto: number;
  desc_produto: string;
  qtde_produto: string;
  valor_unit_produto: string;
  desconto_produto?: number;
}

interface ItemPreview {
  id_ped_produto: number;
  desc_produto: string;
  qtde: number;
  valor_unit: number;
  desconto: number;
}

// Pré-preenchimento opcional dos dados do cliente (ex.: vindo da aba Pedidos
// por query params). Campos ausentes continuam vazios; nada muda sem prefill.
export interface EntregaPrefill {
  nome_cliente?: string;
  cpf_cnpj?: string;
  numero_orcamento?: string;
  bairro?: string;
  endereco?: string;
  /** UUID do registro em vhsys_pedidos (FK da tabela entregas). */
  pedido_id?: string;
  /** id_vhsys (número inteiro) do pedido — usado para chamar a API VHSYS. */
  pedido_id_vhsys?: number;
  /** Número do orçamento de origem, resolvido a partir do pedido (card → entrega).
   *  Quando presente, o form busca/vincula o orçamento automaticamente. */
  orcamento_numero?: number;
}

interface EntregaFormProps {
  entrega?: Entrega;
  mode: "create" | "edit";
  prefill?: EntregaPrefill;
}

const periodoOptions = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

const statusOptions = [
  { value: "entrega_final", label: "Entrega Final" },
  { value: "entrega_parcial", label: "Entrega Parcial" },
];

function getTodayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Mantém só os dígitos e aplica máscara de CPF (até 11) ou CNPJ (até 14).
function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function cpfCnpjDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

export function EntregaForm({ entrega, mode, prefill }: EntregaFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isCanceling, startCancelTransition] = useTransition();

  const [form, setForm] = useState<EntregaFormData>({
    data: entrega?.data ?? getTodayISO(),
    periodo: entrega?.periodo ?? "manha",
    status: entrega?.status ?? "entrega_final",
    nome_cliente: entrega?.nome_cliente ?? prefill?.nome_cliente ?? "",
    cpf_cnpj: formatCpfCnpj(entrega?.cpf_cnpj ?? prefill?.cpf_cnpj ?? ""),
    numero_orcamento: entrega?.numero_orcamento ?? prefill?.numero_orcamento ?? "",
    bairro: entrega?.bairro ?? prefill?.bairro ?? "",
    endereco: entrega?.endereco ?? prefill?.endereco ?? "",
    anexo: null,
  });

  const [existingAnexo, setExistingAnexo] = useState<{
    url: string | null;
    nome: string | null;
  }>({
    url: entrega?.anexo_url ?? null,
    nome: entrega?.anexo_nome ?? null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  // Aviso discreto: falha ao mover situação VHSYS não reverte a entrega
  const [avisoVhsys, setAvisoVhsys] = useState<string | null>(null);

  // Vínculo obrigatório com ORÇAMENTO (fluxo "puxar de um orçamento"), só no
  // create. O orçamento precisa já ter virado pedido (pedido_emitido).
  const [orcamentoVinc, setOrcamentoVinc] = useState<{ numero: number } | null>(null);
  const [termoOrc, setTermoOrc] = useState("");
  const [buscandoOrc, setBuscandoOrc] = useState(false);
  const [avisoOrc, setAvisoOrc] = useState<
    { tipo: "ok" | "erro"; msg: string } | null
  >(null);
  const [itensOrc, setItensOrc] = useState<ItemPreview[] | null>(null);
  const [carregandoItens, setCarregandoItens] = useState(false);

  function carregarItensOrcamento(idVhsys: number) {
    setCarregandoItens(true);
    setItensOrc(null);
    fetch(`/api/orcamento-itens/${idVhsys}`)
      .then((r) => r.json())
      .then((linhas: ItemApi[]) => {
        setItensOrc(
          (Array.isArray(linhas) ? linhas : []).map((i) => ({
            id_ped_produto: i.id_ped_produto,
            desc_produto: i.desc_produto,
            qtde: Number(i.qtde_produto),
            valor_unit: Number(i.valor_unit_produto),
            desconto: Number(i.desconto_produto ?? 0),
          }))
        );
      })
      .catch(() => setItensOrc([]))
      .finally(() => setCarregandoItens(false));
  }

  async function buscarOrcamento(numeroArg?: number) {
    const numero = numeroArg ?? Number(termoOrc.trim());
    if (!Number.isInteger(numero) || numero <= 0) {
      setAvisoOrc({ tipo: "erro", msg: "Informe um número de orçamento válido." });
      return;
    }

    setBuscandoOrc(true);
    setAvisoOrc(null);
    setOrcamentoVinc(null);
    setItensOrc(null);
    try {
      const res = await buscarOrcamentoParaEntrega(numero);
      if (!res.ok) {
        setAvisoOrc({ tipo: "erro", msg: res.erro });
        return;
      }
      const { orcamento } = res;
      if (!orcamento.emitido) {
        setAvisoOrc({
          tipo: "erro",
          msg: `Orçamento #${orcamento.numero} ainda não virou pedido — não permite cadastrar entrega.`,
        });
        return;
      }

      setOrcamentoVinc({ numero: orcamento.numero });
      setForm((prev) => ({
        ...prev,
        nome_cliente: orcamento.nome_cliente ?? prev.nome_cliente,
        numero_orcamento: String(orcamento.numero),
        cpf_cnpj: orcamento.cpf_cnpj ? formatCpfCnpj(orcamento.cpf_cnpj) : prev.cpf_cnpj,
        bairro: orcamento.bairro ?? prev.bairro,
        endereco: orcamento.endereco ?? prev.endereco,
      }));
      setAvisoOrc({
        tipo: "ok",
        msg: `Orçamento #${orcamento.numero} vinculado e dados preenchidos.`,
      });
      carregarItensOrcamento(orcamento.idVhsys);
    } catch {
      setAvisoOrc({ tipo: "erro", msg: "Erro ao buscar orçamento." });
    } finally {
      setBuscandoOrc(false);
    }
  }

  // Fluxo card → entrega: o orçamento de origem já vem resolvido do pedido;
  // busca e vincula automaticamente ao abrir.
  useEffect(() => {
    const num = prefill?.orcamento_numero;
    if (mode === "create" && num) {
      setTermoOrc(String(num));
      buscarOrcamento(num);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCpfCnpj(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, cpf_cnpj: formatCpfCnpj(e.target.value) }));
  }

  const cpfCnpjLen = cpfCnpjDigits(form.cpf_cnpj);
  const cpfCnpjTipo = cpfCnpjLen <= 11 ? "CPF" : "CNPJ";
  const cpfCnpjValid = cpfCnpjLen === 11 || cpfCnpjLen === 14;
  const cpfCnpjShowError = cpfCnpjLen > 0 && !cpfCnpjValid;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, anexo: file }));
  }

  async function uploadAnexo(
    file: File,
    entregaId: string
  ): Promise<{ url: string; nome: string }> {
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${entregaId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("anexos-entregas")
      .upload(path, file, { upsert: true });

    if (error) throw new Error("Falha ao fazer upload do anexo.");

    const { data } = supabase.storage
      .from("anexos-entregas")
      .getPublicUrl(path);

    return { url: data.publicUrl, nome: file.name };
  }

  async function removeExistingAnexo(entregaId: string) {
    if (!existingAnexo.url) return;
    setRemoving(true);
    const supabase = createClient();

    const urlParts = existingAnexo.url.split(`/anexos-entregas/`);
    if (urlParts[1]) {
      await supabase.storage.from("anexos-entregas").remove([urlParts[1]]);
    }

    await supabase
      .from("entregas")
      .update({ anexo_url: null, anexo_nome: null })
      .eq("id", entregaId);

    setExistingAnexo({ url: null, nome: null });
    setRemoving(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!cpfCnpjValid) {
      setError("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
      return;
    }

    setLoading(true);
    setError(null);
    setAvisoVhsys(null);

    try {
      const supabase = createClient();

      if (mode === "create") {
        if (!orcamentoVinc) {
          setError("Vincule um orçamento (já emitido como pedido) antes de cadastrar.");
          setLoading(false);
          return;
        }

        // Server Action valida admin + orçamento emitido, insere a entrega
        // vinculada (orcamento_id) e invalida o cache da lista.
        const res = await criarEntregaDeOrcamento(
          {
            data: form.data,
            periodo: form.periodo as Periodo,
            status: form.status as StatusEntrega,
            nome_cliente: form.nome_cliente,
            cpf_cnpj: form.cpf_cnpj,
            numero_orcamento: form.numero_orcamento,
            bairro: form.bairro,
            endereco: form.endereco,
          },
          orcamentoVinc.numero
        );

        if (!res.ok) {
          setError(res.erro);
          setLoading(false);
          return;
        }

        if (form.anexo) {
          const { url, nome } = await uploadAnexo(form.anexo, res.entregaId);
          await supabase
            .from("entregas")
            .update({ anexo_url: url, anexo_nome: nome })
            .eq("id", res.entregaId);
        }

        router.push("/entregas");
        router.refresh();
      } else if (mode === "edit" && entrega) {
        const updatePayload = {
          data: form.data,
          periodo: form.periodo as Periodo,
          status: form.status as StatusEntrega,
          nome_cliente: form.nome_cliente,
          cpf_cnpj: form.cpf_cnpj,
          numero_orcamento: form.numero_orcamento,
          bairro: form.bairro,
          endereco: form.endereco,
        };

        const { error: updateError } = await supabase
          .from("entregas")
          .update(updatePayload)
          .eq("id", entrega.id);

        if (updateError) throw updateError;

        if (form.anexo) {
          const { url, nome } = await uploadAnexo(form.anexo, entrega.id);
          await supabase
            .from("entregas")
            .update({ anexo_url: url, anexo_nome: nome })
            .eq("id", entrega.id);
        }

        router.push(`/entregas/${entrega.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar entrega.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {/* Aviso discreto: falha na atualização do VHSYS não reverte a entrega.
          Permanecemos na página para o aviso ser visto; botão para navegar manualmente. */}
      {avisoVhsys && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>{avisoVhsys}</p>
          <button
            type="button"
            onClick={() => startCancelTransition(() => { router.push("/entregas"); })}
            disabled={isCanceling}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium underline hover:no-underline disabled:opacity-60"
          >
            {isCanceling && <Spinner className="h-3 w-3" />}
            {isCanceling ? "Indo…" : "Ir para entregas"}
          </button>
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Dados da Entrega
        </h2>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Data <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="data"
              required
              value={form.data}
              onChange={handleChange}
              className="input-base"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Período <span className="text-red-500">*</span>
            </label>
            <Select
              options={periodoOptions}
              value={form.periodo}
              onChange={(v) => setForm((p) => ({ ...p, periodo: v as Periodo }))}
              ariaLabel="Período"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>
            <Select
              options={statusOptions}
              value={form.status}
              onChange={(v) => setForm((p) => ({ ...p, status: v as StatusEntrega }))}
              ariaLabel="Status"
            />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Dados do Cliente
        </h2>
        <div className="space-y-5">
          {mode === "create" && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <label className="mb-1.5 block text-sm font-medium text-blue-900">
                Puxar de um orçamento <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-blue-800/80">
                Informe o número do orçamento. Ele precisa já ter virado pedido
                para gerar a entrega.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={termoOrc}
                  onChange={(e) => {
                    setTermoOrc(e.target.value);
                    setOrcamentoVinc(null);
                    setItensOrc(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      buscarOrcamento();
                    }
                  }}
                  className="input-base flex-1"
                  placeholder="Número do orçamento"
                />
                <button
                  type="button"
                  onClick={() => buscarOrcamento()}
                  disabled={buscandoOrc || !termoOrc.trim()}
                  className="btn-secondary shrink-0 disabled:opacity-60"
                >
                  {buscandoOrc ? "Buscando…" : "Buscar"}
                </button>
              </div>
              {avisoOrc && (
                <p
                  className={`mt-2 text-xs ${
                    avisoOrc.tipo === "ok" ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {avisoOrc.msg}
                </p>
              )}

              {/* Preview dos produtos do orçamento. */}
              {orcamentoVinc && (carregandoItens || itensOrc) && (
                <div className="mt-3 rounded-md border border-blue-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Produtos do orçamento
                  </p>
                  {carregandoItens ? (
                    <div className="space-y-2">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="h-4 animate-pulse rounded bg-gray-100" />
                      ))}
                    </div>
                  ) : (itensOrc?.length ?? 0) === 0 ? (
                    <p className="text-xs text-gray-400">
                      Nenhum produto encontrado para este orçamento.
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-gray-400">
                          <th className="pb-1 text-left font-medium">Produto</th>
                          <th className="w-10 pb-1 text-right font-medium">Qtd</th>
                          <th className="w-20 pb-1 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensOrc!.map((item) => (
                          <tr key={item.id_ped_produto} className="border-b last:border-0">
                            <td className="py-1 pr-2 text-gray-800">{item.desc_produto}</td>
                            <td className="py-1 text-right text-gray-700">{item.qtde}</td>
                            <td className="py-1 text-right font-medium text-gray-900">
                              {formatBRL(
                                item.qtde * item.valor_unit * (1 - item.desconto / 100)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nome do Cliente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nome_cliente"
              required
              value={form.nome_cliente}
              onChange={handleChange}
              className="input-base"
              placeholder="Nome completo ou razão social"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              CPF / CNPJ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cpf_cnpj"
              inputMode="numeric"
              required
              maxLength={18}
              value={form.cpf_cnpj}
              onChange={handleCpfCnpj}
              aria-invalid={cpfCnpjShowError}
              className={`input-base ${
                cpfCnpjShowError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                  : ""
              }`}
              placeholder="000.000.000-00"
            />
            <p
              className={`mt-1 text-xs ${
                cpfCnpjShowError
                  ? "text-red-600"
                  : cpfCnpjValid
                  ? "text-green-600"
                  : "text-gray-500"
              }`}
            >
              {cpfCnpjLen === 0
                ? "Digite o CPF (11 dígitos) ou CNPJ (14 dígitos)."
                : cpfCnpjValid
                ? `${cpfCnpjTipo} válido (${cpfCnpjLen} dígitos).`
                : `${cpfCnpjTipo} incompleto — ${cpfCnpjLen}/${
                    cpfCnpjLen <= 11 ? 11 : 14
                  } dígitos.`}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nº Orçamento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="numero_orcamento"
              required
              value={form.numero_orcamento}
              onChange={handleChange}
              className="input-base"
              placeholder="Preenchido ao puxar o orçamento"
            />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Endereço de Entrega
        </h2>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Bairro <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="bairro"
              required
              value={form.bairro}
              onChange={handleChange}
              className="input-base"
              placeholder="Nome do bairro"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Endereço Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="endereco"
              required
              value={form.endereco}
              onChange={handleChange}
              className="input-base"
              placeholder="Rua, número, complemento"
            />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Anexo
        </h2>

        {existingAnexo.nome && mode === "edit" && entrega && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              <a
                href={existingAnexo.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {existingAnexo.nome}
              </a>
            </div>
            <button
              type="button"
              disabled={removing}
              onClick={() => removeExistingAnexo(entrega.id)}
              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {removing ? "Removendo..." : "Remover"}
            </button>
          </div>
        )}

        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50"
        >
          <svg
            className="mb-3 h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm font-medium text-gray-700">
            {form.anexo
              ? form.anexo.name
              : "Clique para selecionar um arquivo"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            PDF, imagens ou documentos
          </p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleFile}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 pb-8">
        {mode === "create" && !orcamentoVinc && (
          <p className="text-xs text-gray-500">
            Vincule um orçamento acima para habilitar o cadastro.
          </p>
        )}
        <button
          type="submit"
          disabled={loading || (mode === "create" && !orcamentoVinc)}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Salvando...
            </>
          ) : mode === "create" ? (
            "Criar Entrega"
          ) : (
            "Salvar Alterações"
          )}
        </button>
        <button
          type="button"
          onClick={() => startCancelTransition(() => { router.back(); })}
          disabled={loading || isCanceling}
          className="btn-secondary inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
        >
          {isCanceling ? (
            <>
              <Spinner />
              Cancelando…
            </>
          ) : (
            "Cancelar"
          )}
        </button>
      </div>
    </form>
  );
}
