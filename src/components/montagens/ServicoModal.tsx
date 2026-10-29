"use client";
// Modal do serviço de montagem.
//   admin      → cria/edita o serviço (pedido, montador, obra, valores, datas)
//   financeiro → vê o serviço e lança/exclui pagamentos ao montador
//   montador   → só vê (sem o valor cobrado do cliente)
// Pagamentos: vários por serviço, com comprovante opcional (bucket privado; o
// arquivo sobe direto do navegador por URL assinada).

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, formatarData } from "@/lib/format";
import {
  adicionarPagamento,
  buscarPedidos,
  marcarExecucao,
  excluirPagamento,
  excluirServico,
  linkComprovante,
  prepararUploadComprovante,
  salvarServico,
  type PedidoOpcao,
} from "@/lib/montagens/acoes";
import type { MontadorOpcao } from "@/lib/montagens/dados";
import { statusServico, totalPago, type ServicoMontagem } from "@/lib/montagens/status";
import { CampoNumero } from "@/components/produtos/CampoNumero";
import { VisualizadorArquivo } from "@/components/ui/VisualizadorArquivo";
import { BadgeStatus } from "./BadgeStatus";
import { CampoData } from "./CampoData";
import type { PermissoesMontagem } from "./MontagensView";

const BUCKET = "anexos-montagem";

function Campo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{valor || "—"}</dd>
    </div>
  );
}

const data = (v: string | null) => (v ? formatarData(v) : null);

// ── Busca de pedido ────────────────────────────────────────────────────────

