const B = "/layout-teste";
// Mesmos nomes do menu do painel, reorganizados em grupos com rótulo e ícone próprio.
export const NAV = [
  { group: "Visão geral", items: [
    { label: "Painel", icon: "painel", href: B },
    { label: "Centro de Comando", icon: "comando", href: `${B}/centro-de-comando` },
    { label: "Analytics", icon: "analytics" },
  ] },
  { group: "Relacionamento", items: [
    { label: "Imóveis", icon: "imoveis" },
    { label: "Contatos", icon: "contatos" },
    { label: "CRM", icon: "crm" },
    { label: "Radar", icon: "radar" },
  ] },
  { group: "Financeiro e jurídico", items: [
    { label: "Financeiro", icon: "financeiro" },
    { label: "Correspondente", icon: "correspondente", href: `${B}/financiamentos`, also: [`${B}/caso`] },
    { label: "Contratos", icon: "contratos" },
  ] },
  { group: "Execução", items: [
    { label: "Obras", icon: "obras" },
    { label: "Estoque", icon: "estoque" },
    { label: "Compras", icon: "compras" },
  ] },
  { group: "Administração", items: [
    { label: "Integrações", icon: "integracoes" },
    { label: "Configurações", icon: "configuracoes" },
  ] },
];

export const CRUMBS = {
  [B]: ["Início"],
  [`${B}/financiamentos`]: ["Correspondente", "Financiamentos"],
  [`${B}/caso`]: ["Correspondente", "Financiamentos", "FC-2026-0412"],
  [`${B}/centro-de-comando`]: ["Visão geral", "Centro de Comando"],
};
