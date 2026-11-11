// Recusas da API do Jurídico em português claro (M5-D048 §3.5): a tela nunca mostra código de exigência, enum ou
// nome de campo. Códigos conhecidos têm texto próprio; o resto passa pela mensagem da API sem os nomes internos.
import { humanizeMessage } from "@/lib/errors/apiErrors";
import { humanizeText } from "@/lib/format";
import { MFA_SETUP_NOTICE, isMfaSetupRequired } from "@/lib/errors/mfaSetup";
import { REQUIREMENT_STAGE_LABELS } from "@/lib/labels/juridico";

const CODE_TEXT = {
  LEGAL_CONTRACT_INVALID_TRANSITION: "Esta etapa não pode ser feita na situação atual do contrato. Recarregue a página para ver as ações disponíveis.",
  LEGAL_CONTRACT_TERMS_LOCKED_USE_ADDENDUM: "O contrato já foi aprovado: valor, vigência, imóvel e número não são reescritos. Registre a alteração por aditivo.",
  LEGAL_CONTRACT_VERSION_SUPERSEDED: "Esta versão foi substituída por uma mais nova. Só a versão vigente pode ser aprovada ou enviada para assinatura.",
  LEGAL_CONTRACT_VERSION_NOT_DRAFT: "Esta versão já foi aprovada ou substituída e não pode ser aprovada de novo.",
  LEGAL_CONTRACT_VERSION_HASH_MISMATCH: "O arquivo guardado desta versão não confere com o hash registrado. A versão não pode seguir: gere uma nova versão.",
  LEGAL_CONTRACT_VERSION_FILE_UNREADABLE: "Não foi possível ler o arquivo guardado desta versão. Gere uma nova versão do documento.",
  LEGAL_SIGNATURE_VERSION_NOT_APPROVED: "Só a versão aprovada vigente vai para assinatura. Aprove a versão atual antes de enviar.",
  LEGAL_CONTRACT_DOCUMENT_GATE: "O contrato precisa de uma versão do documento antes desta etapa.",
  LEGAL_CONTRACT_SIGNATURE_GATE: "Ainda faltam assinaturas de partes obrigatórias para marcar o contrato como assinado.",
  LEGAL_CONTRACT_PARENT_REQUIRED: "Este tipo de contrato é vinculado: escolha o contrato principal.",
  LEGAL_CONTRACT_AMENDMENT_SIGNATURES_REQUIRED: "O aditivo nasce em rascunho: registre a assinatura de cada signatário depois de criar.",
  LEGAL_CONTRACT_AMENDMENT_BASE_VERSION_REQUIRED: "O aditivo se baseia numa versão do contrato: o contrato ainda não tem versão.",
  LEGAL_CONTRACT_AMENDMENT_SIGNER_ALREADY_SIGNED: "Este signatário já assinou o aditivo.",
  LEGAL_CONTRACT_AMENDMENT_SIGNER_NOT_PARTY: "O signatário precisa ser parte do contrato.",
  LEGAL_KEY_DELIVERY_TERM_EVIDENCE_REQUIRED: "Anexe a via do termo de entrega assinada pelo recebedor: a entrega das chaves exige o termo assinado.",
  LEGAL_KEY_DELIVERY_TERM_EVIDENCE_INVALID: "A via assinada do termo precisa ser um arquivo enviado ao sistema por esta empresa.",
  LEGAL_KEY_DELIVERY_PHOTO_INVALID: "Cada foto da entrega precisa ser uma imagem enviada ao sistema por esta empresa.",
  LEGAL_KEY_DELIVERY_INSPECTION_NOT_SIGNED: "A vistoria de entrada está concluída, mas ainda falta a assinatura do locador e/ou do locatário.",
  DEADLINE_SOURCE_REQUIRED: "Informe a origem do prazo: anexe o documento que o originou (intimação, publicação, decisão) — todo prazo precisa de origem verificável.",
  LEGAL_DEADLINE_NOT_RESPONSIBLE: "Só o responsável pelo prazo (ou quem tem aprovação jurídica) pode concluí-lo.",
  LEGAL_DEADLINE_CANCEL_NOT_ALLOWED: "Cancelar prazo jurídico exige a permissão de aprovação jurídica.",
  LEGAL_DEADLINE_CANCEL_REASON_REQUIRED: "Informe o motivo do cancelamento do prazo.",
  LEGAL_DEADLINE_RESPONSIBLE_REQUIRED: "Defina um responsável para o prazo (ou para o processo).",
  LEGAL_DEADLINE_CONCLUSION_PROOF_REQUIRED: "Para concluir o prazo, escreva uma nota explicando o que foi feito ou anexe a evidência.",
  LEGAL_GUARANTEE_FLOW_NOT_CONFIGURED: "Esta forma de garantia não foi homologada para a empresa. Peça ao administrador para configurar o fluxo em Configurações.",
  LEGAL_GUARANTEE_DEPOSIT_ORIGIN_INVALID: "O recebimento escolhido não confere com a caução (precisa ser o recebimento de dinheiro de terceiros deste contrato, no valor da caução).",
  LEGAL_GUARANTEE_FILE_REUSED: "Este arquivo já está ligado a outra garantia. Envie o documento desta garantia.",
  LEGAL_GUARANTEE_GUARANTOR_CONFLICT: "O fiador não pode ser o locador nem o locatário do contrato.",
  LEGAL_GUARANTEE_POLICY_DUPLICATE: "Já existe garantia com esta apólice desta seguradora.",
  LEGAL_INSPECTION_MEDIA_HASH_MISSING: "O arquivo enviado não tem o hash de integridade e não pode virar mídia de vistoria. Envie o arquivo de novo.",
  LEGAL_INSPECTION_SNAPSHOT_CHANGED: "O conteúdo da vistoria mudou depois da primeira assinatura: a vistoria assinada não pode ser alterada.",
  LEGAL_NOTICE_VERSION_LOCKED: "Esta notificação já foi enviada e não muda mais: para corrigir, emita uma nova notificação.",
  LEGAL_NOTICE_VERSION_UNCHANGED: "A nova versão é idêntica à atual: altere o texto, o arquivo ou o destinatário.",
  LEGAL_CASE_RECEIVABLE_NOT_CONFIRMED: "O processo não tem valor confirmado: estimativa processual não vira recebível.",
  LEGAL_CASE_RECEIVABLE_DUPLICATE: "Este processo já tem recebível vinculado ao Financeiro.",
  LEGAL_TEMPLATE_RESPONSIBLE_REQUIRED: "O modelo precisa de um responsável jurídico antes de ser publicado.",
  LEGAL_TEMPLATE_EMPTY: "Modelo sem cláusulas não é publicado: adicione as cláusulas antes.",
  LEGAL_TEMPLATE_NOTHING_TO_PUBLISH: "Não há versão em rascunho para publicar: a versão atual já está publicada.",
  MFA_STEP_UP_CANCELLED: "Ação não concluída: esta ação exige a verificação em duas etapas, que não foi feita.",
};

