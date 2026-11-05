// Textos e regra única do aviso "MFA exigido e não habilitado" (MFA_REQUIRED_NOT_ENABLED), usados por todas as telas.
export const MFA_SETUP_REQUIRED_CODE = "MFA_REQUIRED_NOT_ENABLED";

export const MFA_SETUP_NOTICE = Object.freeze({
  title: "Configuração de segurança necessária",
  text: "Esta ação exige verificação em duas etapas (MFA) habilitada na sua conta. Configure em Meu perfil e tente de novo.",
  href: "/painel/perfil",
  linkLabel: "Ir para Meu perfil",
  dismissLabel: "Fechar aviso",
});

/** A API recusou por falta de MFA configurado? */
export function isMfaSetupRequired(err) {
  return Boolean(err) && err.code === MFA_SETUP_REQUIRED_CODE;
}
