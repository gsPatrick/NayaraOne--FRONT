"use client";

// Caderno M4 §6 "complemento": quita o saldo em aberto de um lançamento que já tem baixa (parcial ou estornada), com a mesma verificação em duas
// etapas da baixa parcial e uma chave de idempotência por tentativa (reenviada se a tentativa falhar). O saldo mostrado vai junto e a API recusa
// se ele tiver mudado (FINANCE_COMPLEMENT_AMOUNT_CHANGED).
import { useRef } from "react";
import { generateIdempotencyKey } from "@/lib/offline/offlineQueue";
import { settleFinancialEntryComplement } from "@/lib/api/finance";
import { friendlyFinanceError } from "@/lib/finance/extras";
import { formatBRL, humanizeText } from "@/lib/format";

/** `context()` devolve, na hora do clique, a ficha atual: entry, remainingCents, confirm, requireAttachedEvidence e os setters da página. */
export default function useComplementAction(context) {
  const keyRef = useRef(null);

  async function handleComplement() {
    const { entry, remainingCents, confirm, requireAttachedEvidence, setMfaAction, setMfaOpen } = context();
    if (requireAttachedEvidence()) return;
    const ok = await confirm({
      title: "Quitar o saldo (complemento)?",
      message: `Será registrado o complemento de ${formatBRL(remainingCents / 100)}, que quita o saldo de "${humanizeText(entry?.description) || ""}".`,
      confirmLabel: "Quitar saldo",
    });
    if (!ok) return;
    if (!keyRef.current || keyRef.current.cents !== remainingCents) keyRef.current = { cents: remainingCents, key: generateIdempotencyKey() };
    setMfaAction("settle-complement");
    setMfaOpen(true);
  }

  async function runComplement() {
    const { entry, remainingCents, setBusy, setNotice, setEntry, load } = context();
    setBusy(true);
    setNotice(null);
    try {
      const updated = await settleFinancialEntryComplement(entry.id, (remainingCents / 100).toFixed(2), keyRef.current.key);
      keyRef.current = null;
      setEntry(updated.original || updated);
      load();
      setNotice({ tone: "success", text: "Complemento registrado: o saldo foi quitado." });
    } catch (err) {
      setNotice({ tone: "danger", text: friendlyFinanceError(err, "Não foi possível registrar o complemento.") });
    } finally {
      setBusy(false);
    }
  }

  return { handleComplement, runComplement };
}