const PERMISSION_TEXT = {
  "legal:approve": "aprovação jurídica",
  "legal:sign": "assinatura de contratos",
  "legal:waive": "dispensa de exigências",
  "legal:evidence:export": "exportação de dossiê",
  "lease.keys.deliver": "entrega de chaves",
  "finance:create": "lançamento no Financeiro",
};

/** Lista de pendências do checklist (details.pending do 409 LEGAL_REQUIREMENTS_PENDING) em português. */
function pendingText(error) {
  const pending = (error.details && Array.isArray(error.details.pending) && error.details.pending) || [];
  if (!pending.length) return "Ainda há documentos obrigatórios pendentes no checklist desta etapa.";
  const stage = error.details.stage && REQUIREMENT_STAGE_LABELS[error.details.stage];
  const items = pending.map((p) => humanizeText(p.description || "documento do checklist").replace(/\.$/, ""));
  return `Faltam documentos do checklist${stage ? ` (${stage.toLowerCase()})` : ""}: ${items.join("; ")}.`;
}

/** Texto para a pessoa a partir do erro do apiFetch. `fallback` quando não há mensagem. */
export function legalErrorMessage(error, fallback = "Não foi possível concluir a ação. Tente de novo.") {
  if (!error) return fallback;
  const code = error.code;
  if (isMfaSetupRequired(error)) return MFA_SETUP_NOTICE.text;
  if (code === "LEGAL_REQUIREMENTS_PENDING" || code === "LEGAL_KEY_DELIVERY_REQUIREMENTS_PENDING") {
    return code === "LEGAL_KEY_DELIVERY_REQUIREMENTS_PENDING" ? `Não é possível entregar as chaves. ${pendingText(error)}` : pendingText(error);
  }
  if (CODE_TEXT[code]) return CODE_TEXT[code];
  if (error.status === 403 && error.details && error.details.required) {
    const what = PERMISSION_TEXT[error.details.required];
    return `Você não tem permissão para esta ação${what ? ` (${what})` : ""}. Peça acesso ao administrador.`;
  }
  const text = humanizeText(humanizeMessage(error.message || ""));
  return text || fallback;
}
