// Apresentação da NAY Comercial (Marco 3 §12 e §16): rótulos em português para os códigos que a API devolve, o corpo do pedido de cada
// capacidade e a tradução dos erros. Funções puras (testadas em test/m3cb.nayComercial.test.mjs); a tela nunca mostra código cru.

export const AGENT_CODE = "NAY_COMERCIAL";
export const PURPOSE = "Apoio comercial";

export const CHANNEL_LABELS = { WHATSAPP: "WhatsApp", EMAIL: "E-mail", SMS: "SMS", PHONE: "Telefone" };
/** Canais oferecidos no "Preparar envio de mensagem" (o texto do pedido leva o canal; a API lê dali). */
export const SEND_CHANNELS = ["WHATSAPP", "EMAIL", "SMS"];
const CHANNEL_IN_TEXT = { WHATSAPP: "WhatsApp", EMAIL: "e-mail", SMS: "SMS" };

export const TASKS = Object.freeze({
  SUMMARY: "resumir_oportunidade",
  NEXT_ACTION: "sugerir_proxima_acao",
  RADAR: "listar_imoveis_radar",
  QUALITY: "classificar_cadastro",
  RECOVERY: "rascunhar_recuperacao_cliente",
  SEND: "propor_envio_mensagem",
  MESSAGE: "resumir_mensagem_recebida",
  FORGOTTEN: "detectar_leads_esquecidos",
  PROPERTY: "rascunhar_descricao_imovel",
});

// Texto fixo de cada capacidade: tem a palavra do assunto que a NAY atende e nenhuma frase de ação proibida.
const CAPABILITIES = {
  [TASKS.SUMMARY]: { label: "Resumir histórico", entityType: "crmOpportunity", input: () => "Resuma o histórico desta oportunidade" },
  [TASKS.NEXT_ACTION]: { label: "Sugerir próxima ação", entityType: "crmOpportunity", input: () => "Qual a próxima ação desta oportunidade?" },
  [TASKS.RADAR]: { label: "Imóveis do Radar", entityType: "crmOpportunity", input: () => "Liste os imóveis do radar para esta oportunidade" },
  [TASKS.QUALITY]: { label: "Classificar cadastro e documentos", entityType: "crmOpportunity", input: () => "Classifique a qualidade do cadastro do cliente e os documentos faltantes" },
  [TASKS.RECOVERY]: { label: "Rascunho de recuperação", entityType: "crmOpportunity", input: () => "Escreva uma mensagem para recuperar o cliente" },
  [TASKS.SEND]: { label: "Preparar envio de mensagem", entityType: "crmOpportunity", input: (p) => `Prepare o envio da mensagem de recuperação por ${CHANNEL_IN_TEXT[p.channel] || CHANNEL_IN_TEXT.WHATSAPP}` },
  [TASKS.MESSAGE]: { label: "Resumo da NAY", entityType: "crmMessage", input: () => "Resuma a mensagem recebida do cliente" },
  [TASKS.FORGOTTEN]: { label: "Procurar leads esquecidos", entityType: null, input: () => "Quais leads esquecidos tenho na carteira?" },
  [TASKS.PROPERTY]: { label: "Rascunho de descrição", entityType: "property", input: () => "Escreva a descrição do imóvel" },
};

/** Botões da oportunidade escolhida, na ordem da tela. */
export const OPPORTUNITY_CAPABILITIES = [TASKS.SUMMARY, TASKS.NEXT_ACTION, TASKS.RADAR, TASKS.QUALITY, TASKS.RECOVERY, TASKS.SEND].map((id) => ({ id, label: CAPABILITIES[id].label }));

export function capabilityLabel(taskType) {
  return CAPABILITIES[taskType]?.label || "Consulta à NAY";
}

/** Corpo do POST /ai/runs para a capacidade. `params`: { opportunityId, messageId, propertyId, channel }. */
export function buildRunBody(taskType, params = {}) {
  const cap = CAPABILITIES[taskType];
  if (!cap) throw new Error("Capacidade da NAY Comercial desconhecida.");
  const body = { agentCode: AGENT_CODE, purpose: PURPOSE, input: cap.input(params), taskType };
  const entityId = { crmOpportunity: params.opportunityId, crmMessage: params.messageId, property: params.propertyId }[cap.entityType];
  if (cap.entityType) {
    if (!entityId) throw new Error("Escolha o registro antes de pedir à NAY.");
    body.context = { entityType: cap.entityType, entityId };
  }
  return body;
}

export const SOURCE_TITLES = {
  "crm.opportunities": "Oportunidade",
  "crm.interactions": "Interações",
  "crm.messages": "Mensagem",
  "crm.tasks": "Tarefas da oportunidade",
  "crm.proposals": "Propostas",
  people: "Cadastro da pessoa",
  "people.documents": "Documentos da pessoa",
  properties: "Fatos públicos do imóvel",
  "properties.public": "Fatos públicos do imóvel",
  "radar.matches": "Radar",
};

/** Título da fonte em português: pelo `title` ou pelo começo do `sourceRef` ("crm.messages:<id>"). */
export function sourceLabel(source) {
  const title = source?.title;
  if (title && SOURCE_TITLES[title]) return SOURCE_TITLES[title];
  const ref = String(source?.sourceRef || "").split(":")[0];
  return SOURCE_TITLES[ref] || "Dados do CRM";
}

