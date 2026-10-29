// Parâmetros dos indicadores de Marketing no BI (Marco 9, M9-D670 e M9-D671). A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de
// Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
const OWNER_MKT = "Marketing (papel marketing-gestor)";
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue: OWNER_MKT, helper: HELPER });

export const BI_MARKETING_KPI_GROUPS = [
  {
    title: "Marketing: campanhas, custo, leads e atribuição",
    subtitle: "Campanhas ativas e encerradas, custo de marketing, leads e custo por lead. O número é calculado no servidor; aqui você ajusta quando o dado deixa de ser confiável e quem responde por cada indicador.",
    fields: [
      {
        key: "analytics.qualidade.max_sem_campanha_pct",
        label: "Leads de marketing sem campanha aceitos (%)",
        type: "number",
        defaultValue: 20,
        helper: "De 0 a 100. Se a parte dos leads de marketing do mês que não veio de nenhuma campanha passar disto, Leads de marketing aparece como \"Dado incompleto\", sem número. Padrão: 20.",
      },
      {
        key: "analytics.qualidade.max_fora_janela_pct",
        label: "Vendas fora da janela de atribuição aceitas (%)",
        type: "number",
        defaultValue: 100,
        helper: "De 0 a 100. Venda sem toque de campanha dentro da janela do Marketing fica fora do cálculo do custo por lead e é só contada. Se a parte delas passar disto, Atribuição e custo por lead aparece como \"Dado incompleto\". Padrão: 100 (só conta).",
      },
      owner("analytics.owner.mkt.campaigns", "Campanhas ativas e encerradas"),
      owner("analytics.owner.mkt.cost", "Custo de marketing"),
      owner("analytics.owner.mkt.leads", "Leads de marketing"),
      owner("analytics.owner.mkt.attribution", "Atribuição e custo por lead"),
    ],
  },
  {
    title: "Marketing: entregabilidade, opt-out, frequência e automações",
    subtitle: "Mensagens entregues, pedidos para sair, frequência de contato e automações bloqueadas ou com falha. O número é calculado no servidor; aqui você ajusta a janela da frequência, o prazo do status de entrega e quem responde por cada indicador.",
    fields: [
      {
        key: "analytics.frequencia.janela_dias",
        label: "Janela da frequência de contato (dias)",
        type: "number",
        defaultValue: 7,
        helper: "De 1 a 90. A média de mensagens por pessoa alcançada é calculada nesta janela, que termina no dia consultado. Ao mudar, o número volta a aparecer depois do próximo recálculo da noite. O teto de mensagens por pessoa continua sendo o do Marketing. Padrão: 7.",
      },
      {
        key: "analytics.qualidade.mkt_entrega_max_horas",
        label: "Horas sem status de entrega aceitas",
        type: "number",
        defaultValue: 24,
        helper: "De 1 a 720. Se uma mensagem de marketing ficar mais horas que isto sem receber o status de entrega, Entregabilidade aparece como \"Dado incompleto\", sem número. Padrão: 24.",
      },
      owner("analytics.owner.mkt.deliverability", "Entregabilidade"),
      owner("analytics.owner.mkt.opt_out", "Opt-out"),
      owner("analytics.owner.mkt.frequency", "Frequência de contato"),
      owner("analytics.owner.mkt.automations_blocked_failed", "Automações bloqueadas e com falha"),
    ],
  },
];
