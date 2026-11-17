// Configurações > BI > Qualidade. Fica fora de biQualidadeGroups.js porque não é lista de grupos: todo export de bi*Groups.js é lista de grupos com
// `fields` (o contrato M9-D686, test/m9d686.contrato.test.mjs, percorre todos os exports desses arquivos).
// DI-BI2-2: conferências de completude que, por padrão, só avisam, porque o livro não exige o campo na origem. Ligado, a falha acima do limite de bloqueio
// volta a deixar o indicador degradado. Mesmas chaves e padrões da API (quality.checkSeverity.js, COMPLETENESS_BLOCK_DEFAULTS).
export const CONFERENCIAS_SO_AVISAM = [
  {
    codigo: "project_nonconf_cause_code_completeness",
    rotulo: "Não conformidades sem causa (painel de não conformidades das obras)",
    livro: "O livro pede severidade, responsável, prazo, evidência antes e depois e aceite, mas não a causa (Marco 6, regras da não conformidade).",
  },
  {
    codigo: "project_occurrences_cause_code_completeness",
    rotulo: "Não conformidades sem causa (painel de recorrência das ocorrências)",
    livro: "Mesma origem do item acima (o livro não exige a causa), lida pelo indicador de recorrência por causa.",
  },
  {
    codigo: "rental_insp_keys_contract_id_completeness",
    rotulo: "Vistorias sem contrato",
    livro: "O livro não exige contrato na vistoria e prevê a vistoria final de casa nova, que não tem locação (Marco 5, vistorias).",
  },
];
