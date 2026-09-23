// Marcos do projeto Nayara One — dados extraídos da documentação de maturação
// (pasta Maturacao/, fora deste repositório): 04_MAPA_DE_MARCOS_E_CRITERIOS_DE_ACEITE.md
// (definição contratual dos 10 marcos) e 06_HOMOLOGACAO_M3_M4_M5_STATUS.md
// (status de homologação, rodada mais recente em 18/09/2026).

export const ROADMAP_STATUS = {
  CONCLUIDO: "concluido",
  HOMOLOGACAO: "homologacao",
  PLANEJADO: "planejado",
};

export const ROADMAP_STATUS_LABEL = {
  [ROADMAP_STATUS.CONCLUIDO]: "Concluído",
  [ROADMAP_STATUS.HOMOLOGACAO]: "Em homologação",
  [ROADMAP_STATUS.PLANEJADO]: "Planejado",
};

export const ROADMAP_STATUS_TONE = {
  [ROADMAP_STATUS.CONCLUIDO]: "success",
  [ROADMAP_STATUS.HOMOLOGACAO]: "warning",
  [ROADMAP_STATUS.PLANEJADO]: "neutral",
};

export const ROADMAP_MARCOS = [
  {
    slug: "marco-1",
    numero: 1,
    nome: "Fundação Executável",
    status: ROADMAP_STATUS.CONCLUIDO,
    resumo: "Base técnica do sistema: repositório, ambientes, banco de dados e segurança multiempresa.",
    entregas: [
      "Repositório, ambientes (dev/homologação/produção) e pipeline de CI/CD",
      "Banco de dados PostgreSQL com migrations reproduzíveis",
      "Controle de acesso (IAM) com papéis e permissões",
      "Isolamento de dados entre empresas (RLS/FORCE RLS) em todas as tabelas sensíveis",
      "Auditoria de ações do sistema",
      "Primeira fatia funcional de ponta a ponta (vertical slice)",
    ],
  },
  {
    slug: "marco-2",
    numero: 2,
    nome: "Núcleo Técnico",
    status: ROADMAP_STATUS.CONCLUIDO,
    resumo: "Motores internos que sustentam regras de negócio e comunicação entre módulos do sistema.",
    entregas: [
      "Motor de Regras de negócio configurável",
      "Motor de Eventos para comunicação entre módulos",
      "Registries centrais de tipos e configurações",
      "Outbox/Inbox para garantir entrega confiável de eventos",
      "Idempotência em operações críticas (evita duplicidade)",
      "Observabilidade (logs estruturados) e base de testes automatizados",
    ],
  },
  {
    slug: "marco-3",
    numero: 3,
    nome: "Pessoas, Empresas, Imóveis, CRM e Radar",
    status: ROADMAP_STATUS.HOMOLOGACAO,
    resumo: "Cadastros centrais, funil comercial e radar de oportunidades — 87 critérios de aceite dos Marcos 3 a 5 já implementados e testados, aguardando aceite formal da Nayara.",
    entregas: [
      "Cadastro de pessoas e empresas com deduplicação automática",
      "Cadastro de imóveis, ofertas e histórico de preços",
      "Funil de oportunidades do CRM com tarefas e timeline unificada (mensagens, visitas, propostas, mudanças de etapa)",
      "Módulo de Propostas comerciais",
      "Radar de oportunidades determinístico com motivos de ganho/perda/desistência",
      "Painel de indicadores e dashboard de CRM",
      "Central de feedback e reclamações",
      "Exportação auditada de dados do módulo",
      "Testes de aceite automatizados cobrindo os 25 critérios contratuais do marco",
    ],
  },
  {
    slug: "marco-4",
    numero: 4,
    nome: "Financeiro",
    status: ROADMAP_STATUS.HOMOLOGACAO,
    resumo: "Ledger financeiro, contas a pagar/receber, aprovações e conciliação bancária — implementado e testado, aguardando aceite formal da Nayara.",
    entregas: [
      "Ledger financeiro append-only (lançamentos não podem ser apagados, só estornados)",
      "Contas a pagar e a receber com plano de contas",
      "Aprovações em duas etapas (maker-checker) com bloqueio de autoaprovação",
      "Conciliação bancária com bloqueio de divergência e duplicidade",
      "Conciliação N:N entre lançamentos e transações bancárias",
      "Comissões e repasses versionados por regra",
      "Segregação contábil de caução e transferências formais entre empresas",
      "Fechamento mensal com bloqueio de período e relatório de saúde financeira",
      "Testes de aceite automatizados cobrindo os 28 critérios contratuais do marco",
    ],
  },
  {
    slug: "marco-5",
    numero: 5,
    nome: "Contratos e Locação",
    status: ROADMAP_STATUS.HOMOLOGACAO,
    resumo: "Contratos de locação, cobrança, vistorias e módulo jurídico — implementado e testado, aguardando aceite formal da Nayara.",
    entregas: [
      "Contratos de locação com máquina de estados e gates de assinatura",
      "Assinatura eletrônica integrada (Clicksign e ZapSign) com webhook e token criptografado",
      "Templates e biblioteca de cláusulas contratuais",
      "Vistorias completas com fotos/vídeos, assinatura digital, laudo em PDF com hash e orçamento de danos",
      "Entrega de chaves vinculada ao contrato real do tenant",
      "Módulo jurídico com alertas proativos de prazos e escalonamento",
      "Dossiê de prova exportável e verificável (cadeia de custódia)",
      "Jornadas completas testadas de ponta a ponta: locação (proposta → contrato → garantia → assinatura → vistoria → chaves) e jurídico (processo → prazo → alerta → escalonamento → dossiê → encerramento)",
      "Testes de aceite automatizados cobrindo os 34 critérios contratuais do marco",
    ],
  },
  {
    slug: "marco-6",
    numero: 6,
    nome: "Obras e Pós-obra",
    status: ROADMAP_STATUS.HOMOLOGACAO,
    resumo: "Gestão de obras, diário de obra (RDO), medições, orçamento, qualidade e acompanhamento pós-entrega — implementado e integrado à API real, aguardando aceite formal da Nayara.",
    entregas: [
      "Cadastro e acompanhamento de obras com visão geral e ficha de detalhe",
      "Etapas da obra com medições e controle de datas planejadas x reais",
      "Relatório Diário de Obra (RDO) com efetivo, ocorrências e clima",
      "Orçamento e controle de custos por linha (planejado x realizado)",
      "Controle de qualidade da obra",
      "Módulo Pós-obra: chamados de garantia com prazo, status e acompanhamento até resolução",
    ],
  },
  {
    slug: "marco-7",
    numero: 7,
    nome: "Estoque, Patrimônio e Compras",
    status: ROADMAP_STATUS.PLANEJADO,
    resumo: "Depósitos e estoque, controle de ferramentas via QR Code, patrimônio, compras e fornecedores.",
    entregas: [],
  },
  {
    slug: "marco-8",
    numero: 8,
    nome: "Correspondente e Fiscal",
    status: ROADMAP_STATUS.PLANEJADO,
    resumo: "Correspondente bancário, emissão fiscal (NFS-e, DIMOB) e integrações contábeis.",
    entregas: [],
  },
  {
    slug: "marco-9",
    numero: 9,
    nome: "NAY, Automações e BI",
    status: ROADMAP_STATUS.PLANEJADO,
    resumo: "Assistente NAY (IA), automações, canais (WhatsApp), marketing digital, BI e Centro de Comando.",
    entregas: [],
  },
  {
    slug: "marco-10",
    numero: 10,
    nome: "Migração e Produção",
    status: ROADMAP_STATUS.PLANEJADO,
    resumo: "Migração final de dados, testes de carga e segurança, backup/restore, disaster recovery e go-live.",
    entregas: [],
  },
];

export function getMarcoBySlug(slug) {
  return ROADMAP_MARCOS.find((m) => m.slug === slug) || null;
}
