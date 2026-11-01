// Exportação de arquivos pelo POST /exports (Marco 9, M9-D822): todo arquivo de dados sai com finalidade, justificativa, verificação em duas etapas, auditoria e
// prazo de validade. A tela pede, espera o arquivo ficar pronto e baixa pelo endereço assinado.

import { apiFetch, getBaseUrl, ApiError } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

const POLL_MS = 700;
const POLL_MAX = 60;

// O que a tela precisa para montar o pedido: recursos que a pessoa pode exportar (com colunas e formatos), finalidades, mínimo da justificativa e formatos ligados.
export async function getExportCatalog() {
  return apiFetch("/exports/catalog");
}

// A chave de repetição é nova a cada tentativa: um pedido bloqueado (por exemplo, sem a verificação em duas etapas) fica registrado com a chave dele.
function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-export`;
}

const FRIENDLY = {
  MFA_STEP_UP_REQUIRED: "A verificação em duas etapas expirou. Confirme o código de novo e tente exportar.",
  MFA_REQUIRED_NOT_ENABLED: "Para exportar, ative a verificação em duas etapas no seu perfil.",
  GOV_DLP_PURPOSE_REQUIRED: "Informe a finalidade e uma justificativa com o tamanho mínimo exigido.",
  GOV_DLP_VOLUME_EXCEEDED: "O volume pedido passa do limite desta classificação. Escolha um período menor.",
  GOV_DLP_USER_SUSPENDED: "Suas exportações estão suspensas para revisão de segurança.",
  GOV_DLP_PERMISSION: "Você não tem permissão para esta exportação.",
  GOV_EXPORT_EXPIRED: "O arquivo expirou. Faça uma nova solicitação.",
  GOV_EXPORT_FAILED: "A geração do arquivo falhou. Faça uma nova solicitação.",
};

export function exportErrorMessage(err, fallback = "Não foi possível exportar.") {
  return FRIENDLY[err?.code] || err?.message || fallback;
}

// F14: a janela de verificação em duas etapas já pode estar válida; só se pede o código quando a API responde MFA_STEP_UP_REQUIRED (e uma vez por tentativa).
export function needsMfaPrompt(err, alreadyVerified = false) {
  return err?.code === "MFA_STEP_UP_REQUIRED" && !alreadyVerified;
}

// F17: arquivo sem linhas é avisado, nunca apresentado como sucesso comum.
export function exportDoneNotice(result, noun = "linha(s)") {
  const empty = Number(result?.rowCount) === 0;
  const base = `Arquivo ${result.fileName} gerado (${result.rowCount} ${noun}).`;
  if (empty) return { tone: "warning", text: `${base} O arquivo está vazio: nenhum registro bate com o filtro escolhido. Confira a competência ou o lote e exporte de novo.` };
  return { tone: "success", text: `${base} A exportação fica registrada na auditoria e o arquivo expira sozinho.` };
}

async function downloadSigned(downloadUrl, fallbackName) {
  const session = getSession();
  const base = getBaseUrl().replace(/\/api\/v1\/?$/, "");
  let response;
  try {
    response = await fetch(`${base}${downloadUrl}`, { headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {} });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.", { code: "NETWORK_ERROR" });
  }
  if (!response.ok) {
    let error = {};
    try { error = (await response.json())?.error || {}; } catch { /* sem corpo JSON */ }
    throw new ApiError(error.message || "Não foi possível baixar o arquivo.", { code: error.code, status: response.status });
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return name;
}

// Pede, espera o arquivo ficar pronto e baixa. Devolve { fileName, rowCount, expiresAt }.
export async function runExport({ resourceType, filter, columns, format, purpose, justification, watermark }) {
  const created = await apiFetch("/exports", {
    method: "POST",
    headers: { "Idempotency-Key": newIdempotencyKey() },
    skipMfaStepUp: true,
    body: { resourceType, filter, columns, format, purpose, justification, watermark: Boolean(watermark) },
  });
  let job = null;
  for (let i = 0; i < POLL_MAX; i += 1) {
    job = await apiFetch(`/exports/${created.exportJobId}`);
    if (job.status === "READY" || job.status === "FAILED" || job.status === "EXPIRED") break;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  if (!job || job.status === "FAILED") throw new ApiError(FRIENDLY.GOV_EXPORT_FAILED, { code: "GOV_EXPORT_FAILED" });
  if (job.status !== "READY") throw new ApiError("O arquivo ainda está sendo gerado. Abra Exportações em alguns instantes.", { code: "GOV_EXPORT_NOT_READY" });
  const fileName = await downloadSigned(job.downloadUrl, job.fileName || "exportacao");
  return { fileName, rowCount: job.rowCount, expiresAt: job.expiresAt };
}
