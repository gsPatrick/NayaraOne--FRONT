// Origem do lead (M9:610, KPI M9:784 "Leads por origem"; DI-BI2-4): códigos que a API aceita (LEAD_SOURCES em
// src/features/marketing/tracking/tracking.catalog.js) e o rótulo de cada um. Nenhum código aparece na tela; a ordem é a da lista.
// PARTNER é o lead que chega pela API de parceiro; WhatsApp e a importação BCP preenchem a origem sozinhos.
export const LEAD_SOURCE_LABELS = {
  FORM: "Formulário",
  WHATSAPP: "WhatsApp",
  PHONE: "Telefone",
  EMAIL: "E-mail",
  SITE: "Site",
  PORTAL: "Portal imobiliário",
  SOCIAL: "Redes sociais",
  REFERRAL: "Indicação",
  PARTNER: "Parceiro (API)",
  OTHER: "Outra origem",
};

export const LEAD_SOURCE_CODES = Object.keys(LEAD_SOURCE_LABELS);

export const LEAD_SOURCE_OPTIONS = LEAD_SOURCE_CODES.map((value) => ({ value, label: LEAD_SOURCE_LABELS[value] }));

/** Rótulo da origem; código desconhecido volta como "Origem não informada" (nunca o código cru). */
export function leadSourceLabel(code) {
  return LEAD_SOURCE_LABELS[String(code || "").toUpperCase()] || "Origem não informada";
}
