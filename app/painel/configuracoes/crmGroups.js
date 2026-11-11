// Parâmetros do CRM (Marco 3) que o administrador controla na aba "CRM" (DI-M3CA-2, DI-M3CA-5 e DI-M3CA-6). O livro do Marco 3 pede
// motivos de perda (§3 crm.loss_reasons), SLA da ocorrência (§15), escalonamento da tarefa vencida (§11) e responsável em toda
// oportunidade (CRMX-006), mas não traz os números nem as listas: o padrão mostrado aqui é o mesmo que a API usa enquanto a empresa
// não grava nada (src/features/crm/crm.settings.js). A API confere o formato e as faixas; valor fora delas é recusado.

const REASONS_HELP = "Formato CODIGO=Rótulo, separados por vírgula (código em maiúsculas, com letras, números e _). Motivo já usado em oportunidade antiga continua aparecendo nela.";

export const CRM_GROUPS = [
  {
    title: "Motivos de ganho, perda e desistência",
    subtitle: "Toda oportunidade ganha ou perdida exige um motivo destas listas. Desistência é uma perda: o motivo de desistência aparece junto dos de perda ao marcar \"Perdido\".",
    fields: [
      { key: "crm.motivos.ganho", label: "Motivos de ganho", type: "text", defaultValue: "PRICE_ACCEPTED=Preço aceito,FAST_DECISION=Decisão rápida,REFERRAL=Indicação,OTHER=Outro motivo", helper: REASONS_HELP },
      { key: "crm.motivos.perda", label: "Motivos de perda", type: "text", defaultValue: "PRICE_TOO_HIGH=Preço alto,COMPETITOR=Concorrente,FINANCING_DENIED=Financiamento negado,LOCATION=Localização,OTHER=Outro motivo", helper: REASONS_HELP },
      { key: "crm.motivos.desistencia", label: "Motivos de desistência", type: "text", defaultValue: "CLIENT_GAVE_UP=Cliente desistiu,NO_RESPONSE=Sem resposta,CHANGED_MIND=Mudou de ideia", helper: `${REASONS_HELP} Um código não pode estar nas duas listas (perda e desistência).` },
    ],
  },
  {
    title: "Ocorrências: prazo de SLA por severidade",
    subtitle: "Reclamação, elogio, conflito, atendimento inadequado e retorno pendente recebem o prazo na abertura. Vencido o prazo, o caso escala para o responsável e para a gerência.",
    fields: [
      { key: "crm.ocorrencia.sla_horas.alta", label: "Severidade alta (horas)", type: "integer", defaultValue: 24, min: 1, max: 2160, helper: "Padrão: 24." },
      { key: "crm.ocorrencia.sla_horas.media", label: "Severidade média (horas)", type: "integer", defaultValue: 72, min: 1, max: 2160, helper: "Padrão: 72." },
      { key: "crm.ocorrencia.sla_horas.baixa", label: "Severidade baixa (horas)", type: "integer", defaultValue: 168, min: 1, max: 2160, helper: "Padrão: 168 (7 dias)." },
    ],
  },
  {
    title: "Escalonamento e responsáveis",
    subtitle: "Tarefa vencida avisa o responsável e o dono da oportunidade; se continuar aberta, chega à gerência. Oportunidade perdida ou ganha não escala.",
    fields: [
      { key: "crm.tarefa_vencida.escalar_gerencia_apos_horas", label: "Horas de atraso para a tarefa chegar à gerência", type: "integer", defaultValue: 24, min: 0, max: 720, helper: "Padrão: 24. Com 0, a gerência é avisada junto com o responsável." },
      { key: "crm.gerencia.permissao", label: "Permissão que identifica a gerência", type: "text", defaultValue: "crm:dashboard:read", helper: "Quem tem esta permissão no papel recebe os escalonamentos de tarefa vencida, SLA vencido e reclamação grave. Padrão: crm:dashboard:read (quem vê o painel do CRM)." },
      { key: "crm.lead_automatico.responsavel_padrao", label: "Responsável pelo lead que chega sem usuário (WhatsApp, parceiro)", type: "user", defaultValue: "", helper: "Sem escolha, o lead vai para o gestor mais antigo da empresa." },
    ],
  },
];

export const CRM_FIELDS = CRM_GROUPS.flatMap((group) => group.fields);
export const CRM_PREFIXES = ["crm."];
