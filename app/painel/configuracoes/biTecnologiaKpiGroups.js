// Parâmetros dos read models e dos indicadores de Tecnologia no BI (Marco 9, M9-D628): sondas de saúde, intervalo, histórico e retenção dos sinais técnicos. A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const OWNER = "Tecnologia (papel ti-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue: OWNER, helper: HELPER });

export const BI_TECNOLOGIA_KPI_GROUPS = [
  {
    title: "Tecnologia: sondas de saúde e histórico",
    subtitle: "As sondas do ERP (API, banco, fila e storage) e quanto histórico os indicadores técnicos guardam. Os sinais são do sistema inteiro, não de uma empresa; valem os parâmetros da empresa com o menor intervalo e a união das sondas.",
    fields: [
      {
        key: "analytics.tec.sondas",
        label: "Sondas de saúde ligadas",
        type: "text",
        defaultValue: "API,DATABASE,QUEUE,STORAGE",
        helper: "Códigos em maiúsculas separados por vírgula (API, DATABASE, QUEUE, STORAGE). Sonda ligada que nunca mediu deixa Disponibilidade como \"Dado incompleto\". Padrão: as quatro.",
      },
      {
        key: "analytics.tec.intervalo_sonda_s",
        label: "Intervalo entre as sondas (segundos)",
        type: "number",
        defaultValue: 60,
        helper: "De 5 a 3600. Também define quantas sondas eram esperadas no dia: o que faltou conta como ausente. Padrão: 60 (a cada minuto).",
      },
      {
        key: "analytics.tec.historico_dias",
        label: "Dias de histórico dos indicadores técnicos e de IA",
        type: "number",
        defaultValue: 35,
        helper: "De 1 a 366. Sondas, bloqueios, falhas de autenticação, custo e qualidade da IA mantidos nos read models. Padrão: 35 (cobre o mês inteiro).",
      },
      {
        key: "analytics.tec.sinais_retencao_dias",
        label: "Dias que o registro de sinais técnicos é mantido",
        type: "number",
        defaultValue: 40,
        helper: "De 1 a 3650. O registro de sondas e de falhas de login e MFA (só com hash, sem e-mail nem IP) é apagado depois deste prazo. Padrão: 40, acima do histórico.",
      },
    ],
  },
];
