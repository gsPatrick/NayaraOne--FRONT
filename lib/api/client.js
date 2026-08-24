// Wrapper de fetch para a API real do Nayara One.
// Entende o envelope {success:true, data} / {success:false, error:{code,message}} e trata
// renovação de sessão (401 -> tenta /auth/refresh uma vez -> repete a chamada original).

import { getSession, saveSession, clearSession } from "@/lib/auth/session";

export class ApiError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code || "UNKNOWN_ERROR";
    this.status = status;
  }
}

// URL da API fixa no código (em vez de depender de NEXT_PUBLIC_API_URL no ambiente de deploy —
// evita esquecer de configurar a env var em cada domínio de front que subir).
function getBaseUrl() {
  return "https://homologacao-nayaraone--api.hpztyd.easypanel.host/api/v1";
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.href = "/entrar";
  }
}

let refreshPromise = null;

async function doRefresh() {
  const session = getSession();
  if (!session?.refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = fetch(`${getBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
      .then(async (response) => {
        const body = await parseBody(response);
        if (!response.ok || !body?.success) return false;
        saveSession(body.data);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// options: { method, body, headers, skipAuth, skipRefresh }
export async function apiFetch(path, options = {}) {
  const { method = "GET", body, headers = {}, skipAuth = false, skipRefresh = false } = options;

  const session = skipAuth ? null : getSession();
  const finalHeaders = { "Content-Type": "application/json", ...headers };
  if (session?.accessToken) {
    finalHeaders.Authorization = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const parsed = await parseBody(response);

  if (response.status === 401 && !skipAuth && !skipRefresh) {
    const refreshed = await doRefresh();
    if (refreshed) {
      return apiFetch(path, { ...options, skipRefresh: true });
    }
    clearSession();
    redirectToLogin();
    throw new ApiError("Sessão expirada. Faça login novamente.", { code: "SESSION_EXPIRED", status: 401 });
  }

  if (!response.ok || parsed?.success === false) {
    const error = parsed?.error || {};
    throw new ApiError(error.message || "Erro inesperado ao comunicar com a API.", {
      code: error.code || "UNKNOWN_ERROR",
      status: response.status,
    });
  }

  return parsed?.data;
}
