// Sessão real — substitui o mock em lib/mock/session.js para o fluxo de autenticação.
// Guarda os tokens e os dados devolvidos por POST /auth/login (ver docs/INTEGRACAO_API.md).
// Mantém a mesma "forma" de usuário atual ({id, name, email, ...}) esperada pelos componentes
// que hoje consomem lib/mock/session.getCurrentUser().

const KEYS = {
  accessToken: "nayaraone.auth.accessToken",
  refreshToken: "nayaraone.auth.refreshToken",
  sessionId: "nayaraone.auth.sessionId",
  user: "nayaraone.auth.user",
  groupId: "nayaraone.auth.groupId",
  companyId: "nayaraone.auth.companyId",
  roles: "nayaraone.auth.roles",
  permissions: "nayaraone.auth.permissions",
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function saveSession({
  accessToken,
  refreshToken,
  sessionId,
  user,
  groupId,
  companyId,
  roles,
  permissions,
}) {
  if (!isBrowser()) return;
  const { localStorage } = window;
  if (accessToken) localStorage.setItem(KEYS.accessToken, accessToken);
  if (refreshToken) localStorage.setItem(KEYS.refreshToken, refreshToken);
  if (sessionId) localStorage.setItem(KEYS.sessionId, sessionId);
  if (user) localStorage.setItem(KEYS.user, JSON.stringify(user));
  if (groupId) localStorage.setItem(KEYS.groupId, groupId);
  if (companyId) localStorage.setItem(KEYS.companyId, companyId);
  if (roles) localStorage.setItem(KEYS.roles, JSON.stringify(roles));
  if (permissions) localStorage.setItem(KEYS.permissions, JSON.stringify(permissions));
}

export function getSession() {
  if (!isBrowser()) return null;
  const { localStorage } = window;
  const accessToken = localStorage.getItem(KEYS.accessToken);
  if (!accessToken) return null;

  let user = null;
  let roles = [];
  let permissions = [];
  try {
    user = JSON.parse(localStorage.getItem(KEYS.user) || "null");
  } catch {
    user = null;
  }
  try {
    roles = JSON.parse(localStorage.getItem(KEYS.roles) || "[]");
  } catch {
    roles = [];
  }
  try {
    permissions = JSON.parse(localStorage.getItem(KEYS.permissions) || "[]");
  } catch {
    permissions = [];
  }

  return {
    accessToken,
    refreshToken: localStorage.getItem(KEYS.refreshToken) || null,
    sessionId: localStorage.getItem(KEYS.sessionId) || null,
    user,
    groupId: localStorage.getItem(KEYS.groupId) || null,
    companyId: localStorage.getItem(KEYS.companyId) || null,
    roles,
    permissions,
  };
}

export function clearSession() {
  if (!isBrowser()) return;
  const { localStorage } = window;
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

// Compatível com a forma usada por lib/mock/session.getCurrentUser(): retorna
// {id, name, email, ...} do usuário logado, ou null se não houver sessão.
export function getCurrentUser() {
  return getSession()?.user || null;
}
