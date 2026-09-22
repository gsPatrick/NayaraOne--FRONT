// Chamadas ao módulo de arquivos da API real (POST/GET /files, ver
// NayaraOne--API/src/features/files/). Usado pelo FileViewerModal e por qualquer tela que
// precise mostrar/baixar um arquivo já enviado (mídia de vistoria, documento de pessoa, etc).

import { apiFetch, getBaseUrl, ApiError } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";

// GET /files/:id — metadado (fileName, mimeType, sizeBytes, checksumSha256), sem o binário.
export async function getFileMeta(id) {
  return apiFetch(`/files/${id}`);
}

// GET /files/:id/content — bytes do arquivo, autenticado. Exige Bearer token no header (não
// dá pra usar a URL direto como src de <img>/<audio>/<video>/<iframe>), então buscamos com
// fetch() cru e devolvemos um Blob pra quem chamar criar um Object URL local.
export async function getFileContentBlob(id) {
  const { blob } = await fetchFileContent(id);
  return blob;
}

// Faz o fetch de GET /files/:id/content e devolve o Blob junto com um metadado "best effort"
// extraído dos headers da própria resposta (Content-Type, Content-Disposition, Content-Length).
// Existe pra deixar o visualizador funcional mesmo se GET /files/:id (metadado dedicado) não
// estiver disponível no ambiente (ex.: deploy do backend ainda não propagou essa rota) — o
// endpoint de conteúdo já manda tudo que precisamos nos headers.
export async function fetchFileContent(id) {
  const session = getSession();
  const headers = {};
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  const response = await fetch(`${getBaseUrl()}/files/${id}/content`, { headers });
  if (!response.ok) {
    let message = "Erro ao carregar o arquivo.";
    let code = "UNKNOWN_ERROR";
    try {
      const body = await response.json();
      message = body?.error?.message || message;
      code = body?.error?.code || code;
    } catch {
      // resposta não era JSON (ex.: 500 sem envelope, ou 404 puro) — mensagem genérica.
    }
    throw new ApiError(message, { code, status: response.status });
  }
  const blob = await response.blob();
  const mimeType = response.headers.get("Content-Type") || blob.type || "application/octet-stream";
  const disposition = response.headers.get("Content-Disposition") || "";
  const fileNameMatch = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : `arquivo-${id}`;
  const sizeBytes = Number(response.headers.get("Content-Length")) || blob.size;
  return { blob, meta: { id, fileName, mimeType, sizeBytes } };
}
