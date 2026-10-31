// Sincroniza formulário com dado carregado (M9-D940): o dado fresco só reinicia o formulário se o usuário ainda não mexeu nele.

/** true quando o formulário difere do valor original (formulário "sujo"). Sem original = ainda não carregou = não sujo. Aceita objeto plano ou lista. */
export function isFormDirty(values, original) {
  if (original === null || original === undefined || values === null || values === undefined) return false;
  return JSON.stringify(values) !== JSON.stringify(original);
}

/** O dado que chegou pode reiniciar o formulário? Sim na primeira carga e enquanto não há alteração do usuário. */
export function canResetForm(values, original) {
  return !isFormDirty(values, original);
}
