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
  LEGAL_DEADLINE_CHANGE_REASON_REQUIRED: "Para remarcar o vencimento, informe o motivo da mudança: ele fica no histórico do prazo.",
  LEGAL_DEADLINE_RESPONSIBLE_NOT_IN_TENANT: "O responsável escolhido não é usuário ativo desta empresa. Escolha outra pessoa.",
  LEGAL_DEADLINE_CRITICAL_RESPONSIBLE_REQUIRED: "Prazo crítico precisa de um responsável definido e de um destino de escalonamento no processo.",
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
  // Correções da verificação do Marco 5 (contratos, modelos, cláusulas e NAY).
  LEGAL_CONTRACT_TYPE_NOT_IN_BOOK: "Este tipo de contrato não existe no catálogo do Jurídico. Escolha um dos tipos da lista.",
  LEGAL_REQUIREMENT_TEMPLATE_KEY_NOT_ACCEPTED: "O checklist é montado pela regra da empresa a partir do tipo do contrato e do cadastro: não é possível escolher outro modelo.",
  LEGAL_REQUIREMENT_RULE_VALIDATION: "A política do checklist tem um erro e não foi publicada. Confira os modelos, os itens e as condições.",
  LEGAL_REQUIREMENT_RULE_REASON_REQUIRED: "Escreva o motivo da nova versão da política (de 5 a 500 caracteres).",
  LEGAL_USED_PROPERTY_TERM_MODEL_NOT_PUBLISHED: "Não há modelo jurídico aprovado para o termo do imóvel usado. Publique o modelo \"Termo de entrega de imóvel usado\" em Modelos de contrato.",
  LEGAL_CLAUSE_HOMOLOGATION_SELF_BLOCKED: "Quem escreveu esta versão da cláusula não pode homologá-la. Peça a outra pessoa com aprovação jurídica.",
  LEGAL_CLAUSE_ALREADY_HOMOLOGATED: "Esta versão da cláusula já está homologada.",
  LEGAL_CLAUSE_HOMOLOGATION_VERSION_INACTIVE: "Só a versão vigente da cláusula pode ser homologada.",
  LEGAL_CLAUSE_HOMOLOGATION_AUTHOR_UNKNOWN: "Esta versão não tem autor registrado. Crie uma nova versão da cláusula para homologar.",
  LEGAL_NAY_DRAFT_NO_HOMOLOGATED_CLAUSES: "Não há cláusula homologada que se aplique a este contrato. Homologue as cláusulas na Biblioteca de cláusulas antes de pedir a minuta.",
  LEGAL_NAY_DRAFT_CONTRACT_NOT_EDITABLE: "Contrato assinado ou encerrado não recebe minuta nova: a alteração é por aditivo.",
  LEGAL_NAY_DRAFT_ALREADY_DECIDED: "Esta minuta já foi aceita ou descartada.",
  LEGAL_NAY_DRAFT_STALE: "A biblioteca de cláusulas mudou desde a sugestão. Peça uma nova minuta à NAY.",
  LEGAL_NAY_DRAFT_REASON_REQUIRED: "Escreva o motivo do descarte (de 5 a 500 caracteres).",
  LEGAL_TEMPLATE_NOT_PUBLISHED: "O modelo escolhido ainda não tem versão publicada: só a versão publicada gera contrato. Publique o modelo em Modelos de contrato (alçada jurídica) ou crie sem modelo.",
  LEGAL_INVALID_ID: "Um dos itens escolhidos não é válido. Recarregue a página e escolha de novo.",
  INVALID_FIELD_TYPE: "Um dos campos está num formato que o sistema não aceita. Confira os dados e tente de novo.",
  VALUE_TOO_LONG: "Um dos textos passou do tamanho permitido. Encurte e tente de novo.",
  MFA_STEP_UP_CANCELLED: "Ação não concluída: esta ação exige a verificação em duas etapas, que não foi feita.",
  // Fechamento M5 (vistorias/prazos): entrega de chaves, notificação, garantia, laudo, recebível e obrigações da locação.
  LEGAL_KEY_DELIVERY_IDENTIFICATION_REQUIRED: "Informe a identificação das chaves e controles entregues (por exemplo: 2 chaves da porta e 1 controle do portão).",
  LEGAL_KEY_DELIVERY_GUARANTEE_REQUIRED: "O contrato exige garantia e nenhuma garantia ativa e vigente foi cadastrada. Anexar um arquivo ao checklist não substitui a garantia: cadastre e ative a garantia antes de entregar as chaves.",
  LEGAL_KEY_DELIVERY_GUARANTEE_INVALID: "O contrato tem garantia cadastrada, mas nenhuma está ativa e dentro da vigência. Regularize a garantia antes de entregar as chaves.",
  LEGAL_NOTICE_RECIPIENT_REQUIRED: "Informe o destinatário da notificação: escolha a pessoa ou descreva quem vai receber.",
  LEGAL_GUARANTEE_REPLACED_IMMUTABLE: "Esta garantia foi substituída e faz parte do histórico do contrato: não pode ser alterada nem excluída. Altere a garantia nova.",
  LEGAL_GUARANTEE_VALIDITY_REQUIRED: "O fim da vigência é obrigatório para este tipo de garantia e não pode ser apagado.",
  LEGAL_GUARANTEE_ACTIVE_DATA_REQUIRED: "Garantia ativa não pode ficar sem os dados obrigatórios do tipo nem sem o fim da vigência. Corrija os dados ou mude a situação antes.",
  LEGAL_INSPECTION_REPORT_FROZEN: "O laudo assinado é imutável: ele já foi emitido depois da assinatura do locador e do locatário. Para corrigir, crie uma revisão da vistoria.",
  LEGAL_CASE_RECEIVABLE_BASIS_INVALID: "Esta base jurídica não é aceita pela empresa para gerar recebível. O administrador escolhe as bases aceitas em Configurações, aba Locação e Jurídico.",
  UTILITY_RECEIPT_REQUIRED: "Anexe o comprovante do pagamento: o vencimento só é dado como pago com o comprovante.",
  UTILITY_RECEIPT_NOT_FOUND: "O comprovante anexado não foi encontrado nesta empresa. Envie o arquivo de novo.",
  UTILITY_RECEIPT_ALREADY_USED: "Este comprovante já foi usado em outro vencimento. Anexe o comprovante deste pagamento.",
  UTILITY_CYCLE_ALREADY_SETTLED: "Este vencimento já está pago ou dispensado: o pagamento não é registrado de novo.",
  UTILITY_PAYMENT_CYCLE_REQUIRED: "Informe o vencimento que está sendo pago: esta obrigação não tem vencimento em aberto.",
  UTILITY_CYCLE_NOT_FOUND: "O vencimento escolhido não foi encontrado nesta obrigação. Recarregue a página e escolha de novo.",
  UTILITY_WAIVE_REASON_REQUIRED: "Informe o motivo da dispensa do vencimento (no mínimo 10 caracteres).",
};

