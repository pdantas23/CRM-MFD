// Helpers puros de role.
// NÃO marcar "use server" — util síncrono usado em server e client components.
//
// IMPORTANTE: `owner` é um acesso SEPARADO (gerenciamento das contas VHSYS no
// CRM) e NÃO um superusuário operacional — não herda admin/superadmin e não
// acessa pedidos/orçamentos/entregas. Ver ehOwner + área /gerenciamento.

/** True para admin OU superadmin (superadmin herda tudo de admin). */
export function ehAdmin(role: string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

/** True apenas para superadmin (gate da aba Configurações). */
export function ehSuperadmin(role: string | null | undefined): boolean {
  return role === "superadmin";
}

/** True apenas para owner (gate da área de gerenciamento de contas /gerenciamento). */
export function ehOwner(role: string | null | undefined): boolean {
  return role === "owner";
}
