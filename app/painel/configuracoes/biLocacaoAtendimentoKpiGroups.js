// Parâmetros dos indicadores de chamados, satisfação e repasses da Locação no BI (Marco 9, M9-D642): Chamados da locação, Satisfação da locação e Repasses de locação. A API valida
// (SETTINGS_SCHEMA); o padrão mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const OWNER = "Gerência de Locação (papel locação-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue: OWNER, helper: HELPER });

export const BI_LOCACAO_ATENDIMENTO_KPI_GROUPS = [
  {
    title: "Locação: chamados, satisfação e repasses — responsáveis",
    subtitle: "Chamados da locação, Satisfação da locação e Repasses de locação. O número é calculado no servidor; aqui você define quem responde por cada indicador. A amostra mínima da satisfação é a do grupo de qualidade (amostra mínima), o prazo do repasse e a nota de cada tipo de registro de atendimento são os do grupo de Locação.",
    fields: [
      owner("analytics.owner.rent.tickets", "Chamados da locação"),
      owner("analytics.owner.rent.satisfaction", "Satisfação da locação"),
      owner("analytics.owner.rent.repasses", "Repasses de locação"),
    ],
  },
];
