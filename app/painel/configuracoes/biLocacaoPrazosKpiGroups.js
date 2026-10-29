// Parâmetros dos indicadores de prazos da Locação no BI (Marco 9, M9-D641): Garantias vencendo, Obrigações pendentes e Vistorias e chaves. A API valida (SETTINGS_SCHEMA); o padrão
// mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const OWNER = "Gerência de Locação (papel locação-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue: OWNER, helper: HELPER });

export const BI_LOCACAO_PRAZOS_KPI_GROUPS = [
  {
    title: "Locação: garantias, obrigações, vistorias e chaves — qualidade e responsáveis",
    subtitle: "Garantias vencendo, obrigações pendentes e vistorias e chaves. O número é calculado no servidor; aqui você ajusta quais garantias não têm data de vencimento e quem responde por cada indicador. Os tipos de contrato que contam como locação são os do grupo de Locação.",
    fields: [
      {
        key: "analytics.locacao.garantias_sem_vencimento",
        label: "Tipos de garantia que não têm vencimento",
        type: "text",
        defaultValue: "DEPOSIT",
        helper: "Códigos em maiúsculas separados por vírgula (GUARANTOR, INSURANCE, DEPOSIT, CAPITALIZATION_TITLE). Garantia desses tipos sem data não deixa Garantias vencendo como \"Dado incompleto\"; as demais sem data deixam. Padrão: DEPOSIT (caução em dinheiro).",
      },
      owner("analytics.owner.rent.guarantees_expiring", "Garantias vencendo"),
      owner("analytics.owner.rent.obligations_pending", "Obrigações pendentes"),
      owner("analytics.owner.rent.inspections_keys", "Vistorias e chaves"),
    ],
  },
];
