"use client";

// Liquidar, liquidar parcial, pedir aprovação e criar a intenção de pagamento (Caderno M4 §8 e §10; FIN-004). Cada baixa leva uma chave de
// idempotência gerada uma vez e reenviada se a tentativa falhar (duplo clique ou nova tentativa nunca baixam duas vezes); a baixa passa pela
// verificação em duas etapas (MfaVerifyModal da página). `context()` devolve, na hora da ação, a ficha atual e os setters da página.
import { useRef, useState } from "react";
import { generateIdempotencyKey } from "@/lib/offline/offlineQueue";
import { settleFinancialEntry, settleFinancialEntryPartial, createApprovalRequest } from "@/lib/api/finance";
import { friendlyFinanceError } from "@/lib/finance/extras";
import { formatBRL, humanizeText, toNumber } from "@/lib/format";

export default function useSettlementActions(context) {
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  // FIN-004: uma chave por baixa; a mesma chave é reenviada se a tentativa falhar (replay sem baixa dupla).
  const settleKeyRef = useRef(null);
  const partialKeyRef = useRef(null);

  async function withBusy(fn, failText) {
    const { setBusy, setNotice } = context();
    setBusy(true);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setNotice({ tone: "danger", text: friendlyFinanceError(err, failText) });
    } finally {
      setBusy(false);
    }
  }

  async function handleSettle() {
    const { entry, needsManualEvidence, confirm, requireAttachedEvidence, setMfaAction, setMfaOpen } = context();
    if (requireAttachedEvidence()) return;
    const ok = await confirm({
      title: "Liquidar este lançamento?",
      message: needsManualEvidence
        ? `O pagamento "${humanizeText(entry?.description) || ""}" (${formatBRL(entry?.amount)}) será registrado como baixa manual com o comprovante anexado — não como confirmação do banco. A conciliação com o extrato continua necessária.`
        : `O lançamento "${humanizeText(entry?.description) || ""}" (${formatBRL(entry?.amount)}) será marcado como liquidado.`,
      confirmLabel: "Liquidar",
    });
    if (!ok) return;
    if (!settleKeyRef.current) settleKeyRef.current = generateIdempotencyKey();
    setMfaAction("settle");
    setMfaOpen(true);
  }

  async function runSettle() {
    const { entry, needsManualEvidence, setEntry, setNotice, load } = context();
    await withBusy(async () => {
      const updated = await settleFinancialEntry(entry.id, null, settleKeyRef.current);
      settleKeyRef.current = null;
      setEntry(updated);
      load();
      setNotice({ tone: "success", text: needsManualEvidence ? "Baixa manual registrada com o comprovante anexado." : "Lançamento liquidado com sucesso." });
    }, "Não foi possível liquidar o lançamento.");
  }

  // GAP REAL CORRIGIDO (Marco 4, 12/10/2026): baixa parcial (FIN-TS-006) pela tela, com o mesmo step-up MFA do Liquidar total.
  async function handleSettlePartial() {
    const { entry, confirm, requireAttachedEvidence, setMfaAction, setMfaOpen } = context();
    const amount = toNumber(partialAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (requireAttachedEvidence()) return;
    const ok = await confirm({
      title: "Liquidar parcialmente?",
      message: `Será registrada uma baixa de ${formatBRL(amount)} sobre o saldo de "${humanizeText(entry?.description) || ""}".`,
      confirmLabel: "Liquidar parcial",
    });
    if (!ok) return;
    if (!partialKeyRef.current || partialKeyRef.current.amount !== amount) {
      partialKeyRef.current = { amount, key: generateIdempotencyKey() };
    }
    setMfaAction("settle-partial");
    setMfaOpen(true);
  }

  async function runSettlePartial() {
    const { entry, setEntry, setNotice, load } = context();
    await withBusy(async () => {
      const amount = toNumber(partialAmount);
      if (!partialKeyRef.current || partialKeyRef.current.amount !== amount) partialKeyRef.current = { amount, key: generateIdempotencyKey() };
      const updated = await settleFinancialEntryPartial(entry.id, amount, null, partialKeyRef.current.key);
      partialKeyRef.current = null;
      setEntry(updated.original || updated);
      load();
      setPartialOpen(false);
      setPartialAmount("");
      setNotice({ tone: "success", text: "Baixa parcial registrada com sucesso." });
    }, "Não foi possível registrar a baixa parcial.");
  }

  async function handleRequestApproval() {
    const { entry, confirm, setApprovalRequest, setNotice, load } = context();
    const ok = await confirm({
      title: "Solicitar aprovação de pagamento?",
      message: `Uma solicitação de aprovação será aberta para "${humanizeText(entry?.description) || ""}". O lançamento só poderá ser liquidado depois que ela for aprovada.`,
      confirmLabel: "Solicitar aprovação",
    });
    if (!ok) return;
    await withBusy(async () => {
      const created = await createApprovalRequest({ relatedEntityType: "FinancialEntry", relatedEntityId: entry.id });
      setApprovalRequest(created);
      load();
      setNotice({ tone: "success", text: "Aprovação solicitada. Acompanhe em Financeiro → Aprovações." });
    }, "Não foi possível solicitar a aprovação.");
  }

  return {
    partialOpen, setPartialOpen, partialAmount, setPartialAmount,
    handleSettle, runSettle, handleSettlePartial, runSettlePartial, handleRequestApproval,
  };
}
