// Registro local (só deste navegador) da última verificação MFA bem-sucedida, para a tela
// avisar quando a janela de "MFA recente" está valendo: ações como aprovar/reabrir o fechamento
// NÃO pedem o código de novo enquanto a janela (definida pela API) estiver aberta.
const KEY = "nayaraone:mfa-recent";

export function rememberMfaVerified(result) {
  try {
    const verifiedAt = result?.verifiedAt ? new Date(result.verifiedAt).getTime() : Date.now();
    const expiresAt = result?.expiresAt ? new Date(result.expiresAt).getTime() : null;
    window.sessionStorage.setItem(KEY, JSON.stringify({ verifiedAt, expiresAt }));
  } catch {
    // sem sessionStorage: o aviso simplesmente não aparece.
  }
}

// Retorna { minutesAgo, minutesLeft } se a janela ainda vale; senão null.
export function readRecentMfa(now = Date.now()) {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { verifiedAt, expiresAt } = JSON.parse(raw);
    if (!verifiedAt || !expiresAt || expiresAt <= now) return null;
    return {
      minutesAgo: Math.max(0, Math.floor((now - verifiedAt) / 60000)),
      minutesLeft: Math.max(1, Math.ceil((expiresAt - now) / 60000)),
    };
  } catch {
    return null;
  }
}
