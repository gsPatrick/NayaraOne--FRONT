// Parâmetros da Locação e do Jurídico (Marco 5) que o administrador controla na aba "Locação e Jurídico". O livro do Marco 5 pede cada
// regra e não traz o número: vira configuração da empresa (regra do Patrick). O padrão mostrado é o mesmo que a API usa enquanto a empresa
// não grava nada, e a faixa é a mesma que a API confere (legalRules.settings.js e leaseObligations.settings.js da API).
import { CONTRACT_TYPE_LABELS, DEADLINE_CRITICALITY_LABELS } from "@/lib/labels/juridico";

const PHOTO_TYPES = [
  "SALE", "SALE_CASH", "SALE_FINANCED", "SALE_TRADE", "SALE_INSTALLMENTS",
  "LEASE", "LEASE_RESIDENTIAL", "LEASE_COMMERCIAL", "LEASE_SEASONAL", "PROPERTY_ADMIN",
  "SERVICE", "CONSTRUCTION", "USED_PROPERTY_DELIVERY",
];
const PHOTO_DEFAULTS = { SALE: 1, SALE_CASH: 1, SALE_FINANCED: 1, SALE_TRADE: 1, SALE_INSTALLMENTS: 1, USED_PROPERTY_DELIVERY: 1 };
const CRITICALITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const photoText = (n) => (n === 0 ? "0 (não exige foto)" : `${n} ${n === 1 ? "foto" : "fotos"}`);

/** Fusos do Brasil (o valor gravado é o nome do fuso; a tela mostra só o nome por extenso). */
export const BRAZIL_TIME_ZONES = [
  { value: "America/Sao_Paulo", label: "Horário de Brasília (DF, SP, RJ, MG, Sul, GO e demais)" },
  { value: "America/Bahia", label: "Bahia (horário de Brasília)" },
  { value: "America/Fortaleza", label: "Ceará, Maranhão, Piauí, Rio Grande do Norte e Paraíba (horário de Brasília)" },
  { value: "America/Recife", label: "Pernambuco (horário de Brasília)" },
  { value: "America/Maceio", label: "Alagoas e Sergipe (horário de Brasília)" },
  { value: "America/Belem", label: "Pará e Amapá (horário de Brasília)" },
  { value: "America/Santarem", label: "Oeste do Pará (horário de Brasília)" },
  { value: "America/Araguaina", label: "Tocantins (horário de Brasília)" },
  { value: "America/Noronha", label: "Fernando de Noronha (uma hora a mais que Brasília)" },
  { value: "America/Manaus", label: "Amazonas (uma hora a menos que Brasília)" },
  { value: "America/Cuiaba", label: "Mato Grosso (uma hora a menos que Brasília)" },
  { value: "America/Campo_Grande", label: "Mato Grosso do Sul (uma hora a menos que Brasília)" },
  { value: "America/Porto_Velho", label: "Rondônia (uma hora a menos que Brasília)" },
  { value: "America/Boa_Vista", label: "Roraima (uma hora a menos que Brasília)" },
  { value: "America/Rio_Branco", label: "Acre (duas horas a menos que Brasília)" },
  { value: "America/Eirunepe", label: "Sudoeste do Amazonas (duas horas a menos que Brasília)" },
];

/** Bases jurídicas do recebível do processo (a API devolve só as aceitas pela empresa em GET /legal/receivable-bases). */
export const RECEIVABLE_BASIS_OPTIONS = [
  { code: "SETTLEMENT", label: "Acordo homologado", on: true },
  { code: "FINAL_JUDGMENT", label: "Sentença transitada em julgado", on: true },
  { code: "PROVISIONAL_ENFORCEMENT", label: "Cumprimento provisório de sentença", on: false },
  { code: "EXTRAJUDICIAL_TITLE", label: "Título executivo extrajudicial", on: false },
  { code: "COURT_DEPOSIT_RELEASE", label: "Alvará de levantamento de depósito judicial", on: false },
];

const CLOSURE_BLOCKERS = [
  { kind: "TRANSFER", label: "Troca de titularidade (água, luz, gás) pendente segura o encerramento", on: true, why: "a troca de titularidade que não foi concluída" },
  { kind: "CYCLE_OVERDUE", label: "Vencimento da obrigação sem comprovante segura o encerramento", on: true, why: "o vencimento já passou da carência e o comprovante não chegou" },
  { kind: "REIMBURSEMENT_PENDING", label: "Reembolso de utilidade a receber segura o encerramento", on: false, why: "o reembolso pago por uma parte e devido pela outra ainda não foi recebido" },
];
const onOff = (on) => (on ? "ligado" : "desligado");

