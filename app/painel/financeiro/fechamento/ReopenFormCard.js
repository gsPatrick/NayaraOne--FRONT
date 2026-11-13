"use client";

// Formulário do motivo de duas ações sobre o fechamento:
//  - REOPEN: pedido de reabertura de um mês fechado (Caderno §16, Guia §18 "fluxo CRITICAL"): permissão própria "Reabrir período fechado",
//    MFA recente e motivo com o mínimo de caracteres do parâmetro fechamento.reabertura_motivo_minimo_caracteres. O mês continua fechado
//    até outra pessoa aprovar (lista de pedidos abaixo).
//  - RETURN: devolver um pedido de fechamento em revisão para aberto (motivo obrigatório, aprovação + MFA).
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import { requestPeriodReopen, returnPeriodToOpen } from "@/lib/api/finance";
import { formatCompetence } from "@/lib/format";
import { DEFAULT_REOPEN_MIN_CHARS, reasonCounter } from "@/lib/finance/approvalFlows";
import { financeAuthErrorMessage } from "@/lib/finance/authorizationErrors";
import styles from "./page.module.css";

export default function ReopenFormCard({ target, onCancel, onDone }) {
  const isReturn = target.mode === "RETURN";
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [minChars, setMinChars] = useState(DEFAULT_REOPEN_MIN_CHARS);
  const counter = reasonCounter(reason, minChars);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!reason.trim()) {
      setError(isReturn ? "Informe o que precisa ser corrigido — o motivo é obrigatório e fica auditado." : "Informe o motivo da reabertura — é obrigatório e fica auditado.");
      return;
    }
    if (!isReturn && !counter.ok) {
      setError(`Explique a reabertura com pelo menos ${minChars} caracteres.`);
      return;
    }
    setBusy(true);
    try {
      const result = isReturn
        ? await returnPeriodToOpen(target.referenceMonth, reason.trim())
        : await requestPeriodReopen(target.referenceMonth, reason.trim());
      onDone({ mode: target.mode, referenceMonth: target.referenceMonth, result });
    } catch (err) {
      // O mínimo é parâmetro da empresa: a recusa traz o número em vigor e o contador passa a usá-lo.
      if (err?.code === "FINANCE_PERIOD_REOPEN_REASON_TOO_SHORT" && Number(err.details?.minChars) > 0) setMinChars(Number(err.details.minChars));
      setError(financeAuthErrorMessage(err, isReturn ? "Falha ao devolver o período para aberto." : "Falha ao pedir a reabertura do período."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={styles.formCard}>
      <h2 className={styles.sectionTitle}>
        {isReturn ? "Devolver para aberto" : "Solicitar reabertura de"} {formatCompetence(target.referenceMonth)}
      </h2>
      <form onSubmit={handleSubmit} className={styles.inlineForm}>
        <p className={styles.helper}>
          {isReturn
            ? "Devolver o fechamento para aberto exige motivo, permissão de aprovação e verificação em duas etapas (MFA) recente."
            : "Reabrir um mês fechado é uma ação de risco crítico: este pedido não reabre o mês. Ele continua fechado até outra pessoa, também com a permissão de reabrir período e verificação em duas etapas, aprovar. Pedir exige a verificação em duas etapas recente: se precisar, o código é pedido ao confirmar."}
        </p>
        <FormField
          label="Motivo (obrigatório, fica auditado)"
          htmlFor="reopenReason"
          helper={isReturn ? undefined : `Mínimo de ${minChars} caracteres.`}
        >
          <textarea id="reopenReason" className={styles.textarea} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        {!isReturn ? <span className={styles.helper} aria-live="polite" role="status">{counter.text}</span> : null}
        <div className={styles.reopenActions}>
          <Button type="submit" requires={isReturn ? "finance:approve" : "finance:periodReopen"} loading={busy} disabled={!isReturn && !counter.ok}>
            {isReturn ? "Confirmar devolução" : "Solicitar reabertura"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Cancelar</Button>
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </form>
    </Card>
  );
}
