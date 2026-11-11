// Saldo e estorno do lançamento pelo ledger (Caderno M4 §6): cada baixa parcial é um movimento; o estorno de uma baixa devolve o valor ao
// saldo; estornar o lançamento com baixas parciais estorna cada baixa (nunca o valor cheio sobre o que só foi recebido em parte); lançamento
// não realizado não tem movimento no ledger — o estorno só anula o previsto. Mesma regra da API (ledger-balance.service.js).

const cents = (v) => Math.round(Number(v || 0) * 100);

/** Baixas filhas que baixam o saldo (parcial ou complemento; o excedente em pendência de classificação não). */
export function settlementChildren(entry, allEntries = []) {
  if (!entry) return [];
  return allEntries.filter(
    (x) => x.parentEntryId === entry.id && ["SETTLED", "REVERSED"].includes(x.status) && x.movementKind !== "EXCESS" && x.nature !== "PENDING_CLASSIFICATION"
  );
}

/** Centavos já estornados de um movimento (estornos totais e parciais que apontam para ele). */
export function reversedCentsOf(movementId, allEntries = []) {
  return allEntries.filter((x) => x.reversalOfEntryId === movementId).reduce((a, x) => a + cents(x.amount), 0);
}

/** Realizado e saldo em aberto do lançamento, em centavos. */
export function ledgerBalance(entry, allEntries = []) {
  if (!entry) return { realizedCents: 0, remainingCents: 0, children: [] };
  const children = settlementChildren(entry, allEntries);
  const realizedCents = children.reduce((a, c) => a + Math.max(0, cents(c.amount) - reversedCentsOf(c.id, allEntries)), 0);
  return { realizedCents, remainingCents: Math.max(0, cents(entry.amount) - realizedCents), children };
}

/** O que o estorno vai lançar, em texto para a confirmação. */
export function reversalPreview(entry, allEntries = []) {
  if (!entry) return { kind: "NONE", text: "" };
  const { children } = ledgerBalance(entry, allEntries);
  const standing = children.filter((c) => c.status === "SETTLED");
  if (children.length > 0) {
    const total = standing.reduce((a, c) => a + Math.max(0, cents(c.amount) - reversedCentsOf(c.id, allEntries)), 0);
    return {
      kind: "PARENT_WITH_SETTLEMENTS",
      text: `Este lançamento foi recebido/pago em baixas parciais: cada baixa ainda de pé (${standing.length}) ganha o seu estorno, somando ${(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. O lançamento fica estornado.`,
    };
  }
  if (entry.parentEntryId) {
    return {
      kind: "MOVEMENT_CHILD",
      text: `Esta é uma baixa parcial: o estorno devolve ${(cents(entry.amount) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ao saldo do lançamento de origem, que continua aberto para receber/pagar.`,
    };
  }
  if (entry.status === "SETTLED") return { kind: "MOVEMENT", text: "Um lançamento compensatório (REVERSAL) é criado apontando para este movimento; o original nunca é editado." };
  return { kind: "NOT_REALIZED", text: "Este lançamento ainda não foi realizado: nada entra no ledger, o previsto só é anulado." };
}

/** Aviso depois do estorno, pelo que a API respondeu (ledgerEffect). */
export function reversalNotice(result) {
  switch (result?.ledgerEffect) {
    case "PARENT_WITH_SETTLEMENTS":
      return `Lançamento estornado: ${result.reversals?.length || 0} baixa(s) parcial(is) estornada(s), uma linha de estorno para cada baixa.`;
    case "NOT_REALIZED":
      return "Previsto anulado: o lançamento não tinha sido realizado, então nada entrou no ledger.";
    default:
      return "Lançamento estornado — um lançamento compensatório foi criado (o original nunca é editado, ledger imutável).";
  }
}

/** Complemento (Caderno §6): quitar o saldo de um lançamento que já tem baixa, quando ainda há saldo. */
export function canComplement(entry, allEntries = []) {
  if (!entry || !["PENDING", "PARTIALLY_SETTLED"].includes(entry.status)) return false;
  const { children, remainingCents } = ledgerBalance(entry, allEntries);
  return children.length > 0 && remainingCents > 0;
}