export const JURIDICO_GROUPS = [
  {
    title: "Fotos da entrega de chaves",
    subtitle:
      "O livro do Marco 5 pede fotos obrigatórias na entrega de chaves \"quando a política exigir\". Aqui fica a política: a quantidade mínima de fotos diferentes por tipo de contrato. Com 0, a entrega daquele tipo não exige foto. A entrega é recusada enquanto não houver a quantidade de fotos pedida.",
    fields: PHOTO_TYPES.map((type) => ({
      key: `legal.chaves.fotos_minimas.${type}`,
      label: type === "USED_PROPERTY_DELIVERY" ? "Termo de entrega de imóvel usado" : CONTRACT_TYPE_LABELS[type],
      type: "integer",
      defaultValue: PHOTO_DEFAULTS[type] || 0,
      min: 0,
      max: 50,
      helper: `Padrão: ${photoText(PHOTO_DEFAULTS[type] || 0)}. Quantidade mínima de fotos diferentes na entrega.`,
    })),
  },
  {
    title: "Prazos jurídicos",
    subtitle:
      "O livro do Marco 5 pede que o vencimento dos prazos jurídicos seja calculado no fuso horário correto e que os alertas sejam escalonados por regra. Aqui ficam o fuso da empresa, a antecedência do aviso \"vence em breve\" e o intervalo do escalonamento depois do primeiro aviso de prazo vencido, por criticidade do prazo.",
    fields: [
      {
        key: "legal.prazos.fuso_horario",
        label: "Fuso horário dos prazos",
        type: "select",
        defaultValue: "America/Sao_Paulo",
        options: BRAZIL_TIME_ZONES,
        helper: "Padrão: horário de Brasília. Prazo informado só com a data vence às 23:59 daquele dia neste fuso.",
      },
      ...CRITICALITIES.map((crit) => ({
        key: `legal.prazos.alerta_antecedencia_horas.${crit}`,
        label: `Aviso de "vence em breve", criticidade ${DEADLINE_CRITICALITY_LABELS[crit].toLowerCase()} (horas antes)`,
        type: "integer",
        defaultValue: 48,
        min: 1,
        max: 720,
        helper: "Padrão: 48 horas. Quantas horas antes do vencimento o responsável recebe o aviso.",
      })),
      ...CRITICALITIES.map((crit) => ({
        key: `legal.prazos.escalonamento_horas.${crit}`,
        label: `Escalonamento do prazo vencido, criticidade ${DEADLINE_CRITICALITY_LABELS[crit].toLowerCase()} (horas)`,
        type: "integer",
        defaultValue: 24,
        min: 1,
        max: 720,
        helper: "Padrão: 24 horas. Depois do primeiro aviso de vencido, o prazo sobe para o destino de escalonamento neste intervalo.",
      })),
    ],
  },
  {
    title: "Recebível do processo",
    subtitle:
      "O livro do Marco 5 diz que o valor do processo só vai ao Financeiro \"quando juridicamente cabível\". Aqui você escolhe quais bases jurídicas a empresa aceita para vincular o valor confirmado do processo como recebível. Só as bases ligadas aparecem na tela do processo.",
    fields: RECEIVABLE_BASIS_OPTIONS.map((basis) => ({
      key: `legal.processo.recebivel.base.${basis.code}`,
      label: `Aceitar ${basis.label.toLowerCase()}`,
      type: "boolean",
      defaultValue: basis.on,
      helper: `Padrão: ${onOff(basis.on)}.`,
    })),
  },
  {
    title: "Obrigações da locação",
    subtitle:
      "O livro do Marco 5 pede que cada obrigação da locação (água, luz, condomínio, IPTU) tenha comprovante e situação, que a pendência gere alerta e que o encerramento do contrato fique bloqueado com \"obrigação crítica\" pendente. O livro não define o que é obrigação crítica: as opções abaixo dizem quais pendências seguram o encerramento do contrato.",
    fields: [
      {
        key: "billing.utility_proof_grace_days",
        label: "Dias depois do vencimento para chegar o comprovante",
        type: "integer",
        defaultValue: 5,
        min: 0,
        max: 60,
        helper: "Padrão: 5 dias. Passado este prazo sem comprovante, o vencimento fica vencido e gera alerta.",
      },
      {
        key: "billing.reimbursement_overdue_alert_days",
        label: "Dias de atraso do reembolso a receber até o alerta",
        type: "integer",
        defaultValue: 30,
        min: 1,
        max: 365,
        helper: "Padrão: 30 dias. Reembolso de utilidade não recebido depois deste prazo gera alerta.",
      },
      {
        key: "locacao.titularidade.prazo_dias",
        label: "Prazo da troca de titularidade (dias depois da entrega das chaves)",
        type: "integer",
        defaultValue: 30,
        min: 1,
        max: 90,
        helper: "Padrão: 30 dias. Vale também para a troca que não tem prazo próprio.",
      },
      ...CLOSURE_BLOCKERS.map((blocker) => ({
        key: `locacao.encerramento.bloqueia.${blocker.kind}`,
        label: blocker.label,
        type: "boolean",
        defaultValue: blocker.on,
        helper: `Padrão: ${onOff(blocker.on)}. Ligado, o contrato não encerra enquanto houver ${blocker.why}.`,
      })),
    ],
  },
];

export const JURIDICO_FIELDS = JURIDICO_GROUPS.flatMap((group) => group.fields);

export const JURIDICO_PREFIXES = [
  "legal.chaves",
  "legal.prazos",
  "legal.processo",
  "billing.utility_proof",
  "billing.reimbursement",
  "locacao.encerramento",
  "locacao.titularidade",
];
