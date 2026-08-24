import { NAV_SECTIONS } from "@/app/painel/_nav";

const MODULE_RESULTS = NAV_SECTIONS.flatMap((section) =>
  section.items
    .filter((item) => !item.soon)
    .map((item) => ({ ...item, group: "Módulos" }))
);

// Índice de exemplo — hoje aponta para a listagem do módulo (não há rota de
// detalhe por item ainda). Quando a busca ligar na API real, cada entrada
// vira uma chamada a um endpoint de busca por entidade.
const ENTITY_RESULTS = [
  { label: "Edifício Aurora — Apto 302", href: "/painel/imoveis", icon: "building", group: "Imóveis" },
  { label: "Cobertura Vista Verde — Apto 1801", href: "/painel/imoveis", icon: "building", group: "Imóveis" },
  { label: "Sala Comercial Centro — 12B", href: "/painel/imoveis", icon: "building", group: "Imóveis" },
  { label: "Marina Costa", href: "/painel/pessoas", icon: "users", group: "Contatos" },
  { label: "Renata Souza", href: "/painel/pessoas", icon: "users", group: "Contatos" },
  { label: "João Pereira (proprietário)", href: "/painel/pessoas", icon: "users", group: "Contatos" },
  { label: "Oportunidade — Marina Costa · Zona Sul", href: "/painel/crm", icon: "chart", group: "CRM" },
  { label: "Contrato #4021 — Edifício Aurora", href: "/painel/crm", icon: "document", group: "CRM" },
  { label: "Radar — Apartamento 2 quartos, Zona Sul", href: "/painel/radar", icon: "radar", group: "Radar" },
];

export const SEARCH_INDEX = [...MODULE_RESULTS, ...ENTITY_RESULTS];