/** Pedidos que casam com o termo (nº ou nome do cliente), com debounce. */
function usePedidosSugeridos(termo: string, ativo: boolean) {
  const [opcoes, setOpcoes] = useState<PedidoOpcao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const t = termo.trim();
    if (!ativo || t.length < 2) {
      seq.current++;
      setOpcoes([]);
      setBuscando(false);
      return;
    }
    const n = ++seq.current;
    const timer = setTimeout(async () => {
      setBuscando(true);
      const r = await buscarPedidos(t).catch(() => []);
      if (n === seq.current) {
        setOpcoes(r);
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [termo, ativo]);

  return { opcoes, buscando, limpar: () => setOpcoes([]) };
}

function ListaPedidos({
  opcoes,
  buscando,
  onEscolher,
}: {
  opcoes: PedidoOpcao[];
  buscando: boolean;
  onEscolher: (p: PedidoOpcao) => void;
}) {
  if (!buscando && opcoes.length === 0) return null;
  return (
    <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
      {buscando && <p className="px-3 py-2 text-sm text-gray-400">Buscando…</p>}
      {opcoes.map((p) => (
        <button
          key={p.id}
          type="button"
          // onMouseDown: escolhe antes do blur do input fechar a lista.
          onMouseDown={(e) => {
            e.preventDefault();
            onEscolher(p);
          }}
          className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
        >
          <span className="font-medium text-gray-900">
            Pedido {p.numero ?? "—"} · {p.cliente ?? "—"}
          </span>
          <span className="block text-xs text-gray-500">
            {p.contaSlug.toUpperCase()} · {p.data ? formatarData(p.data) : "sem data"}
            {p.valor !== null ? ` · ${formatBRL(p.valor)}` : ""}
            {p.cidade ? ` · ${p.cidade}${p.uf ? `-${p.uf}` : ""}` : ""}
          </span>
        </button>
      ))}
    </div>
  );
}

function BuscaPedido({ onEscolher }: { onEscolher: (p: PedidoOpcao) => void }) {
  const [termo, setTermo] = useState("");
  const [foco, setFoco] = useState(false);
  const { opcoes, buscando, limpar } = usePedidosSugeridos(termo, foco);
  return (
    <div className="relative">
      <input
        type="search"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        placeholder="Nº do pedido ou nome do cliente"
        className="input-base"
      />
      <ListaPedidos
        opcoes={opcoes}
        buscando={buscando}
        onEscolher={(p) => {
          onEscolher(p);
          setTermo("");
          limpar();
        }}
      />
    </div>
  );
}

/** Nome do cliente: texto livre que também busca pedidos desse cliente. */
function CampoCliente({
  valor,
  onChange,
  onEscolherPedido,
}: {
  valor: string;
  onChange: (v: string) => void;
  onEscolherPedido: (p: PedidoOpcao) => void;
}) {
  const [digitando, setDigitando] = useState(false);
  const { opcoes, buscando, limpar } = usePedidosSugeridos(valor, digitando);
  return (
    <div className="relative">
      <input
        value={valor}
        onChange={(e) => {
          onChange(e.target.value);
          setDigitando(true);
        }}
        onBlur={() => setDigitando(false)}
        maxLength={255}
        placeholder="Vem do pedido; digite para buscar"
        className="input-base"
      />
      <ListaPedidos
        opcoes={opcoes}
        buscando={buscando}
        onEscolher={(p) => {
          onEscolherPedido(p);
          setDigitando(false);
          limpar();
        }}
      />
    </div>
  );
}

// ── Montador (texto livre com sugestão dos usuários montadores) ────────────

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function CampoMontador({
  nome,
  id,
  opcoes,
  onChange,
}: {
  nome: string;
  id: string | null;
  opcoes: MontadorOpcao[];
  onChange: (nome: string, id: string | null) => void;
}) {
  const [foco, setFoco] = useState(false);
  const termo = normalizar(nome);
  const sugeridos = termo ? opcoes.filter((m) => normalizar(m.nome).includes(termo)) : opcoes;
  return (
    <div className="relative">
      <input
        value={nome}
        onChange={(e) => {
          const v = e.target.value;
          // Nome idêntico ao de um montador cadastrado → já vincula ao usuário.
          const exato = opcoes.find((m) => normalizar(m.nome) === normalizar(v));
          onChange(v, exato?.id ?? null);
        }}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        maxLength={120}
        placeholder="Digite o nome"
        className="input-base"
      />
      {foco && sugeridos.length > 0 && !id && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {sugeridos.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(m.nome, m.id);
                setFoco(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
            >
              {m.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pagamentos ─────────────────────────────────────────────────────────────

function Pagamentos({
  servico,
  podePagar,
  hoje,
  onMudou,
}: {
  servico: ServicoMontagem;
  podePagar: boolean;
  hoje: string;
  onMudou: () => void;
}) {
  const pago = totalPago(servico);
  const saldo = (servico.valorMontador ?? 0) - pago;
  const [novo, setNovo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [vendo, setVendo] = useState<{ url: string; nome: string | null } | null>(null);

  async function abrir(id: string, nome: string | null) {
    setErro(null);
    const res = await linkComprovante(id);
    if (res.ok) setVendo({ url: res.url, nome });
    else setErro(res.erro);
  }

  async function excluir(id: string) {
    if (!window.confirm("Excluir este pagamento (e o comprovante)?")) return;
    const res = await excluirPagamento(id);
    if (res.ok) onMudou();
    else setErro(res.erro);
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {formatBRL(pago)} pago de {servico.valorMontador === null ? "—" : formatBRL(servico.valorMontador)}
          {servico.valorMontador !== null && (
            <span className={`ml-2 font-medium ${saldo > 0.005 ? "text-amber-700" : "text-green-700"}`}>
              {saldo > 0.005 ? `falta ${formatBRL(saldo)}` : "quitado"}
            </span>
          )}
        </p>
        {podePagar && (
          <button type="button" onClick={() => setNovo(true)} className="btn-primary">
            Novo pagamento
          </button>
        )}
      </div>

      {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      {servico.pagamentos.length > 0 ? (
        <ul className="divide-y rounded-lg border border-gray-200">
          {servico.pagamentos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <span className="w-24 text-gray-600">{formatarData(p.data)}</span>
              <span className="w-28 font-medium tabular-nums text-gray-900">{formatBRL(p.valor)}</span>
              <span className="min-w-0 flex-1 truncate text-gray-600" title={p.obs ?? ""}>
                {p.obs ?? ""}
              </span>
              {p.temAnexo && (
                <button type="button" onClick={() => abrir(p.id, p.anexoNome)} className="text-primary-700 hover:underline" title={p.anexoNome ?? ""}>
                  Comprovante
                </button>
              )}
              {podePagar && (
                <button type="button" onClick={() => excluir(p.id)} className="text-xs text-red-600 hover:underline">
                  Excluir
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500">
          Nenhum pagamento lançado.
        </p>
      )}

      {vendo && <VisualizadorArquivo url={vendo.url} nome={vendo.nome} onFechar={() => setVendo(null)} />}

      {novo && (
        <NovoPagamentoModal
          servicoId={servico.id}
          saldo={saldo}
          hoje={hoje}
          onFechar={() => setNovo(false)}
          onSalvo={() => {
            setNovo(false);
            onMudou();
          }}
        />
      )}
    </section>
  );
}

/** Fecha com Esc a janela mais de cima (sub-modal). */
function useEscape(fechar: () => void) {
  const ref = useRef(fechar);
  ref.current = fechar;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && ref.current();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);
}

function NovoPagamentoModal({
  servicoId,
  saldo,
  hoje,
  onFechar,
  onSalvo,
}: {
  servicoId: string;
  saldo: number;
  hoje: string;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [dataPg, setDataPg] = useState(hoje);
  const [valor, setValor] = useState<number | null>(saldo > 0.005 ? Math.round(saldo * 100) / 100 : null);
  const [obs, setObs] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (!dataPg) return setErro("Informe a data do pagamento.");
    if (!valor || valor <= 0) return setErro("Informe o valor pago.");
    setOcupado(true);
    try {
      let anexoPath: string | null = null;
      if (arquivo) {
        if (arquivo.size > 15 * 1024 * 1024) throw new Error("Arquivo maior que 15 MB.");
        const prep = await prepararUploadComprovante(servicoId, arquivo.name);
        if (!prep.ok) throw new Error(prep.erro);
        const { error } = await createClient().storage.from(BUCKET).uploadToSignedUrl(prep.path, prep.token, arquivo);
        if (error) throw new Error(`Falha ao enviar o arquivo: ${error.message}`);
        anexoPath = prep.path;
      }
      const res = await adicionarPagamento({
        servicoId,
        data: dataPg,
        valor,
        obs: obs || null,
        anexoPath,
        anexoNome: arquivo?.name ?? null,
      });
      if (!res.ok) throw new Error(res.erro);
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao lançar o pagamento.");
    } finally {
      setOcupado(false);
    }
  }

  useEscape(() => !ocupado && onFechar());
  return (
    <div
      data-submodal
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !ocupado) onFechar();
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">Novo pagamento</h3>
        </div>
        <div className="space-y-4 px-5 py-4">
          {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Data">
              <CampoData value={dataPg} onChange={setDataPg} />
            </Campo>
            <Campo label="Valor">
              <CampoNumero value={valor} onChange={setValor} prefixo="R$" />
            </Campo>
          </div>
          <Campo label="Observação">
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Ex.: adiantamento, PIX, nota nº…"
              className="input-base h-auto resize-y py-2"
            />
          </Campo>
          <Campo label="Anexo (opcional)">
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-400">PDF ou imagem, até 15 MB.</p>
          </Campo>
        </div>
        <div className="flex justify-end gap-3 border-t px-5 py-3">
          <button type="button" onClick={onFechar} disabled={ocupado} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={salvar} disabled={ocupado} className="btn-primary">
            {ocupado ? "Salvando…" : "Salvar pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fase da obra (início/fim reais) ────────────────────────────────────────

function FaseObra({
  servico,
  hoje,
  podeEditar,
  onMudou,
}: {
  servico: ServicoMontagem;
  hoje: string;
  podeEditar: boolean;
  onMudou: () => void;
}) {
  const [dataReal, setDataReal] = useState(hoje);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const st = statusServico(servico, hoje);

  async function acao(a: "iniciar" | "finalizar" | "desfazer_inicio" | "desfazer_fim") {
    if (a === "desfazer_fim" && !window.confirm("Reabrir a obra?")) return;
    if (a === "desfazer_inicio" && !window.confirm("Desfazer o início da obra?")) return;
    setErro(null);
    setOcupado(true);
    try {
      const res = await marcarExecucao(servico.id, a, a.startsWith("desfazer") ? null : dataReal, hoje);
      if (!res.ok) setErro(res.erro);
      else {
        setDataReal(hoje);
        onMudou();
      }
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  const etapas = [
    { label: "Não iniciada", feita: true, data: null as string | null },
    { label: "Em andamento", feita: Boolean(servico.inicioReal), data: servico.inicioReal },
    { label: "Finalizada", feita: Boolean(servico.fimReal), data: servico.fimReal },
  ];
  const atual = servico.fimReal ? 2 : servico.inicioReal ? 1 : 0;

  return (
    <section className="space-y-5">
      <p className="text-center text-sm text-gray-600">
        Prazo:{" "}
        <span className="font-medium text-gray-900">
          {servico.inicioPrevisto ? formatarData(servico.inicioPrevisto) : "—"} →{" "}
          {servico.fimPrevisto ? formatarData(servico.fimPrevisto) : "—"}
        </span>
        {st.atrasado && (
          <span className="ml-2 font-medium text-red-600">
            · {st.fase === "previsto" ? "início atrasado" : "atrasado"} {st.diasAtraso}d
          </span>
        )}
      </p>

      {/* Linha do tempo */}
      <ol className="flex items-center">
        {etapas.map((e, i) => (
          <li key={e.label} className={`flex items-center ${i < etapas.length - 1 ? "flex-1" : ""}`}>
            <div className="flex flex-col items-center text-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  i === atual ? "bg-primary-600 text-white" : e.feita ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-400"
                }`}
              >
                {e.feita && i < atual ? "✓" : i + 1}
              </span>
              <span className={`mt-1 text-xs font-medium ${i === atual ? "text-primary-700" : "text-gray-500"}`}>{e.label}</span>
              <span className="text-xs text-gray-400">{e.data ? formatarData(e.data) : "\u00a0"}</span>
            </div>
            {i < etapas.length - 1 && (
              <span className={`mx-2 mb-8 h-0.5 flex-1 ${etapas[i + 1].feita ? "bg-primary-300" : "bg-gray-200"}`} />
            )}
          </li>
        ))}
      </ol>


      {podeEditar && (
        <div className="rounded-lg border border-gray-200 px-4 py-4">
          {!servico.fimReal ? (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {servico.inicioReal ? "Data do término" : "Data do início"}
                </label>
                <CampoData value={dataReal} onChange={setDataReal} max={hoje} className="w-44" />
              </div>
              <button
                type="button"
                onClick={() => acao(servico.inicioReal ? "finalizar" : "iniciar")}
                disabled={ocupado}
                className="btn-primary"
              >
                {ocupado ? "Salvando…" : servico.inicioReal ? "Terminar obra" : "Começar obra"}
              </button>
              {servico.inicioReal && (
                <button
                  type="button"
                  onClick={() => acao("desfazer_inicio")}
                  disabled={ocupado}
                  className="ml-auto text-xs text-gray-500 hover:underline"
                >
                  Desfazer início
                </button>
              )}
              <p className="w-full text-xs text-gray-400">A data pode ser de um dia anterior (retroativa).</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
              <span>
                Obra concluída em <strong>{formatarData(servico.fimReal)}</strong>.
              </span>
              <button type="button" onClick={() => acao("desfazer_fim")} disabled={ocupado} className="text-xs text-gray-500 hover:underline">
                Reabrir obra
              </button>
            </div>
          )}
          {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
        </div>
      )}
    </section>
  );
}

// ── Indicador de fases ─────────────────────────────────────────────────────

function Fases({
  fases,
  passo,
  alcancado,
  onIr,
}: {
  fases: string[];
  passo: number;
  alcancado: number;
  onIr: (n: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {fases.map((f, i) => {
        const atual = i === passo;
        const feito = i < passo;
        const liberado = i <= alcancado;
        return (
          <li key={f} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => liberado && onIr(i)}
              disabled={!liberado}
              className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm ${
                atual ? "bg-primary-50 font-semibold text-primary-700" : liberado ? "text-gray-700 hover:bg-gray-50" : "text-gray-400"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  atual ? "bg-primary-600 text-white" : feito ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {feito ? "✓" : i + 1}
              </span>
              {f}
            </button>
            {i < fases.length - 1 && <span className="h-px w-4 bg-gray-300" />}
          </li>
        );
      })}
    </ol>
  );
}

// ── Resumo (aba Dados da obra) ─────────────────────────────────────────────

function Bloco({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-gray-200 p-4 ${className ?? ""}`}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
    </section>
  );
}

function ResumoServico({ servico, montador }: { servico: ServicoMontagem; montador: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Bloco titulo="Cliente e pedido">
        <div className="col-span-2">
          <Info label="Cliente" valor={servico.clienteNome} />
        </div>
        <Info label="Pedido" valor={servico.pedidoNumero ? `Nº ${servico.pedidoNumero}` : null} />
        <Info label="Conta" valor={servico.contaSlug?.toUpperCase()} />
      </Bloco>

      {!montador ? (
        <Bloco titulo="Responsável">
          <div className="col-span-2">
            <Info label="Montador" valor={servico.montadorNome} />
          </div>
        </Bloco>
      ) : (
        <Bloco titulo="Valor a receber">
          <div className="col-span-2">
            <Info label="Valor a receber" valor={servico.valorMontador === null ? null : formatBRL(servico.valorMontador)} />
          </div>
        </Bloco>
      )}

      <Bloco titulo="Serviço" className="sm:col-span-2">
        <div className="col-span-2">
          <dd className="whitespace-pre-line text-sm text-gray-900">{servico.descricao || "—"}</dd>
        </div>
      </Bloco>

      <Bloco titulo="Local da obra" className="sm:col-span-2">
        <div className="col-span-2">
          <Info label="Endereço" valor={servico.endereco} />
        </div>
        <Info label="Cidade" valor={servico.cidade} />
        <Info label="UF" valor={servico.uf} />
        {servico.obs && (
          <div className="col-span-2">
            <Info label="Observações" valor={<span className="whitespace-pre-line">{servico.obs}</span>} />
          </div>
        )}
      </Bloco>

      <Bloco titulo="Prazo">
        <Info label="Início da obra" valor={data(servico.inicioPrevisto)} />
        <Info label="Fim da obra" valor={data(servico.fimPrevisto)} />
        <Info label="Iniciada em" valor={data(servico.inicioReal)} />
        <Info label="Finalizada em" valor={data(servico.fimReal)} />
      </Bloco>

      {!montador && (
        <Bloco titulo="Valores">
          <Info label="Valor do serviço" valor={servico.valorCobrado === null ? null : formatBRL(servico.valorCobrado)} />
          <Info label="Valor do montador" valor={servico.valorMontador === null ? null : formatBRL(servico.valorMontador)} />
          <div className="col-span-2">
            <Info label="Valor da empresa" valor={servico.valorEmpresa === null ? null : formatBRL(servico.valorEmpresa)} />
          </div>
        </Bloco>
      )}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────

export function ServicoModal({
  servico,
  montadores,
  permissoes,
  hoje,
  onFechar,
  onMudou,
  onCriado,
  abaInicial = "fase",
}: {
  servico: ServicoMontagem | null;
  montadores: MontadorOpcao[];
  permissoes: PermissoesMontagem;
  hoje: string;
  onFechar: () => void;
  onMudou: () => void;
  onCriado: (id: string) => void;
  /** Aba em que o modal abre (ex.: Pagamentos logo depois de criar). */
  abaInicial?: "fase" | "obra" | "pagamentos";
}) {
  const editavel = permissoes.podeEditar;
  const [pedido, setPedido] = useState<{ id: string | null; numero: number | null; conta: string | null }>({
    id: servico?.pedidoId ?? null,
    numero: servico?.pedidoNumero ?? null,
    conta: servico?.contaSlug ?? null,
  });
  const [montadorId, setMontadorId] = useState<string | null>(servico?.montadorId ?? null);
  const [montadorNome, setMontadorNome] = useState(servico?.montadorNome ?? "");
  const [cliente, setCliente] = useState(servico?.clienteNome ?? "");
  const [descricao, setDescricao] = useState(servico?.descricao ?? "");
  const [endereco, setEndereco] = useState(servico?.endereco ?? "");
  const [cidade, setCidade] = useState(servico?.cidade ?? "");
  const [uf, setUf] = useState(servico?.uf ?? "");
  const [valorServico, setValorServico] = useState(servico?.valorCobrado ?? null);
  const [valorMontador, setValorMontador] = useState(servico?.valorMontador ?? null);
  // Valor da empresa = serviço − montador (calculado; o servidor recalcula).
  const valorEmpresa = valorServico === null || valorMontador === null ? null : valorServico - valorMontador;
  const [inicioPrevisto, setInicioPrevisto] = useState(servico?.inicioPrevisto ?? "");
  const [fimPrevisto, setFimPrevisto] = useState(servico?.fimPrevisto ?? "");
  const [obs, setObs] = useState(servico?.obs ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Serviço existente: abas "Dados da obra" e "Pagamentos"; "Editar" abre o
  // cadastro em fases. Serviço novo: direto no cadastro em fases (cria na última).
  const [aba, setAba] = useState<"fase" | "obra" | "pagamentos">(abaInicial);
  const [editando, setEditando] = useState(!servico);
  const fases = ["Pedido e montador", "Obra", "Valores", "Prazo"];
  const ultimaFase = fases.length - 1;
  const [passo, setPasso] = useState(0);
  const [alcancado, setAlcancado] = useState(servico ? ultimaFase : 0);

  function irPara(n: number) {
    setErro(null);
    setPasso(n);
    setAlcancado((a) => Math.max(a, n));
  }

  // Alterações não salvas: compara o formulário com o último estado salvo.
  const formAtual = JSON.stringify([
    pedido.id, montadorId, montadorNome, cliente, descricao, endereco, cidade, uf,
    valorServico, valorMontador, inicioPrevisto, fimPrevisto, obs,
  ]);
  const [salvo, setSalvo] = useState(formAtual);
  const sujo = editavel && formAtual !== salvo;
  const [perguntarSaida, setPerguntarSaida] = useState(false);

  // Cancelar a edição: serviço existente volta ao último salvo; novo fecha.
  function cancelarEdicao() {
    if (!servico) return tentarFechar();
    setPedido({ id: servico.pedidoId, numero: servico.pedidoNumero, conta: servico.contaSlug });
    setMontadorId(servico.montadorId);
    setMontadorNome(servico.montadorNome ?? "");
    setCliente(servico.clienteNome ?? "");
    setDescricao(servico.descricao ?? "");
    setEndereco(servico.endereco ?? "");
    setCidade(servico.cidade ?? "");
    setUf(servico.uf ?? "");
    setValorServico(servico.valorCobrado);
    setValorMontador(servico.valorMontador);
    setInicioPrevisto(servico.inicioPrevisto ?? "");
    setFimPrevisto(servico.fimPrevisto ?? "");
    setObs(servico.obs ?? "");
    setErro(null);
    setEditando(false);
  }

  function tentarFechar() {
    if (ocupado) return;
    if (sujo) setPerguntarSaida(true);
    else onFechar();
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Janela por cima (comprovante / novo pagamento) trata o próprio Esc.
      if (document.querySelector("[data-submodal]")) return;
      if (perguntarSaida) setPerguntarSaida(false);
      else tentarFechar();
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  });

  function escolherPedido(p: PedidoOpcao) {
    setPedido({ id: p.id, numero: p.numero, conta: p.contaSlug });
    // O cliente vem do pedido. O endereço da obra é digitado (o do cadastro do
    // cliente nem sempre é o da obra).
    if (p.cliente) setCliente(p.cliente);
  }

  async function salvar(fecharDepois = false) {
    setErro(null);
    setPerguntarSaida(false);
    setOcupado(true);
    try {
      const res = await salvarServico({
        id: servico?.id ?? null,
        pedidoId: pedido.id,
        montadorId,
        montadorNome: montadorNome || null,
        clienteNome: cliente || null,
        descricao: descricao || null,
        endereco: endereco || null,
        cidade: cidade || null,
        uf: uf || null,
        valorServico,
        valorMontador,
        inicioPrevisto: inicioPrevisto || null,
        fimPrevisto: fimPrevisto || null,
        obs: obs || null,
      });
      if (!res.ok) return setErro(res.erro);
      if (servico) {
        setSalvo(formAtual);
        onMudou();
        setEditando(false);
        if (fecharDepois) onFechar();
      } else {
        onCriado(res.id); // continua aberto para lançar pagamentos
      }
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function excluir() {
    if (!servico || !window.confirm("Excluir este serviço e todos os pagamentos dele? Não dá para desfazer.")) return;
    setOcupado(true);
    const res = await excluirServico(servico.id);
    setOcupado(false);
    if (!res.ok) return setErro(res.erro);
    onMudou();
    onFechar();
  }

  const st = servico ? statusServico(servico, hoje) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) tentarFechar();
      }}
    >
      {/* Tamanho fixo: as abas não mudam a altura; o conteúdo rola por dentro. */}
      <div className="relative flex h-[85vh] max-h-[780px] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">
              {servico ? servico.clienteNome ?? "Serviço de montagem" : "Novo serviço de montagem"}
            </h2>
            {servico && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                {st && <BadgeStatus st={st} />}
                <span>
                  {servico.pedidoNumero ? `Pedido ${servico.pedidoNumero}` : "Sem pedido"}
                  {servico.contaSlug ? ` · ${servico.contaSlug.toUpperCase()}` : ""}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={tentarFechar}
            disabled={ocupado}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

          {servico && !editando && (
            <nav className="-mt-2 flex gap-1 border-b border-gray-200">
              {(
                [
                  ["fase", "Fase da obra"],
                  ["obra", "Dados da obra"],
                  ["pagamentos", `Pagamentos (${servico.pagamentos.length})`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAba(id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                    aba === id ? "border-b-2 border-primary-600 text-primary-600" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}

          {servico && !editando && aba === "obra" && (
            <>
              <ResumoServico servico={servico} montador={permissoes.montador} />
            </>
          )}

          {servico && !editando && aba === "fase" && (
            <FaseObra servico={servico} hoje={hoje} podeEditar={editavel} onMudou={onMudou} />
          )}

          {servico && !editando && aba === "pagamentos" && (
            <Pagamentos servico={servico} podePagar={permissoes.podePagar} hoje={hoje} onMudou={onMudou} />
          )}

          {editando && (
            <>
              <Fases fases={fases} passo={passo} alcancado={alcancado} onIr={irPara} />
              {passo === 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Pedido" className="sm:col-span-2">
                  {pedido.id || pedido.numero ? (
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                      <span>
                        Pedido {pedido.numero ?? "—"}
                        {pedido.conta ? ` · ${pedido.conta.toUpperCase()}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPedido({ id: null, numero: null, conta: null })}
                        className="text-xs font-medium text-primary-700 hover:underline"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <BuscaPedido onEscolher={escolherPedido} />
                  )}
                </Campo>
                <Campo label="Cliente">
                  <CampoCliente valor={cliente} onChange={setCliente} onEscolherPedido={escolherPedido} />
                </Campo>
                <Campo label="Montador responsável">
                  <CampoMontador
                    nome={montadorNome}
                    id={montadorId}
                    opcoes={montadores}
                    onChange={(nome, id) => {
                      setMontadorNome(nome);
                      setMontadorId(id);
                    }}
                  />
                </Campo>
                <Campo label="Serviço" className="sm:col-span-2">
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    maxLength={500}
                    rows={5}
                    placeholder="Ex.: instalação de piso vinílico 50 m² na sala e nos quartos"
                    className="input-base h-auto resize-y py-2"
                  />
                </Campo>
                </div>
              )}
              {passo === 1 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Endereço da obra" className="sm:col-span-2">
                  <input value={endereco} onChange={(e) => setEndereco(e.target.value)} maxLength={255} className="input-base" />
                </Campo>
                <Campo label="Cidade">
                  <input value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={100} className="input-base" />
                </Campo>
                <Campo label="UF">
                  <input
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="PI"
                    className="input-base"
                  />
                </Campo>
                <Campo label="Observações" className="sm:col-span-2">
                  <textarea value={obs} onChange={(e) => setObs(e.target.value)} maxLength={2000} rows={3} placeholder="Ex.: ponto de referência, acesso, horário para trabalhar" className="input-base h-auto resize-y py-2" />
                </Campo>
                </div>
              )}
              {passo === 2 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Valor do serviço">
                  <CampoNumero value={valorServico} onChange={setValorServico} prefixo="R$" />
                </Campo>
                <Campo label="Valor do montador">
                  <CampoNumero value={valorMontador} onChange={setValorMontador} prefixo="R$" />
                </Campo>
                <div className="flex items-center justify-end gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm sm:col-span-2">
                  <span className="text-gray-600">Valor da empresa:</span>
                  <span
                    className={`text-base font-semibold tabular-nums ${
                      valorEmpresa !== null && valorEmpresa < 0 ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {valorEmpresa === null ? "—" : formatBRL(valorEmpresa)}
                  </span>
                </div>
                </div>
              )}
              {passo === 3 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Início da obra">
                  <CampoData value={inicioPrevisto} onChange={setInicioPrevisto} />
                </Campo>
                <Campo label="Fim da obra">
                  <CampoData value={fimPrevisto} onChange={setFimPrevisto} />
                </Campo>
                </div>
              )}
            </>
          )}
        </div>

        {editavel && (editando || servico) && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-white px-6 py-3">
            {editando ? (
              <>
                {sujo && <span className="mr-auto hidden text-xs text-amber-600 sm:inline">Alterações não salvas</span>}
                <button type="button" onClick={cancelarEdicao} disabled={ocupado} className="btn-secondary">
                  Cancelar
                </button>
                {passo > 0 && (
                  <button type="button" onClick={() => irPara(passo - 1)} disabled={ocupado} className="btn-secondary">
                    Voltar
                  </button>
                )}
                {passo < ultimaFase ? (
                  <button type="button" onClick={() => irPara(passo + 1)} disabled={ocupado} className="btn-primary">
                    Próximo
                  </button>
                ) : (
                  <button type="button" onClick={() => salvar()} disabled={ocupado} className="btn-primary">
                    {ocupado ? "Salvando…" : servico ? "Salvar" : "Criar serviço"}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={excluir}
                  disabled={ocupado}
                  title="Excluir serviço"
                  aria-label="Excluir serviço"
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasso(0);
                    setEditando(true);
                  }}
                  disabled={ocupado}
                  title="Editar serviço"
                  aria-label="Editar serviço"
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
              </>
            )}
          </div>
        )}

        {perguntarSaida && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
              <h3 className="text-base font-semibold text-gray-900">Salvar as alterações?</h3>
              <p className="mt-1 text-sm text-gray-600">Há alterações neste serviço que ainda não foram salvas.</p>
              <div className="mt-5 flex items-center gap-2 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    setPerguntarSaida(false);
                    onFechar();
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Descartar
                </button>
                <button type="button" onClick={() => setPerguntarSaida(false)} className="btn-secondary ml-auto">
                  Continuar editando
                </button>
                <button type="button" onClick={() => salvar(true)} className="btn-primary">
                  {servico ? "Salvar e fechar" : "Criar serviço"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
