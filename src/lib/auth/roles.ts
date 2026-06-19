// Helpers puros de role. superadmin é um superset de admin: herda toda a
// visibilidade/poder de admin. NÃO marcar "use server" — é util síncrono
// usado tanto em server components quanto em client components.

/** True para admin OU superadmin (superadmin herda tudo de admin). */
export function ehAdmin(role: string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

/** True apenas para superadmin (gate da aba Configurações). */
export function ehSuperadmin(role: string | null | undefined): boolean {
  return role === "superadmin";
}
