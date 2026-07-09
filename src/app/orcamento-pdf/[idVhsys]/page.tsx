// Preview do PDF do orçamento em tela cheia (aba dedicada), com um botão
// "Baixar PDF" EXPLÍCITO acima do documento — o viewer nativo do navegador fica
// no iframe abaixo. Fica fora do grupo (dashboard) → sem sidebar/chrome.
// Protegida pela sessão (middleware); o PDF em si é servido e autorizado por
// /api/orcamento-pdf/[idVhsys] (RLS por conta).

export const dynamic = "force-dynamic";

export default function OrcamentoPdfPreviewPage({
  params,
}: {
  params: { idVhsys: string };
}) {
  const id = encodeURIComponent(params.idVhsys);
  const src = `/api/orcamento-pdf/${id}`; // inline → renderiza no iframe
  const download = `/api/orcamento-pdf/${id}?dl=1`; // attachment → baixa

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-sm font-semibold text-gray-800">Orçamento — PDF</h1>
        <a href={download} className="btn-primary">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-6L12 15m0 0l4.5-4.5M12 15V3"
            />
          </svg>
          Baixar PDF
        </a>
      </header>
      <iframe src={src} title="Orçamento (PDF)" className="min-h-0 w-full flex-1 border-0" />
    </div>
  );
}
