"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { vendasService } from "@/lib/vendas/service";
import { ViewToggle, type VendasView as Visualizacao } from "./ViewToggle";
import { VendasKanban } from "./VendasKanban";
import { VendasCalendario } from "./VendasCalendario";
import { VendaModal } from "./VendaModal";
import type { StatusVenda, Venda } from "@/lib/types/vendas";

export function VendasView() {
  const router = useRouter();
  const [view, setView] = useState<Visualizacao>("kanban");
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [vendaAberta, setVendaAberta] = useState<Venda | null>(null);

  useEffect(() => {
    vendasService.listar().then((lista) => {
      setVendas(lista);
      setCarregando(false);
    });
  }, []);

  async function handleStatusChange(id: string, status: StatusVenda) {
    const atualizada = await vendasService.atualizarStatus(id, status);
    if (!atualizada) return;
    setVendas((prev) => prev.map((v) => (v.id === id ? atualizada : v)));
    setVendaAberta((prev) => (prev?.id === id ? atualizada : prev));
  }

  async function handleCadastrarEntrega(venda: Venda) {
    if (venda.status !== "pagamento_completo" || venda.entrega_registrada) return;

    const atualizada = await vendasService.marcarEntregaRegistrada(venda.id);
    if (atualizada) {
      setVendas((prev) => prev.map((v) => (v.id === venda.id ? atualizada : v)));
    }

    const params = new URLSearchParams({
      nome_cliente: venda.nome_cliente,
      cpf_cnpj: venda.cpf_cnpj,
      numero_orcamento: venda.numero_orcamento,
      bairro: venda.bairro,
      endereco: venda.endereco,
    });
    router.push(`/entregas/nova?${params.toString()}`);
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Acompanhe as vendas e cadastre entregas após o pagamento completo
          </p>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {carregando ? (
        <p className="py-12 text-center text-sm text-gray-400">Carregando vendas...</p>
      ) : view === "kanban" ? (
        <VendasKanban
          vendas={vendas}
          onCardClick={setVendaAberta}
          onStatusChange={handleStatusChange}
          onCadastrarEntrega={handleCadastrarEntrega}
        />
      ) : (
        <VendasCalendario vendas={vendas} onVendaClick={setVendaAberta} />
      )}

      {vendaAberta && (
        <VendaModal
          venda={vendaAberta}
          onClose={() => setVendaAberta(null)}
          onCadastrarEntrega={handleCadastrarEntrega}
        />
      )}
    </div>
  );
}