/** Fotos da entrega (409 LEGAL_KEY_DELIVERY_PHOTOS_REQUIRED, details.minPhotos e details.informed). */
function photosText(error) {
  const min = Number(error.details && error.details.minPhotos);
  const informed = Number(error.details && error.details.informed) || 0;
  if (!Number.isInteger(min) || min <= 0) return "A política da empresa exige fotos nesta entrega: anexe as fotos do imóvel.";
  const need = `${min} ${min === 1 ? "foto" : "fotos"} ${min === 1 ? "diferente" : "diferentes"}`;
  return `A política da empresa exige no mínimo ${need} nesta entrega e ${informed === 0 ? "nenhuma foi anexada" : `foram anexadas ${informed}`}.`;
}

const PERMISSION_TEXT = {
  "legal:approve": "aprovação jurídica",
  "contracts.version.approve": "aprovação da versão do contrato",
  "legal:sign": "assinatura de contratos",
  "legal:waive": "dispensa de exigências",
  "legal:evidence:export": "exportação de dossiê",
  "lease.keys.deliver": "entrega de chaves",
  "finance:create": "lançamento no Financeiro",
  "billing:approve": "aprovação na cobrança da locação",
  "billing:update": "registro de pagamento da locação",
  "ai:approve": "decisão sobre as sugestões da NAY",
};

/** Lista de pendências do checklist (details.pending do 409 LEGAL_REQUIREMENTS_PENDING) em português. */
function pendingText(error) {
  const pending = (error.details && Array.isArray(error.details.pending) && error.details.pending) || [];
  if (!pending.length) {
    const missing = (error.details && Array.isArray(error.details.missingRequirementCodes) && error.details.missingRequirementCodes.length) || 0;
    return missing
      ? `Ainda ${missing === 1 ? "há 1 exigência pendente" : `há ${missing} exigências pendentes`} no checklist desta etapa. Confira o checklist do contrato.`
      : "Ainda há documentos obrigatórios pendentes no checklist desta etapa.";
  }
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
  if (code === "LEGAL_KEY_DELIVERY_PHOTOS_REQUIRED") return photosText(error);
  if (CODE_TEXT[code]) return CODE_TEXT[code];
  if (error.status === 403 && error.details && error.details.required) {
    const what = PERMISSION_TEXT[error.details.required];
    return `Você não tem permissão para esta ação${what ? ` (${what})` : ""}. Peça acesso ao administrador.`;
  }
  const text = humanizeText(humanizeMessage(error.message || ""));
  return text || fallback;
}
