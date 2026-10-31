// DLP de anexos e impressão (Marco 9, M9-D920): download de arquivo HIGH/RESTRICTED com finalidade, justificativa, verificação em duas etapas, endereço assinado de uso único e marca
// d'água opcional; impressão pelo POST /dlp/print-events. LOW e MEDIUM baixam direto. Os textos de recusa vêm da API (em português).

import { apiFetch, getBaseUrl, ApiError } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

// Códigos em que a tela pede finalidade e justificativa (e a verificação em duas etapas) antes de tentar de novo.
export const DLP_ASK_CODES = ["GOV_DLP_PURPOSE_REQUIRED", "MFA_STEP_UP_REQUIRED"];
export const needsDlpPrompt = (err) => DLP_ASK_CODES.includes(err?.code);

const FRIENDLY = {
  MFA_STEP_UP_REQUIRED: "A verificação em duas etapas expirou. Confirme o código de novo e tente de novo.",
  GOV_DLP_PURPOSE_REQUIRED: "Informe a finalidade e uma justificativa com o tamanho mínimo exigido.",
  GOV_DLP_USER_SUSPENDED: "Suas exportações estão suspensas para revisão de segurança.",
  GOV_FILE_WATERMARK_UNSUPPORTED: "Este tipo de arquivo não aceita marca d'água. Baixe sem a marca ou peça a quem administra para ajustar a política.",
  GOV_DOWNLOAD_ALREADY_USED: "Este endereço já foi usado. Faça um novo pedido.",
  GOV_EXPORT_EXPIRED: "O endereço expirou. Faça um novo pedido.",
};
export const dlpErrorMessage = (err, fallback = "Não foi possível concluir o pedido.") => FRIENDLY[err?.code] || err?.message || fallback;

function authHeaders() {
  const session = getSession();
  return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function failFrom(response, fallback) {
  let error = {};
  try { error = (await response.json())?.error || {}; } catch { /* sem corpo JSON */ }
  return new ApiError(error.message || fallback, { code: error.code, status: response.status, details: error.details });
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const nameFrom = (response, fallback) => {
  const disposition = response.headers.get("Content-Disposition") || "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star) { try { return decodeURIComponent(star[1]); } catch { /* usa o simples */ } }
  return /filename="([^"]+)"/.exec(disposition)?.[1] || fallback;
};

// Baixa um anexo (GET /files/:id/download). LOW e MEDIUM voltam como arquivo; HIGH e RESTRICTED voltam como JSON com o endereço assinado de uso único, que a tela abre na hora.
// `input` = { purpose, justification, watermark } (vazio para tentar sem pedir nada). Devolve { fileName, watermark }.
export async function downloadFileGuarded(fileId, input = {}) {
  const params = new URLSearchParams();
  if (input.purpose) params.set("purpose", input.purpose);
  if (input.justification) params.set("justification", input.justification);
  if (input.watermark) params.set("watermark", "1");
  const base = getBaseUrl();
  let response;
  try {
    response = await fetch(`${base}/files/${fileId}/download${params.size ? `?${params}` : ""}`, { headers: authHeaders() });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.", { code: "NETWORK_ERROR" });
  }
  if (!response.ok) throw await failFrom(response, "Não foi possível baixar o arquivo.");
  if ((response.headers.get("Content-Type") || "").includes("application/json")) {
    const grant = (await response.json())?.data;
    const origin = base.replace(/\/api\/v1\/?$/, "");
    const signed = await fetch(`${origin}${grant.downloadUrl}`, { headers: authHeaders() });
    if (!signed.ok) throw await failFrom(signed, "Não foi possível baixar o arquivo.");
    const name = nameFrom(signed, `arquivo-${fileId}`);
    saveBlob(await signed.blob(), name);
    return { fileName: name, watermark: signed.headers.get("X-Watermark") === "applied" };
  }
  const name = nameFrom(response, `arquivo-${fileId}`);
  saveBlob(await response.blob(), name);
  return { fileName: name, watermark: response.headers.get("X-Watermark") === "applied" };
}

// Impressão (POST /dlp/print-events): toda tela imprimível pede aqui ANTES de abrir a visão de impressão. Devolve { exportJobId, status, printUrl }.
export async function requestPrintEvent({ resourceType, resourceId, purpose, justification, watermark }) {
  return apiFetch("/dlp/print-events", { method: "POST", skipMfaStepUp: true, body: { resourceType, resourceId, purpose, justification, watermark: Boolean(watermark) } });
}

// Abre o PDF de impressão (endereço de uso único) numa nova aba. Devolve o Blob do PDF.
export async function openPrintPdf(printUrl) {
  const origin = getBaseUrl().replace(/\/api\/v1\/?$/, "");
  const response = await fetch(`${origin}${printUrl}`, { headers: authHeaders() });
  if (!response.ok) throw await failFrom(response, "Não foi possível abrir o PDF de impressão.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return blob;
}
