// Parâmetros dos indicadores da carteira de Locação no BI (Marco 9, M9-D640): Contratos de locação ativos, Vacância e Inadimplência da locação. A API valida (SETTINGS_SCHEMA); o padrão
// mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada. A janela e as faixas de atraso da inadimplência são as do grupo do Financeiro.
const OWNER = "Gerência de Locação (papel locação-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue: OWNER, helper: HELPER });

export const BI_LOCACAO_CARTEIRA_KPI_GROUPS = [
  {
    title: "Locação: contratos ativos, vacância e inadimplência — faixas e responsáveis",
    subtitle: "Quantos contratos estão valendo, que parte dos imóveis está vaga e quanto do aluguel está em atraso. O número é calculado no servidor; aqui você ajusta as faixas de valor do aluguel e quem responde por cada indicador. A janela e as faixas de atraso da inadimplência são as do grupo de inadimplência do Financeiro.",
    fields: [
      {
        key: "analytics.locacao.faixas_valor_aluguel",
        label: "Faixas de valor do aluguel mensal (R$)",
        type: "text",
        defaultValue: "2000,5000,10000",
        helper: "De 1 a 6 limites crescentes em reais separados por vírgula. Com 2000,5000,10000 as faixas são até 2000, 2001 a 5000, 5001 a 10000 e acima de 10000. Padrão: 2000,5000,10000.",
      },
      owner("analytics.owner.rent.active_contracts", "Contratos de locação ativos"),
      owner("analytics.owner.rent.vacancy", "Vacância"),
      owner("analytics.owner.rent.delinquency", "Inadimplência da locação"),
    ],
  },
];
