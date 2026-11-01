// Vínculos do usuário para a tela de Usuários (M9-D850, reabertura F12): GET /users não traz empresa, unidade nem papel; isso vem de GET /memberships.
// O cruzamento aceita as duas grafias de chave que a API devolve (userId e user_id) e nunca confunde "não carregou" com "sem vínculo".

const userIdOf = (membership) => membership.userId ?? membership.user_id ?? null;

/** Vínculos do usuário (empresa, papel, unidade). `status` REVOKED/INACTIVE não conta como vínculo ativo. */
export function buildMemberships(userId, memberships) {
  const list = Array.isArray(memberships) ? memberships : [];
  return list
    .filter((m) => userIdOf(m) === userId && (!m.status || m.status === "ACTIVE"))
    .map((m) => ({
      company: m.company?.name || "Sem empresa vinculada",
      role: m.role?.name || "Sem papel",
      unit: m.unit?.name || null,
    }));
}

/** Texto da célula quando o usuário não tem vínculo ativo na empresa em uso (a lista veio, o usuário não está nela). */
export const NO_MEMBERSHIP_TEXT = "Sem vínculo ativo nesta empresa";
