// Dados 100% mockados — alinhado a core.users / core.user_memberships / core.roles.
// Campo `unit` em cada membership é OPCIONAL — alinhado a user_memberships.unit_id (nullable):
// um vínculo pode ser só de empresa (acesso corporativo, sem unidade fixa) ou também apontar
// para uma unidade/filial específica dentro daquela empresa (core.units).

export const ROLES = ["Admin", "Gerente", "Corretor", "Financeiro", "Jurídico"];

export const ROLE_TONE = {
  Admin: "brand",
  Gerente: "info",
  Corretor: "success",
  Financeiro: "warning",
  Jurídico: "neutral",
};

export const USERS = [
  {
    id: "user-1", name: "Nayara Fernandes Camargo", email: "nayara@nayaraimoveis.com.br",
    status: "Ativo", lastAccessAt: "2026-08-19T14:32:00Z",
    memberships: [{ company: "Nayara Imóveis Ltda.", role: "Admin", unit: null }],
  },
  {
    id: "user-2", name: "Renata Souza", email: "renata.souza@nayaraimoveis.com.br",
    status: "Ativo", lastAccessAt: "2026-08-19T09:10:00Z",
    memberships: [{ company: "Nayara Imóveis Ltda.", role: "Gerente", unit: "Matriz — Zona Sul" }],
  },
  {
    id: "user-3", name: "João Pereira", email: "joao.pereira@nayaraimoveis.com.br",
    status: "Ativo", lastAccessAt: "2026-08-18T17:45:00Z",
    memberships: [{ company: "Nayara Imóveis Ltda.", role: "Corretor", unit: "Filial — Campinas" }],
  },
  {
    id: "user-4", name: "Camila Rezende", email: "camila.rezende@nayaraimoveis.com.br",
    status: "Ativo", lastAccessAt: "2026-08-19T11:02:00Z",
    memberships: [{ company: "Nayara Imóveis Ltda.", role: "Financeiro", unit: "Matriz — Zona Sul" }],
  },
  {
    id: "user-5", name: "Paulo Bittencourt", email: "paulo.bittencourt@nayaraimoveis.com.br",
    status: "Suspenso", lastAccessAt: "2026-07-02T08:20:00Z",
    memberships: [{ company: "Nayara Imóveis Ltda.", role: "Corretor", unit: "Filial — Sorocaba" }],
  },
  {
    id: "user-6", name: "Beatriz Nunes", email: "beatriz.nunes@nayaraconstrucoes.com.br",
    status: "Ativo", lastAccessAt: "2026-08-17T13:55:00Z",
    memberships: [{ company: "Nayara Construções e Empreendimentos S.A.", role: "Financeiro", unit: "Escritório de Obras — Guarulhos" }],
  },
  {
    id: "user-7", name: "Ricardo Alves", email: "ricardo.alves@nayaraconstrucoes.com.br",
    status: "Ativo", lastAccessAt: "2026-08-15T16:40:00Z",
    memberships: [{ company: "Nayara Construções e Empreendimentos S.A.", role: "Gerente", unit: null }],
  },
  {
    id: "user-8", name: "Diego Martins", email: "diego.martins@nayaraadm.com.br",
    status: "Ativo", lastAccessAt: "2026-08-10T10:15:00Z",
    memberships: [
      { company: "Nayara Administração Predial Ltda.", role: "Jurídico", unit: "Escritório Central" },
      { company: "Nayara Imóveis Ltda.", role: "Jurídico", unit: null },
    ],
  },
];
