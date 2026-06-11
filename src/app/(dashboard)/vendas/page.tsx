import { VendasView } from "@/components/vendas/VendasView";

// Aba de Vendas — dados 100% mock (sem Supabase), via camada VendasService.
// TODO VHSYS: quando a integração com o ERP entrar, apenas a implementação
// do serviço em src/lib/vendas/service.ts muda; esta página permanece igual.
export default function VendasPage() {
  return <VendasView />;
}
