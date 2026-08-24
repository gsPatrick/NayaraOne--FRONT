// Dados 100% mockados — alinhado a core.companies / core.units (Caderno Técnico).
// Nomes de campo confirmados nos models Sequelize: Company.name, Company.legalName, Company.taxId
// (CNPJ), Company.status; Unit.name, Unit.code, Unit.status. Unit NÃO tem campo de endereço no
// schema confirmado — removido do mock (era um campo inventado nas versões anteriores).

export const COMPANIES = [
  {
    id: "company-1",
    name: "Nayara Imóveis",
    legalName: "Nayara Imóveis Ltda.",
    taxId: "45.112.998/0001-30",
    status: "ACTIVE",
    createdAt: "2015-08-01T00:00:00Z",
    units: [
      { id: "unit-1", name: "Matriz — Zona Sul", code: "MTZ-01", status: "ACTIVE" },
      { id: "unit-2", name: "Filial — Campinas", code: "FIL-02", status: "ACTIVE" },
      { id: "unit-3", name: "Filial — Sorocaba", code: "FIL-03", status: "ACTIVE" },
    ],
  },
  {
    id: "company-2",
    name: "Nayara Construções",
    legalName: "Nayara Construções e Empreendimentos S.A.",
    taxId: "51.887.221/0001-05",
    status: "ACTIVE",
    createdAt: "2019-03-10T00:00:00Z",
    units: [
      { id: "unit-4", name: "Escritório de Obras — Guarulhos", code: "OBR-01", status: "ACTIVE" },
      { id: "unit-5", name: "Canteiro — Vista Verde", code: "OBR-02", status: "ACTIVE" },
    ],
  },
  {
    id: "company-3",
    name: "Nayara Administração Predial",
    legalName: "Nayara Administração Predial Ltda.",
    taxId: "39.664.110/0001-77",
    status: "INACTIVE",
    createdAt: "2012-01-20T00:00:00Z",
    units: [
      { id: "unit-6", name: "Escritório Central", code: "ADM-01", status: "INACTIVE" },
      { id: "unit-7", name: "Posto de Atendimento — Moema", code: "ADM-02", status: "INACTIVE" },
      { id: "unit-8", name: "Posto de Atendimento — Centro", code: "ADM-03", status: "INACTIVE" },
      { id: "unit-9", name: "Depósito de Documentos", code: "ADM-04", status: "INACTIVE" },
    ],
  },
];

export const COMPANY_STATUS_LABELS = { ACTIVE: "Ativa", INACTIVE: "Inativa" };
export const UNIT_STATUS_LABELS = { ACTIVE: "Ativa", INACTIVE: "Inativa" };
