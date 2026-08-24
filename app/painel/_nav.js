export const NAV_SECTIONS = [
  {
    label: "Operação",
    items: [
      { label: "Painel", href: "/painel", icon: "home" },
      { label: "Imóveis", href: "/painel/imoveis", icon: "building" },
      { label: "Contatos", href: "/painel/pessoas", icon: "users" },
      { label: "CRM", href: "/painel/crm", icon: "chart" },
      { label: "Radar", href: "/painel/radar", icon: "radar" },
      {
        label: "Financeiro",
        href: "/painel/financeiro",
        icon: "money",
        children: [
          { label: "Visão geral", href: "/painel/financeiro" },
          { label: "Lançamentos", href: "/painel/financeiro/lancamentos" },
          { label: "Contas bancárias", href: "/painel/financeiro/contas-bancarias" },
          { label: "Conciliação", href: "/painel/financeiro/conciliacao" },
          { label: "Aprovações", href: "/painel/financeiro/aprovacoes" },
          { label: "Comissões & Repasses", href: "/painel/financeiro/comissoes-repasses" },
        ],
      },
      {
        label: "Contratos",
        href: "/painel/contratos",
        icon: "document",
        children: [
          { label: "Visão geral", href: "/painel/contratos" },
          { label: "Contratos", href: "/painel/contratos/lista" },
          { label: "Garantias", href: "/painel/contratos/garantias" },
          { label: "Vistorias", href: "/painel/contratos/vistorias" },
          { label: "Entrega de chaves", href: "/painel/contratos/entrega-chaves" },
          { label: "Processos jurídicos", href: "/painel/contratos/processos" },
        ],
      },
    ],
  },
  {
    label: "Administração",
    items: [
      { label: "Empresas & Unidades", href: "/painel/empresas", icon: "layers" },
      { label: "Usuários & Acessos", href: "/painel/usuarios", icon: "shield" },
    ],
  },
  {
    label: "Em breve",
    items: [
      { label: "Obras", href: "/painel/mais", icon: "settings", soon: true },
      { label: "NAY · IA", href: "/painel/mais", icon: "bell", soon: true },
    ],
  },
];

export const MOBILE_TABS = [
  { label: "Painel", href: "/painel", icon: "home" },
  { label: "Imóveis", href: "/painel/imoveis", icon: "building" },
  { label: "CRM", href: "/painel/crm", icon: "chart" },
  { label: "Financeiro", href: "/painel/financeiro", icon: "money" },
  { label: "Mais", href: "/painel/mais", icon: "dots" },
];
