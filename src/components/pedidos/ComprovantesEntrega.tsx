"use client";
// Comprovantes de entrega do pedido (canhoto assinado, foto, PDF), na seção do
// modal do pedido quando ele está "Entregue". Fotos são comprimidas no
// navegador antes do envio; PDFs sobem como estão (até 5 MB).

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem, formatarTamanho } from "@/lib/arquivos/comprimir";
import {
  excluirComprovanteEntrega,
  linkComprovanteEntrega,
  listarComprovantesEntrega,
  prepararUploadComprovanteEntrega,
  registrarComprovanteEntrega,
  type ComprovanteEntrega,
} from "@/lib/pedidos/comprovantes";
import { VisualizadorArquivo } from "@/components/ui/VisualizadorArquivo";

const BUCKET = "comprovantes-entrega";
const MAX_PDF = 5 * 1024 * 1024;

export function ComprovantesEntrega({
  pedidoId,
  podeExcluir,
  onMudou,
}: {
  pedidoId: string;
  podeExcluir: boolean;
  /** Avisa quem mostra o indicador (ex.: card do Kanban) que a lista mudou. */
  onMudou?: () => void;
}) {
  const [itens, setItens] = useState<ComprovanteEntrega[] | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [vendo, setVendo] = useState<{ url: string; nome: string | null; pdf: boolean } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function carregar() {
    setItens(await listarComprovantesEntrega(pedidoId).catch(() => []));
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega só ao trocar de pedido
  }, [pedidoId]);

  async function enviar(arquivo: File) {
    setErro(null);
    setAviso(null);
    try {
      const ehPdf = arquivo.type === "application/pdf" || /\.pdf$/i.test(arquivo.name);
      let corpo: Blob;
      let nome = arquivo.name;
      if (ehPdf) {
        if (arquivo.size > MAX_PDF) throw new Error("PDF maior que 5 MB.");
        corpo = arquivo;
      } else {
        setEstado("Comprimindo…");
        const r = await comprimirImagem(arquivo);
        corpo = r.blob;
        nome = nome.replace(/\.[^.]+$/, "") + ".jpg";
        if (r.final < r.original) setAviso(`Imagem comprimida: ${formatarTamanho(r.original)} → ${formatarTamanho(r.final)}`);
      }

      setEstado("Enviando…");
      const prep = await prepararUploadComprovanteEntrega(pedidoId, ehPdf ? "pdf" : "jpg", corpo.size);
      if (!prep.ok) throw new Error(prep.erro);
      const { error } = await createClient()
        .storage.from(BUCKET)
        .uploadToSignedUrl(prep.path, prep.token, corpo, { contentType: ehPdf ? "application/pdf" : "image/jpeg" });
      if (error) throw new Error(`Falha ao enviar o arquivo: ${error.message}`);
      const reg = await registrarComprovanteEntrega(pedidoId, prep.path, nome, corpo.size);
      if (!reg.ok) throw new Error(reg.erro);
      await carregar();
      onMudou?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao anexar o comprovante.");
    } finally {
      setEstado(null);
      if (input.current) input.current.value = "";
    }
  }

  async function abrir(c: ComprovanteEntrega) {
    setErro(null);
    const res = await linkComprovanteEntrega(c.id);
    if (res.ok) setVendo({ url: res.url, nome: c.nome, pdf: c.ehPdf });
    else setErro(res.erro);
  }

  async function excluir(c: ComprovanteEntrega) {
    if (!window.confirm(`Excluir o comprovante "${c.nome ?? "arquivo"}"?`)) return;
    const res = await excluirComprovanteEntrega(c.id);
    if (res.ok) {
      await carregar();
      onMudou?.();
    }
    else setErro(res.erro);
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Comprovante de entrega</h3>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={estado !== null}
          className="btn-secondary h-9 text-sm"
        >
          {estado ?? "Anexar comprovante"}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void enviar(f);
          }}
        />
      </div>

      {erro && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p>}
      {aviso && <p className="mb-2 text-xs text-gray-500">{aviso}</p>}

      {itens === null ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nenhum comprovante. Anexe a foto do canhoto assinado ou um PDF que comprove o recebimento.
        </p>
      ) : (
        <ul className="divide-y rounded-md border border-gray-100">
          {itens.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <button type="button" onClick={() => abrir(c)} className="min-w-0 flex-1 truncate text-left text-primary-700 hover:underline">
                {c.nome ?? (c.ehPdf ? "Documento.pdf" : "Foto.jpg")}
              </button>
              <span className="text-xs text-gray-400">
                {c.tamanho ? formatarTamanho(c.tamanho) : ""} ·{" "}
                {new Date(c.criadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })}
              </span>
              {podeExcluir && (
                <button type="button" onClick={() => excluir(c)} className="text-xs text-red-600 hover:underline">
                  Excluir
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {vendo && <VisualizadorArquivo url={vendo.url} nome={vendo.nome} pdf={vendo.pdf} onFechar={() => setVendo(null)} />}
    </div>
  );
}
