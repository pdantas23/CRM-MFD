// Selo que identifica a conta dona da entrega no mural COMPARTILHADO.
// Só faz sentido quando há mais de uma conta ativa; cada conta tem seu
// themeColor (hex), usado como cor do selo (fundo suave + texto na cor).

export interface ContaInfo {
  slug: string;
  nome: string | null;
  cor: string;
}

/** Mapa conta_id → dados de exibição, montado na página (server). */
export type ContaInfoMap = Record<string, ContaInfo>;

export function ContaBadge({
  contaId,
  contas,
}: {
  contaId: string | null;
  contas: ContaInfoMap;
}) {
  if (!contaId) return null;
  const info = contas[contaId];
  if (!info) return null;

  return (
    <span
      className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide"
      // themeColor é hex; "1a" ≈ 10% de opacidade para o fundo.
      style={{ backgroundColor: `${info.cor}1a`, color: info.cor }}
      title={info.nome ?? info.slug}
    >
      {info.slug}
    </span>
  );
}
