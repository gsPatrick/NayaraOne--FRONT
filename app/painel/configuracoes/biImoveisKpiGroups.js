// Parâmetros dos KPIs de visitas, propostas, imóveis ativos, imóveis sem venda por período e mudanças de preço no BI (Marco 9, M9-D632). Padrões do
// livro e de Maturacao/demandas/parametros.csv; a API valida e audita. O valor de cada indicador é calculado no servidor: aqui o administrador só
// define quem confere cada número. As faixas de dias dos imóveis sem venda estão em "Imóveis sem venda".
const OWNER_DEFAULT = "Gerência Comercial (papel comercial-gestor)";
const owner = (code, label) => ({
  key: `analytics.owner.${code}`,
  label: `Responsável por "${label}"`,
  type: "text",
  defaultValue: OWNER_DEFAULT,
  helper: "Papel que confere o número deste indicador com o CRM e o cadastro de imóveis. Vale a partir do próximo indicador publicado; mudar o responsável de um indicador já publicado exige nova versão.",
});

export const BI_IMOVEIS_KPI_GROUPS = [
  {
    title: "Visitas, propostas e imóveis: responsáveis pelos indicadores",
    subtitle: "Quem responde pela conferência de cada indicador de atividade comercial, carteira de imóveis e preços.",
    fields: [
      owner("crm.visits", "Visitas"),
      owner("crm.proposals", "Propostas"),
      owner("prop.active_properties", "Imóveis ativos"),
      owner("prop.without_sale_by_period", "Imóveis sem venda por período"),
      owner("prop.price_changes", "Preço e mudanças de preço"),
    ],
  },
];
