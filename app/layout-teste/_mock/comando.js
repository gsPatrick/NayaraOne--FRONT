// Dados FICTÍCIOS do Centro de Comando.
export const SAUDE = { nota: 82, variacao: "+3 pts vs. semana anterior", periodo: "Últimos 30 dias", empresa: "Grupo consolidado", status: "Saudável" };

export const CAIXA = {
  livre: 1284350, aPagar: 412780.5, aReceber: 689200, serie: [1020, 1080, 1010, 1150, 1190, 1130, 1210, 1260, 1240, 1284],
  terceiros: [
    ["Caução de locação (12 contratos)", 186400],
    ["Repasses de aluguel a proprietários", 94250.8],
    ["Recursos de clientes em conta vinculada", 51000],
  ],
};
export const ATRASO = [
  { label: "Inadimplência", valor: "4,8%", delta: { text: "0,6 p.p. vs. mês anterior", good: false, dir: "up" } },
  { label: "Obras com atraso", valor: "3", delta: { text: "1 a mais que a semana passada", good: false, dir: "up" } },
  { label: "Contratos a vencer (60 dias)", valor: "11", delta: { text: "2 a menos", good: true, dir: "down" } },
];
export const PARADO = { total: 79000, partes: [
  ["Estoque sem giro há mais de 90 dias", 31200],
  ["Parcelas vencidas sem régua de cobrança", 24800],
  ["Adiantamentos a fornecedores sem nota", 15500],
  ["Sinais de proposta expirados", 7500],
] };

export const DECISOES = [
  { tipo: "Aprovação financeira", titulo: "Pagamento ao fornecedor Cimento Paulista", valor: 48320, quem: "Diego Martins", idade: "2 h" },
  { tipo: "Ajuste de estoque", titulo: "Baixa por perda: 38 sacos de argamassa", valor: 1976, quem: "Paulo Henrique", idade: "5 h" },
  { tipo: "Aprovação de regra", titulo: "Alçada de reembolso até R$ 1.500,00", valor: null, quem: "Camila Duarte", idade: "1 dia" },
  { tipo: "Proposta da NAY", titulo: "Renegociar 4 parcelas vencidas do contrato LC-0388", valor: 6240, quem: "NAY", idade: "1 dia" },
  { tipo: "Aprovação financeira", titulo: "Estorno de comissão FC-2026-0394", valor: 3120, quem: "Marina Albuquerque", idade: "2 dias" },
  { tipo: "Proposta da NAY", titulo: "Reajustar aluguel IMV-0954 pelo IGP-M", valor: 420, quem: "NAY", idade: "3 dias" },
];
export const TIPO_TONE = { "Aprovação financeira": "warning", "Ajuste de estoque": "info", "Aprovação de regra": "neutral", "Proposta da NAY": "brand" };

export const RECOMENDACOES = [
  { texto: "Antecipar R$ 120.000,00 de recebíveis para cobrir o pico de pagamentos da semana 4.", fonte: "Fluxo de caixa 12 semanas", conf: 86 },
  { texto: "Acionar a régua de cobrança para 9 contratos com atraso entre 15 e 30 dias.", fonte: "Financeiro · Cobrança", conf: 91 },
  { texto: "Transferir 120 unidades de piso parado do depósito Norte para a obra Alameda.", fonte: "Estoque · Giro", conf: 72 },
];
export const OPORTUNIDADES = [
  { nome: "Família Rezende · compra de 3 dormitórios", etapa: "Proposta enviada", valor: 890000, dias: 2 },
  { nome: "Construtora Vértice · lote comercial", etapa: "Negociação", valor: 2450000, dias: 5 },
  { nome: "Helena Brandão · locação Pinheiros", etapa: "Visita agendada", valor: 7800, dias: 1 },
  { nome: "Investidor Sampaio · 4 studios", etapa: "Qualificação", valor: 1320000, dias: 9 },
];
export const FLUXO = [
  [310, 296], [325, 340], [298, 281], [352, 366], [340, 322], [376, 384], [361, 349], [388, 402], [372, 379], [401, 395], [395, 410], [420, 405],
].map(([prev, real], i) => ({ w: i + 1, prev: prev * 1000, real: i < 9 ? real * 1000 : null }));

export const ALERTAS = [
  { sev: "CRÍTICO", texto: "Obra Alameda 214 com 18 dias de atraso e medição bloqueada", quando: "há 12 min" },
  { sev: "ALTO", texto: "Conciliação bancária com 23 lançamentos sem par há 5 dias", quando: "há 1 h" },
  { sev: "ALTO", texto: "Certificado digital da matriz vence em 6 dias", quando: "há 3 h" },
  { sev: "MÉDIO", texto: "Integração com a Caixa respondeu lenta 4 vezes hoje", quando: "há 4 h" },
  { sev: "MÉDIO", texto: "3 contratos de locação sem índice de reajuste definido", quando: "ontem" },
];
export const SEV_TONE = { "CRÍTICO": "danger", ALTO: "warning", "MÉDIO": "info" };

export const OBRAS = [
  { nome: "Residencial Alameda 214", fase: "Acabamento", pct: 78, prazo: "12/12/2026", atraso: 18, orcado: 3480000, gasto: 3012000 },
  { nome: "Torre Jardins Comercial", fase: "Estrutura", pct: 46, prazo: "30/04/2027", atraso: 0, orcado: 9200000, gasto: 4120000 },
  { nome: "Casas Vila Verde (8 un.)", fase: "Fundação", pct: 22, prazo: "15/03/2027", atraso: 6, orcado: 2150000, gasto: 505000 },
  { nome: "Reforma Edifício Aurora", fase: "Instalações", pct: 61, prazo: "20/01/2027", atraso: 0, orcado: 1280000, gasto: 760000 },
  { nome: "Galpão Logístico Cotia", fase: "Cobertura", pct: 89, prazo: "05/11/2026", atraso: 9, orcado: 4600000, gasto: 4390000 },
];
export const QUALIDADE = [
  { fonte: "Financeiro (ERP)", min: 7, estado: "FRESCO" },
  { fonte: "Extratos bancários", min: 14, estado: "FRESCO" },
  { fonte: "CRM", min: 22, estado: "FRESCO" },
  { fonte: "Obras (medições)", min: 1440, estado: "DEFASADO" },
  { fonte: "Estoque", min: 55, estado: "FRESCO" },
  { fonte: "Integração Caixa", min: 380, estado: "DEFASADO" },
];
