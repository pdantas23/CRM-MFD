// Sufixo de conta no nome de login. O login é por nome (único global), então
// usuários de contas diferentes recebem o slug da conta como sufixo:
//   "sandro" + conta "sa" → "sandro-sa".

/** Aplica "-<slug>" ao nome, sem duplicar se já estiver presente. */
export function aplicarSufixoLogin(nome: string, slug: string): string {
  const base = nome.trim();
  if (!slug) return base;
  const suf = `-${slug}`;
  return base.toLowerCase().endsWith(suf.toLowerCase()) ? base : `${base}${suf}`;
}
