// Regras do componente ProtectedValue (Marco 9, M9-D825 §3.2), sem React nem DOM, para serem provadas por teste de Node.
// Classes do DLP: LOW e MEDIUM são livres; HIGH copia com registro; RESTRICTED não copia.

export const COPY_DENIED_MESSAGE = "Este dado não pode ser copiado";
export const COPY_NOT_RECORDED_MESSAGE = "A cópia foi cancelada porque não foi possível registrá-la. Tente novamente.";
export const MASKED_PATTERN = /^\*{4,}/;

const SENSITIVE = ["HIGH", "RESTRICTED"];

/** O que o componente faz com a cópia de uma classe: FREE (livre), RECORD (copia depois de registrar) ou DENY (nega e registra a negação). */
export function copyModeOf(classification) {
  if (classification === "RESTRICTED") return "DENY";
  if (classification === "HIGH") return "RECORD";
  return "FREE";
}

/** O valor veio mascarado do servidor (RESTRICTED sem a permissão dedicada, ou falha fechada da política)? */
export function isServerMasked(value) {
  return typeof value === "string" && MASKED_PATTERN.test(value);
}

/**
 * Modelo de renderização. RESTRICTED: o texto NÃO fica no DOM como nó de texto (vai em `data-dlp-text`, desenhado por CSS), então "selecionar tudo" e copiar a tabela
 * omitem o valor; não há botão Copiar. HIGH: o texto fica no DOM e há botão Copiar (a cópia é registrada antes). LOW e MEDIUM: texto simples.
 */
export function renderModel({ classification, value }) {
  const text = value === null || value === undefined ? "" : String(value);
  const mode = copyModeOf(classification);
  return {
    mode,
    visualText: text,
    domText: mode === "DENY" ? "" : text,
    selectable: mode !== "DENY",
    showCopyButton: mode === "RECORD" && text !== "" && !isServerMasked(text),
    dlpClass: SENSITIVE.includes(classification) ? classification : null,
  };
}

/**
 * Cópia por botão ou atalho. `postCopyEvent({resourceType, resourceId, field, outcome})` é a chamada a POST /dlp/copy-events (rejeita ou devolve null/false se falhar);
 * `writeClipboard(text)` grava na área de transferência. Regras: RESTRICTED nega e registra a negação (sem escrever na área de transferência); HIGH só copia depois do
 * registro ter dado certo (falhou, cancela); módulo DLP desligado (GOV_MODULE_DISABLED) não bloqueia; LOW e MEDIUM copiam direto.
 */
export async function copyProtected({ classification, text, target, postCopyEvent, writeClipboard }) {
  const mode = copyModeOf(classification);
  if (mode === "FREE") {
    await writeClipboard(text);
    return { copied: true, recorded: false };
  }
  if (mode === "DENY") {
    try {
      await postCopyEvent({ ...target, outcome: "DENIED" });
    } catch {
      // A negação é best effort: o valor nunca foi para a área de transferência.
    }
    return { copied: false, reason: "DENIED", message: COPY_DENIED_MESSAGE };
  }
  try {
    const recorded = await postCopyEvent({ ...target, outcome: "ALLOWED" });
    if (recorded === false || recorded === null) throw new Error("registro vazio");
  } catch (error) {
    if (error && error.code === "GOV_MODULE_DISABLED") {
      await writeClipboard(text);
      return { copied: true, recorded: false };
    }
    if (error && error.code === "GOV_DLP_DENIED") return { copied: false, reason: "DENIED", message: COPY_DENIED_MESSAGE };
    return { copied: false, reason: "NOT_RECORDED", message: COPY_NOT_RECORDED_MESSAGE };
  }
  await writeClipboard(text);
  return { copied: true, recorded: true };
}

/**
 * Eventos `copy`, `cut`, `dragstart` e `contextmenu` sobre o valor: RESTRICTED cancela sempre (preventDefault) e chama `onDenied`; HIGH cancela o copy nativo e segue
 * pelo caminho com registro (`onRecordedCopy`); `contextmenu` em HIGH segue livre (o menu do navegador não copia sozinho: a cópia vira `copy`). Devolve se cancelou.
 */
export function handleClipboardEvent(event, classification, { onDenied, onRecordedCopy }) {
  const mode = copyModeOf(classification);
  if (mode === "FREE") return false;
  const type = event && event.type;
  if (mode === "DENY") {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    if (type === "copy" || type === "cut" || type === "dragstart" || type === "contextmenu") onDenied(type);
    return true;
  }
  if (type === "copy" || type === "cut") {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    onRecordedCopy(type);
    return true;
  }
  if (type === "dragstart") {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    return true;
  }
  return false;
}

/** Edição de campo sensível vindo mascarado: o valor mascarado nunca volta ao servidor. Devolve só os campos que o usuário de fato digitou. */
export function dropMaskedFields(form, original, fields) {
  const out = { ...form };
  for (const field of fields) {
    if (isServerMasked(original && original[field]) && (out[field] === "" || out[field] === original[field] || out[field] === undefined)) delete out[field];
  }
  return out;
}