export const QUALITY_CLASS = { BOM: { label: "Bom", tone: "success" }, REGULAR: { label: "Regular", tone: "warning" }, RUIM: { label: "Ruim", tone: "danger" } };
export const DOC_STATUS = {
  OK: { label: "OK", tone: "success" },
  PENDENTE_VERIFICACAO: { label: "Aguardando verificação", tone: "info" },
  VENCIDO: { label: "Vencido", tone: "danger" },
  RECUSADO: { label: "Recusado", tone: "danger" },
  FALTANTE: { label: "Faltante", tone: "warning" },
};
export const SENTIMENT = { NEGATIVO: { label: "Negativo", tone: "danger" }, NEUTRO: { label: "Neutro", tone: "neutral" }, POSITIVO: { label: "Positivo", tone: "success" } };
export const OCCURRENCE_LABELS = { CONFLICT: "Conflito", POOR_SERVICE: "Atendimento inadequado", COMPLAINT: "Reclamação", PENDING_RETURN: "Retorno pendente", COMPLIMENT: "Elogio" };
export const RECOMMENDATION_TYPES = {
  LEAD_ESQUECIDO: "Lead esquecido",
  RESUMO_MENSAGEM: "Resumo de mensagem (apoio)",
  PROPOSTA_ENVIO_MENSAGEM: "Proposta de mensagem",
  NEXT_ACTION: "Próxima ação",
};
export const VIOLATIONS = {
  METRAGEM_INVENTADA: "Metragem fora do cadastro",
  QUANTIDADE_INVENTADA: "Quantidade fora do cadastro",
  VALOR_INVENTADO: "Valor fora do cadastro",
  CARACTERISTICA_AUSENTE: "Característica que o cadastro não tem",
};
export const PURPOSE_LABELS = { MARKETING: "Marketing", CADENCE: "Cadência de contato", CAMPAIGN: "Campanha", COMMERCIAL: "Comercial", TRANSACTIONAL: "Transacional" };
export const RUN_STATUS = { COMPLETED: "Concluída", FAILED: "Não concluída", BLOCKED: "Bloqueada", RUNNING: "Em andamento", AWAITING_APPROVAL: "Aguardando aprovação", CANCELLED: "Cancelada" };

const pick = (map, code, fallback) => map[String(code || "").toUpperCase()] || fallback;

export const qualityClass = (code) => pick(QUALITY_CLASS, code, { label: "Sem classe", tone: "neutral" });
export const docStatus = (code) => pick(DOC_STATUS, code, { label: "Sem situação", tone: "neutral" });
export const sentiment = (code) => pick(SENTIMENT, code, { label: "Neutro", tone: "neutral" });
export const recommendationType = (code) => pick(RECOMMENDATION_TYPES, code, "Sugestão da NAY");
export const violationLabel = (code) => pick(VIOLATIONS, code, "Trecho fora do cadastro");
export const channelLabel = (code) => pick(CHANNEL_LABELS, code, "Canal não informado");
export const purposeLabel = (code) => pick(PURPOSE_LABELS, code, "Finalidade não informada");
export const runStatusLabel = (code) => pick(RUN_STATUS, code, "Sem situação");

/** Ocorrência sugerida: o rótulo que a API manda (com inicial maiúscula) ou o do tipo. */
export function occurrenceLabel(occurrence) {
  if (!occurrence) return null;
  const text = occurrence.rotulo ? String(occurrence.rotulo) : pick(OCCURRENCE_LABELS, occurrence.tipo, "Ocorrência");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Houve trecho sensível (LGPD art. 5º, II) retirado do resumo? */
export function hasSensitiveRemoved(structured) {
  const list = [...(structured?.sensivelRemovido || []), ...(structured?.atributoSensivelRemovido || [])];
  return list.length > 0;
}

/** O que a guarda da descrição tirou: [{ label, trecho }] (vazio quando aprovada). */
export function descriptionGuardIssues(structured) {
  const guard = structured?.guardaDescricao;
  if (!guard || guard.aprovada !== false) return [];
  return (guard.violacoes || []).map((v) => ({ label: violationLabel(v.tipo), trecho: v.trecho || "" }));
}

export const RECOMMENDATIONS_PAGE_SIZE = 20;

/** Total de páginas das recomendações: pelo total da API; sem total, há próxima página quando a atual veio cheia. */
export function totalPagesOf({ total, limit, page, count }) {
  const size = limit || RECOMMENDATIONS_PAGE_SIZE;
  if (Number.isFinite(total)) return Math.max(1, Math.ceil(total / size));
  return count >= size ? page + 1 : page;
}

const NOT_FOUND_TEXT = "Oportunidade não encontrada na sua carteira.";

/** Erro da API em frase para o corretor (nunca o código). `notFound` troca o texto do 404 quando o assunto não é oportunidade. */
export function nayErrorMessage(err, { notFound = NOT_FOUND_TEXT } = {}) {
  const status = err?.status;
  const code = err?.code;
  if (code === "NAY_RUN_TIMEOUT") return "A NAY ainda está trabalhando nesta consulta. Tente de novo em alguns minutos.";
  if (status === 0) return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  if (status === 403 && code === "AI_PERMISSION_DENIED") return "Você não tem permissão para consultar estes dados.";
  if (status === 403) return "Seu perfil não pode usar a NAY Comercial. Peça acesso ao administrador.";
  if (status === 404) return notFound;
  if (status === 429 && code === "AI_BUDGET_EXHAUSTED") return "O limite de uso da NAY neste período acabou. Fale com o administrador.";
  if (status === 429) return "Muitas consultas em pouco tempo. Aguarde um instante e tente de novo.";
  if (code === "AI_FEATURE_DISABLED" || code === "AI_AGENT_DISABLED") return "A NAY Comercial está desligada nesta empresa. Peça ao administrador para ligá-la em Configurações.";
  if (status === 503) return "A NAY não está disponível agora e nada foi alterado. Tente de novo em alguns minutos.";
  return "Não foi possível consultar a NAY agora. Tente de novo em alguns minutos.";
}
