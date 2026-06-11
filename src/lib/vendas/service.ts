import type { StatusVenda, Venda, VendaFormData } from "@/lib/types/vendas";
import { criarVendasMock } from "./mock-data";

// Camada de serviço de Vendas.
//
// A UI fala apenas com esta interface. Quando a integração com o ERP VHSYS
// entrar, basta criar uma implementação VhsysVendasService e trocar o export
// de `vendasService` no final do arquivo — nenhum componente muda.
export interface VendasService {
  listar(): Promise<Venda[]>;
  buscarPorId(id: string): Promise<Venda | null>;
  criar(data: VendaFormData): Promise<Venda>;
  atualizarStatus(id: string, status: StatusVenda): Promise<Venda | null>;
  marcarEntregaRegistrada(id: string): Promise<Venda | null>;
}

// Implementação mock: CRUD em memória sobre os dados fictícios.
// O estado vive no módulo (singleton no client), então sobrevive a
// navegações client-side, mas reinicia em um reload completo da página.
class MockVendasService implements VendasService {
  private vendas: Venda[] = criarVendasMock();
  private seq = this.vendas.length;

  async listar(): Promise<Venda[]> {
    // TODO VHSYS: substituir por GET /pedidos (ou /orcamentos) da API VHSYS,
    // mapeando os campos do ERP para o tipo Venda.
    return [...this.vendas];
  }

  async buscarPorId(id: string): Promise<Venda | null> {
    // TODO VHSYS: GET /pedidos/{id} na API VHSYS.
    return this.vendas.find((v) => v.id === id) ?? null;
  }

  async criar(data: VendaFormData): Promise<Venda> {
    // TODO VHSYS: POST /pedidos na API VHSYS (provavelmente a criação ficará
    // no próprio ERP e este método deixará de existir aqui).
    this.seq += 1;
    const valorTotal = data.itens.reduce(
      (acc, i) => acc + i.quantidade * i.valor_unitario,
      0
    );
    const venda: Venda = {
      ...data,
      id: `venda-mock-${this.seq}`,
      valor_total: valorTotal,
      entrega_registrada: false,
      created_at: new Date().toISOString(),
    };
    this.vendas = [venda, ...this.vendas];
    return venda;
  }

  async atualizarStatus(id: string, status: StatusVenda): Promise<Venda | null> {
    // TODO VHSYS: o status de pagamento virá do financeiro do VHSYS;
    // aqui provavelmente será leitura, não escrita.
    return this.atualizar(id, { status });
  }

  async marcarEntregaRegistrada(id: string): Promise<Venda | null> {
    // TODO VHSYS: persistir o vínculo venda -> entrega (hoje só em memória).
    return this.atualizar(id, { entrega_registrada: true });
  }

  private atualizar(id: string, patch: Partial<Venda>): Venda | null {
    const idx = this.vendas.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    const atualizada = { ...this.vendas[idx], ...patch };
    this.vendas = [
      ...this.vendas.slice(0, idx),
      atualizada,
      ...this.vendas.slice(idx + 1),
    ];
    return atualizada;
  }
}

// TODO VHSYS: trocar por `new VhsysVendasService(...)` quando a integração existir.
export const vendasService: VendasService = new MockVendasService();
