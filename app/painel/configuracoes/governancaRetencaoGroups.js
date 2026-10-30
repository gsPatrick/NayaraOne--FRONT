// Retenção de dados na aba Governança (Marco 9, M9-D911). Padrões de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_RETENCAO_GROUPS = [
  {
    title: "Retenção de dados: prazos iniciais das políticas",
    subtitle:
      "O livro exige prazo, gatilho, base legal, disposição e exceções em toda política de retenção, mas não traz os prazos. Os padrões abaixo são os prazos legais usuais (tributário 5 anos, prescrição geral 10 anos) e a sua assessoria jurídica confirma. Estes valores só valem quando a política da empresa é criada pela primeira vez; depois disso o prazo de cada política é editado na própria política (PUT /retention/policies).",
    fields: [
      { key: "governanca.retencao.prazo_meses.fiscal", label: "Documentos fiscais e contábeis: prazo inicial (meses, a partir do fim do período)", type: "integer", defaultValue: 60, min: 1, max: 1200 },
      { key: "governanca.retencao.prazo_meses.contratos", label: "Contratos e anexos: prazo inicial (meses, a partir do fim do contrato)", type: "integer", defaultValue: 120, min: 1, max: 1200 },
      { key: "governanca.retencao.prazo_meses.juridico", label: "Processos jurídicos: prazo inicial (meses, a partir do encerramento)", type: "integer", defaultValue: 120, min: 1, max: 1200 },
      { key: "governanca.retencao.prazo_meses.leads", label: "Leads sem contrato: prazo inicial (meses, a partir do último contato)", type: "integer", defaultValue: 24, min: 1, max: 1200 },
      { key: "governanca.retencao.prazo_meses.logs", label: "Logs técnicos: prazo inicial (meses)", type: "integer", defaultValue: 18, min: 1, max: 1200 },
      { key: "governanca.retencao.prazo_meses.auditoria", label: "Auditoria de segurança: prazo inicial (meses)", type: "integer", defaultValue: 60, min: 1, max: 1200 },
    ],
  },
  {
    title: "Retenção de dados: simulação, aplicação e job",
    subtitle:
      "A simulação (dry-run) nunca altera dados e é obrigatória antes de aplicar. A aplicação exige MFA, o código da rodada e a justificativa. O job diário gera a simulação de todas as políticas e só aplica sozinho o calendário técnico de integração, quando ligado abaixo.",
    fields: [
      { key: "governanca.retencao.lote_tamanho", label: "Registros por lote na aplicação", type: "integer", defaultValue: 500, min: 1, max: 10000, helper: "Cada lote é uma transação: se um falhar, os lotes já concluídos ficam e a rodada pode ser retomada." },
      { key: "governanca.retencao.amostra_tamanho", label: "Chaves de amostra por política no relatório da simulação", type: "integer", defaultValue: 20, min: 1, max: 200 },
      { key: "governanca.retencao.dry_run_validade_horas", label: "Validade da simulação para aplicar (horas)", type: "integer", defaultValue: 72, min: 1, max: 720, helper: "Simulação mais velha que isso exige uma nova antes de aplicar." },
      { key: "governanca.retencao.apply_timeout_min", label: "Minutos sem sinal de vida para uma aplicação ser considerada abandonada", type: "integer", defaultValue: 30, min: 1, max: 1440 },
      { key: "governanca.retencao.job_hora", label: "Hora do job de retenção (Brasília)", type: "integer", defaultValue: 3, min: 0, max: 23 },
      { key: "governanca.retencao.job_minuto", label: "Minuto do job de retenção", type: "integer", defaultValue: 30, min: 0, max: 59 },
      { key: "governanca.retencao.pagina_tamanho", label: "Itens por página nas consultas de rodadas de retenção", type: "integer", defaultValue: 50, min: 1, max: 200 },
      { key: "governanca.retencao.integracao_automatica", label: "Aplicar sozinho o descarte técnico de integração (usa integration.purge_expired)", type: "boolean", defaultValue: true, helper: "Vale quando a política de integração é criada; depois se edita em auto_apply na política." },
    ],
  },
];
