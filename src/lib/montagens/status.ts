// Montagens — tipos e status do serviço (puro; server e client).
//
// O status sai das DATAS (nada de campo manual):
//   previsto    → ainda não começou (sem início real)
//   andamento   → começou (início real) e não terminou (sem fim real)
//   finalizado  → tem fim real
// Atraso:
//   previsto   e hoje > início previsto        → "início atrasado"
//   andamento  e hoje > fim previsto           → "atrasado"
//   finalizado e fim real > fim previsto       → "terminou atrasado" (histórico)

export interface PagamentoMontagem {
  id: string;
  data: string;
  valor: number;
  obs: string | null;
  anexoNome: string | null;
  temAnexo: boolean;
}

export interface ServicoMontagem {
  id: string;
  contaId: string | null;
  contaSlug: string | null;
  pedidoId: string | null;
  pedidoNumero: number | null;
  clienteNome: string | null;
  montadorId: string | null;
  montadorNome: string | null;
  descricao: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  /** Valor do serviço (total). null para o montador. */
  valorCobrado: number | null;
  /** Parte da empresa = serviço − montador. null para o montador. */
  valorEmpresa: number | null;
  /** Valor do montador (saldo devedor a ele antes dos pagamentos). */
  valorMontador: number | null;
  inicioPrevisto: string | null;
  fimPrevisto: string | null;
  inicioReal: string | null;
  fimReal: string | null;
  obs: string | null;
  pagamentos: PagamentoMontagem[];
}

export type Fase = "previsto" | "andamento" | "finalizado";

export interface StatusServico {
  fase: Fase;
  /** Atrasado AGORA (previsto ou em andamento) — conta no card "Atrasados". */
  atrasado: boolean;
  /** Finalizado depois do fim previsto (só informativo). */
  terminouAtrasado: boolean;
  /** Dias de atraso (agora, ou no término para os finalizados). */
  diasAtraso: number;
}

function dias(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

export function statusServico(s: ServicoMontagem, hoje: string): StatusServico {
  if (s.fimReal) {
    const atraso = s.fimPrevisto ? dias(s.fimPrevisto, s.fimReal) : 0;
    return { fase: "finalizado", atrasado: false, terminouAtrasado: atraso > 0, diasAtraso: Math.max(0, atraso) };
  }
  if (s.inicioReal) {
    const atraso = s.fimPrevisto ? dias(s.fimPrevisto, hoje) : 0;
    return { fase: "andamento", atrasado: atraso > 0, terminouAtrasado: false, diasAtraso: Math.max(0, atraso) };
  }
  const atraso = s.inicioPrevisto ? dias(s.inicioPrevisto, hoje) : 0;
  return { fase: "previsto", atrasado: atraso > 0, terminouAtrasado: false, diasAtraso: Math.max(0, atraso) };
}

export function totalPago(s: ServicoMontagem): number {
  return s.pagamentos.reduce((t, p) => t + p.valor, 0);
}

export const ROTULO_FASE: Record<Fase, string> = {
  previsto: "Previsto",
  andamento: "Em andamento",
  finalizado: "Finalizado",
};
