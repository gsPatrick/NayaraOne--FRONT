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
];
