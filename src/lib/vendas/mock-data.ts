import type { ItemVenda, StatusVenda, Venda } from "@/lib/types/vendas";

// Dados fictícios para demonstração. Distribuídos no mês corrente para que
// Kanban e Calendário sempre tenham conteúdo visível.

function isoNoMesAtual(dia: number): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const d = new Date(ano, mes, Math.min(dia, ultimoDia));
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function somaItens(itens: ItemVenda[]): number {
  return itens.reduce((acc, i) => acc + i.quantidade * i.valor_unitario, 0);
}

interface VendaSeed {
  nome_cliente: string;
  cpf_cnpj: string;
  contato: string;
  numero_orcamento: string;
  itens: ItemVenda[];
  percentual_pago: number; // 0 a 1
  status: StatusVenda;
  dia_venda: number;
  dia_previsao: number | null;
  vendedor: string;
  bairro: string;
  endereco: string;
  observacoes: string;
  entrega_registrada?: boolean;
}

const seeds: VendaSeed[] = [
  {
    nome_cliente: "Construtora Horizonte Ltda",
    cpf_cnpj: "12.345.678/0001-90",
    contato: "(86) 99901-1234",
    numero_orcamento: "ORC-0101",
    itens: [
      { descricao: "Placa de drywall standard 1,20x1,80m", quantidade: 60, valor_unitario: 42.9 },
      { descricao: "Montante 48mm 3m", quantidade: 80, valor_unitario: 18.5 },
      { descricao: "Guia 48mm 3m", quantidade: 40, valor_unitario: 16.9 },
    ],
    percentual_pago: 1,
    status: "pagamento_completo",
    dia_venda: 2,
    dia_previsao: 12,
    vendedor: "Carlos Mendes",
    bairro: "Ininga",
    endereco: "Av. Nossa Senhora de Fátima, 1450 — Obra Residencial Vista Verde",
    observacoes: "Entregar no portão dos fundos da obra. Falar com o mestre Raimundo.",
  },
  {
    nome_cliente: "Maria das Graças Sousa",
    cpf_cnpj: "045.678.912-30",
    contato: "(86) 98812-4567",
    numero_orcamento: "ORC-0102",
    itens: [
      { descricao: "Forro PVC branco 200x6000mm", quantidade: 35, valor_unitario: 28.9 },
      { descricao: "Roda-forro PVC 6m", quantidade: 12, valor_unitario: 9.5 },
    ],
    percentual_pago: 0.5,
    status: "pagamento_parcial",
    dia_venda: 3,
    dia_previsao: 15,
    vendedor: "Ana Paula Ribeiro",
    bairro: "Mocambinho",
    endereco: "Rua das Acácias, 230, casa B",
    observacoes: "Cliente prefere entrega pela manhã.",
  },
  {
    nome_cliente: "Escritório Contábil Delta",
    cpf_cnpj: "23.456.789/0001-01",
    contato: "(86) 99933-7890",
    numero_orcamento: "ORC-0103",
    itens: [
      { descricao: "Divisória naval cristal 2,11x1,20m", quantidade: 14, valor_unitario: 189.0 },
      { descricao: "Porta para divisória naval completa", quantidade: 2, valor_unitario: 320.0 },
    ],
    percentual_pago: 0,
    status: "aguardando_pagamento",
    dia_venda: 4,
    dia_previsao: null,
    vendedor: "Carlos Mendes",
    bairro: "Centro",
    endereco: "Rua Álvaro Mendes, 890, sala 304",
    observacoes: "Aguardando aprovação do financeiro do cliente.",
  },
  {
    nome_cliente: "Francisco Oliveira Neto",
    cpf_cnpj: "112.334.556-78",
    contato: "(86) 98101-2233",
    numero_orcamento: "ORC-0104",
    itens: [
      { descricao: "Piso vinílico clicado 4mm carvalho claro (caixa 2,6m²)", quantidade: 18, valor_unitario: 245.0 },
      { descricao: "Manta para piso vinílico (rolo 10m²)", quantidade: 5, valor_unitario: 89.0 },
    ],
    percentual_pago: 1,
    status: "pagamento_completo",
    dia_venda: 5,
    dia_previsao: 10,
    vendedor: "Ana Paula Ribeiro",
    bairro: "Jóquei",
    endereco: "Rua Eliseu Martins, 1122, apto 702",
    observacoes: "Condomínio exige agendamento da entrega com 24h de antecedência.",
    entrega_registrada: true,
  },
  {
    nome_cliente: "Colégio Pequeno Príncipe",
    cpf_cnpj: "34.567.890/0001-12",
    contato: "(86) 99455-6678",
    numero_orcamento: "ORC-0105",
    itens: [
      { descricao: "Forro de gesso acartonado (placa 1,20x1,80m)", quantidade: 90, valor_unitario: 39.9 },
      { descricao: "Perfil canaleta F530 3m", quantidade: 120, valor_unitario: 14.2 },
      { descricao: "Regulador F530", quantidade: 200, valor_unitario: 1.8 },
    ],
    percentual_pago: 0.4,
    status: "pagamento_parcial",
    dia_venda: 8,
    dia_previsao: 22,
    vendedor: "José Wilson Costa",
    bairro: "Fátima",
    endereco: "Av. Barão de Gurguéia, 2540",
    observacoes: "Obra da quadra coberta. Receber na secretaria.",
  },
  {
    nome_cliente: "Raimunda Pereira da Silva",
    cpf_cnpj: "078.901.234-56",
    contato: "(86) 98877-3344",
    numero_orcamento: "ORC-0106",
    itens: [
      { descricao: "Forro PVC amadeirado 250x6000mm", quantidade: 22, valor_unitario: 36.5 },
    ],
    percentual_pago: 0,
    status: "aguardando_pagamento",
    dia_venda: 9,
    dia_previsao: null,
    vendedor: "Ana Paula Ribeiro",
    bairro: "Dirceu",
    endereco: "Quadra 12, casa 7, conjunto Itararé",
    observacoes: "",
  },
  {
    nome_cliente: "Clínica Odonto Sorriso",
    cpf_cnpj: "45.678.901/0001-23",
    contato: "(86) 99211-9090",
    numero_orcamento: "ORC-0107",
    itens: [
      { descricao: "Placa de drywall resistente à umidade (RU) 1,20x1,80m", quantidade: 30, valor_unitario: 58.9 },
      { descricao: "Massa para junta 28kg", quantidade: 6, valor_unitario: 75.0 },
      { descricao: "Fita para junta 150m", quantidade: 4, valor_unitario: 32.0 },
    ],
    percentual_pago: 1,
    status: "pagamento_completo",
    dia_venda: 10,
    dia_previsao: 18,
    vendedor: "Carlos Mendes",
    bairro: "Horto",
    endereco: "Rua Anfrísio Lobão, 455, sala 2",
    observacoes: "Reforma dos consultórios. Entregar antes das 8h se possível.",
  },
  {
    nome_cliente: "Supermercado Bom Preço",
    cpf_cnpj: "56.789.012/0001-34",
    contato: "(86) 99344-5566",
    numero_orcamento: "ORC-0108",
    itens: [
      { descricao: "Divisória eucatex miolo colmeia 2,11x1,20m", quantidade: 25, valor_unitario: 145.0 },
      { descricao: "Perfil H para divisória 3m", quantidade: 30, valor_unitario: 22.5 },
    ],
    percentual_pago: 0.6,
    status: "pagamento_parcial",
    dia_venda: 12,
    dia_previsao: 25,
    vendedor: "José Wilson Costa",
    bairro: "Piçarra",
    endereco: "Av. Miguel Rosa, 3210 — depósito lateral",
    observacoes: "Ampliação do escritório administrativo.",
  },
  {
    nome_cliente: "Antônio Carlos Barbosa",
    cpf_cnpj: "234.567.890-11",
    contato: "(86) 98123-7788",
    numero_orcamento: "ORC-0109",
    itens: [
      { descricao: "Piso vinílico em manta 2mm cinza (rolo 20m²)", quantidade: 3, valor_unitario: 980.0 },
      { descricao: "Cola para piso vinílico 4kg", quantidade: 4, valor_unitario: 110.0 },
    ],
    percentual_pago: 0,
    status: "aguardando_pagamento",
    dia_venda: 15,
    dia_previsao: null,
    vendedor: "Ana Paula Ribeiro",
    bairro: "São Cristóvão",
    endereco: "Rua Desembargador Berilo Mota, 670",
    observacoes: "Cliente vai confirmar a metragem antes de pagar.",
  },
  {
    nome_cliente: "Pousada Rio Poty",
    cpf_cnpj: "67.890.123/0001-45",
    contato: "(86) 99560-1122",
    numero_orcamento: "ORC-0110",
    itens: [
      { descricao: "Forro PVC branco 200x6000mm", quantidade: 120, valor_unitario: 27.9 },
      { descricao: "Roda-forro PVC 6m", quantidade: 40, valor_unitario: 9.5 },
      { descricao: "Emenda H PVC 6m", quantidade: 25, valor_unitario: 8.9 },
    ],
    percentual_pago: 1,
    status: "pagamento_completo",
    dia_venda: 17,
    dia_previsao: 26,
    vendedor: "Carlos Mendes",
    bairro: "Morada do Sol",
    endereco: "Av. Marechal Castelo Branco, 1880",
    observacoes: "Reforma dos quartos do bloco B. Receber com o gerente Edson.",
  },
  {
    nome_cliente: "Luciana Martins Andrade",
    cpf_cnpj: "345.678.901-22",
    contato: "(86) 98890-4455",
    numero_orcamento: "ORC-0111",
    itens: [
      { descricao: "Placa de drywall standard 1,20x1,80m", quantidade: 20, valor_unitario: 42.9 },
      { descricao: "Montante 70mm 3m", quantidade: 25, valor_unitario: 21.9 },
      { descricao: "Guia 70mm 3m", quantidade: 12, valor_unitario: 19.5 },
      { descricao: "Lã de vidro (rolo 12,5m²)", quantidade: 2, valor_unitario: 189.0 },
    ],
    percentual_pago: 0.3,
    status: "pagamento_parcial",
    dia_venda: 19,
    dia_previsao: 28,
    vendedor: "José Wilson Costa",
    bairro: "Vermelha",
    endereco: "Rua Coelho Rodrigues, 95",
    observacoes: "Parede com isolamento acústico para home office.",
  },
  {
    nome_cliente: "Igreja Batista Central",
    cpf_cnpj: "78.901.234/0001-56",
    contato: "(86) 99677-8899",
    numero_orcamento: "ORC-0112",
    itens: [
      { descricao: "Forro de gesso acartonado (placa 1,20x1,80m)", quantidade: 150, valor_unitario: 39.9 },
      { descricao: "Perfil canaleta F530 3m", quantidade: 180, valor_unitario: 14.2 },
      { descricao: "Pendural com regulador", quantidade: 300, valor_unitario: 2.1 },
    ],
    percentual_pago: 0,
    status: "aguardando_pagamento",
    dia_venda: 23,
    dia_previsao: null,
    vendedor: "Carlos Mendes",
    bairro: "Santa Isabel",
    endereco: "Rua Sete de Setembro, 1300",
    observacoes: "Aguardando liberação da tesouraria da igreja.",
  },
];

export function criarVendasMock(): Venda[] {
  return seeds.map((seed, idx) => {
    const valorTotal = somaItens(seed.itens);
    const dataVenda = isoNoMesAtual(seed.dia_venda);
    return {
      id: `venda-mock-${idx + 1}`,
      nome_cliente: seed.nome_cliente,
      cpf_cnpj: seed.cpf_cnpj,
      contato: seed.contato,
      numero_orcamento: seed.numero_orcamento,
      itens: seed.itens,
      valor_total: valorTotal,
      valor_pago: Math.round(valorTotal * seed.percentual_pago * 100) / 100,
      status: seed.status,
      data_venda: dataVenda,
      previsao_entrega: seed.dia_previsao !== null ? isoNoMesAtual(seed.dia_previsao) : null,
      vendedor: seed.vendedor,
      bairro: seed.bairro,
      endereco: seed.endereco,
      observacoes: seed.observacoes,
      entrega_registrada: seed.entrega_registrada ?? false,
      created_at: `${dataVenda}T09:00:00.000Z`,
    };
  });
}
