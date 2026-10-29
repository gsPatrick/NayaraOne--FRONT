// Parâmetros dos read models e dos indicadores de Tecnologia no BI (Marco 9, M9-D628 e M9-D680): Disponibilidade, Filas e DLQ, Integrações com erro, Freshness dos dados do BI, Falhas
// de autenticação e Eventos bloqueados. A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
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
  {
    title: "Tecnologia: qualidade e responsáveis dos indicadores",
    subtitle: "Quando o dado técnico deixa de ser confiável e quem responde por cada indicador. O número é calculado no servidor; aqui você ajusta os limites.",
    fields: [
      {
        key: "analytics.tec.sondas_ausentes_max_pct",
        label: "Sondas ausentes aceitas (%)",
        type: "number",
        defaultValue: 5,
        helper: "De 0 a 100. Acima deste percentual de sondas que não mediram, Disponibilidade aparece como \"Dado incompleto\", sem número. Padrão: 5.",
      },
      {
        key: "analytics.tec.fila_sem_medicao_min",
        label: "Minutos sem medir a fila até marcar como desatualizada",
        type: "number",
        defaultValue: 15,
        helper: "De 1 a 1440. Filas e DLQ sem medição há mais minutos que isto aparecem como desatualizadas, com o valor da última medição. Padrão: 15.",
      },
      {
        key: "analytics.tec.janela_minutos",
        label: "Janela da taxa de erro das integrações (minutos)",
        type: "number",
        defaultValue: 60,
        helper: "De 1 a 10080, entre as janelas que o monitor de saúde grava (5, 60 e 1440). Sem chamadas na janela, Integrações com erro aparece como \"Dado incompleto\". Padrão: 60 (última hora).",
      },
      {
        key: "analytics.tec.auth_falhas_por_hora",
        label: "Falhas de autenticação por hora que geram alerta",
        type: "number",
        defaultValue: 20,
        helper: "De 1 a 100000. Pico de falhas de login, MFA ou integração numa mesma hora acima disto liga o alerta de Falhas de autenticação. Padrão: 20.",
      },
      {
        key: "analytics.tec.motivos_bloqueio_conhecidos",
        label: "Motivos de bloqueio com linha própria",
        type: "text",
        defaultValue: "KILL_SWITCH,SECURITY_POLICY,CONSENT,VALIDATION",
        helper: "Códigos em maiúsculas separados por vírgula. Os demais motivos somam em \"outros\". Padrão: kill switch, política de segurança, consentimento e validação.",
      },
      owner("analytics.owner.tec.availability", "Disponibilidade"),
      owner("analytics.owner.tec.queues_dlq", "Filas e DLQ"),
      owner("analytics.owner.tec.integration_errors", "Integrações com erro"),
      owner("analytics.owner.tec.freshness", "Freshness dos dados do BI"),
      owner("analytics.owner.tec.auth_failures", "Falhas de autenticação"),
      owner("analytics.owner.tec.blocked_events", "Eventos bloqueados"),
    ],
  },
];
