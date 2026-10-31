// Migração v2 na aba Governança (Marco 9, M9-D900): carga delta do sistema antigo. Padrões de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_MIGRACAO_GROUPS = [
  {
    title: "Migração do sistema antigo: carga incremental",
    subtitle:
      "A carga do sistema antigo traz só o que mudou desde o último ponto de controle e pode ser repetida sem duplicar nada. Cada lote roda numa transação: se falhar, nada é aplicado e o ponto de controle não avança.",
    fields: [
      { key: "migracao.lote.tamanho", label: "Linhas por lote", type: "integer", defaultValue: 2000, min: 1, max: 100000, helper: "Quantas linhas (ou eventos) cada lote aplica de uma vez. Lote menor falha e recomeça mais rápido; lote maior termina mais depressa." },
      { key: "migracao.watermark.sobreposicao_s", label: "Sobreposição da leitura por data de alteração (segundos)", type: "integer", defaultValue: 120, min: 0, max: 86400, helper: "A leitura volta este tempo antes do último ponto de controle para não perder uma linha cuja gravação só terminou depois. O que já foi aplicado é ignorado." },
      { key: "migracao.lote.max_tentativas", label: "Falhas seguidas do mesmo lote até abortar", type: "integer", defaultValue: 3, min: 1, max: 20, helper: "Passado este número de falhas seguidas o lote é abortado e a fonte para; uma nova execução cria outro lote." },
      { key: "migracao.lote.timeout_min", label: "Minutos até considerar falho um lote que não terminou", type: "integer", defaultValue: 30, min: 1, max: 1440, helper: "Se o processo cair no meio de um lote, a fonte fica travada por este tempo; depois o lote é dado como falho e a fonte é liberada." },
    ],
  },
  {
    title: "Migração do sistema antigo: Torre de controle",
    subtitle: "O painel da migração mostra quanto já foi, quanto falta e uma estimativa de término calculada pela velocidade dos últimos lotes concluídos.",
    fields: [
      { key: "migracao.eta.janela_lotes", label: "Lotes usados na estimativa de término", type: "integer", defaultValue: 5, min: 1, max: 100, helper: "A velocidade (linhas por minuto) é a média dos últimos lotes concluídos; aqui você diz quantos entram na média. Poucos lotes reagem rápido a mudanças; muitos dão uma estimativa mais estável." },
    ],
  },
  {
    title: "Migração do sistema antigo: comparação paralela",
    subtitle:
      "Enquanto os dois sistemas rodam lado a lado, um robô compara o que o antigo e o novo dizem sobre os mesmos registros. Cada janela de comparação é definida pela API (período, entidades e a regra de cada campo); aqui ficam os padrões.",
    fields: [
      { key: "migracao.paralelo.intervalo_min", label: "Intervalo entre comparações (minutos)", type: "integer", defaultValue: 60, min: 1, max: 1440, helper: "De quanto em quanto tempo o robô compara de novo durante a janela. É o padrão de uma janela criada sem intervalo próprio." },
      { key: "migracao.paralelo.fuso", label: "Fuso das datas da janela e do dia civil", type: "text", defaultValue: "America/Sao_Paulo", helper: "Datas da janela sem fuso e a regra de data (mesmo dia civil) são lidas neste fuso. Use o nome do fuso, por exemplo America/Sao_Paulo." },
      { key: "migracao.paralelo.timeout_min", label: "Minutos até considerar falha uma comparação que não terminou", type: "integer", defaultValue: 30, min: 1, max: 1440, helper: "Se o processo cair no meio de uma comparação, a janela fica travada por este tempo; depois a comparação é dada como falha (nunca como sem diferenças) e a janela é liberada." },
    ],
  },
  {
    title: "Migração do sistema antigo: ativação por setor",
    subtitle:
      "O sistema novo é ligado aos poucos, setor por setor: primeiro uma parte dos usuários, depois mais, até todos. Cada setor avança e volta sozinho, sem afetar os outros. O avanço só acontece com a Torre de controle sem pendências bloqueantes do setor.",
    fields: [
      { key: "migracao.canary.etapas", label: "Etapas da ativação (percentual de usuários do setor)", type: "text", defaultValue: "5,25,50,100", helper: "Percentuais crescentes de usuários de cada setor que passam a operar no sistema novo, separados por vírgula e terminando em 100. A escolha dos usuários é estável: subir a etapa só acrescenta pessoas." },
      { key: "migracao.canary.exigir_comparacao", label: "Exigir comparação paralela limpa para avançar", type: "boolean", defaultValue: true, helper: "Ligado: para avançar de etapa, cada entidade do setor que a migração carrega precisa ter uma comparação paralela concluída e sem diferenças bloqueantes. Uma comparação que falhou nunca conta como limpa." },
      { key: "migracao.setor.atendimento.entidades", label: "Entidades do setor Atendimento", type: "text", defaultValue: "LEAD,VISIT", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (leads e visitas) impedem o avanço do setor Atendimento. Nomes separados por vírgula." },
      { key: "migracao.setor.locacao.entidades", label: "Entidades do setor Locação", type: "text", defaultValue: "PROPOSAL,CONTRACT", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (propostas e contratos de locação) impedem o avanço do setor Locação. Nomes separados por vírgula." },
      { key: "migracao.setor.financeiro.entidades", label: "Entidades do setor Financeiro", type: "text", defaultValue: "FINANCIAL_ENTRY", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (lançamentos e parcelas) impedem o avanço do setor Financeiro. Nomes separados por vírgula." },
      { key: "migracao.setor.obras.entidades", label: "Entidades do setor Obras", type: "text", defaultValue: "PROJECT,PROJECT_STAGE", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (obras e etapas) impedem o avanço do setor Obras. Nomes separados por vírgula." },
      { key: "migracao.setor.correspondente.entidades", label: "Entidades do setor Correspondente", type: "text", defaultValue: "FINANCING_PROCESS", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (processos de financiamento) impedem o avanço do setor Correspondente. Nomes separados por vírgula." },
      { key: "migracao.setor.juridico.entidades", label: "Entidades do setor Jurídico", type: "text", defaultValue: "LEGAL_DEADLINE,LEGAL_CASE", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (prazos e processos) impedem o avanço do setor Jurídico. Nomes separados por vírgula." },
    ],
  },
];
