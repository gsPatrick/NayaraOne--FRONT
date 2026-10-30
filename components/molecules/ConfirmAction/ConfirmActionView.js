"use client";

import Button from "@/components/atoms/Button/Button";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Input from "@/components/atoms/Input/Input";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import SupportCode from "@/components/molecules/SupportCode/SupportCode";
import { confirmState, impactLines, formatCents, impactSummary } from "@/lib/destructiveActions/state";
import styles from "./ConfirmAction.module.css";

/**
 * Corpo da confirmação de ação destrutiva (M9-D852 §3.1), sem estado próprio: recebe o impacto (calculado pelo servidor) e o que a pessoa preencheu.
 *  - Nível 1: resumo e botão. Nível 2: contagens e itens afetados + "Entendi o impacto". Nível 3: também o código do registro digitado e a justificativa.
 *  - Impedimento: o botão fica desabilitado e a frase "Não é possível continuar: <motivo>." aparece.
 */
export default function ConfirmActionView({ impact, loading, loadError, submitError, understood, typedCode, justification, busy, confirmLabel = "Confirmar", cancelLabel = "Cancelar", tone = "danger", onUnderstood, onTypedCode, onJustification, onConfirm, onCancel, onReload, intro }) {
  const state = confirmState({ impact, understood, typedCode, justification });
  const level = (impact && impact.level) || 1;
  const blockers = (impact && impact.blockers) || [];
  const lines = impact ? impactLines(impact) : [];

  return (
    <div data-confirm-action="true" data-level={level}>
      {intro || null}
      {loading ? (
        <div role="status" aria-busy="true"><Spinner /> <span>Calculando o impacto...</span></div>
      ) : null}
      {loadError ? (
        <div>
          <Alert tone="danger" title="Não foi possível calcular o impacto">{loadError.message}</Alert>
          <SupportCode traceId={loadError.traceId} />
          {onReload ? <div className={styles.footer}><Button size="sm" onClick={onReload}>Tentar novamente</Button></div> : null}
        </div>
      ) : null}

      {impact ? (
        <>
          <p className={styles.summary}>{impactSummary(impact)}</p>
          {lines.length ? <ul className={styles.list}>{lines.map((line) => <li key={line}>{line}</li>)}</ul> : null}
          {impact.totalAmountCents > 0 ? <p>Valor envolvido: <strong>{formatCents(impact.totalAmountCents)}</strong></p> : null}
          {level >= 2 && impact.items && impact.items.length ? (
            <ul className={styles.items} aria-label="Itens afetados">
              {impact.items.map((item) => <li key={`${item.type}-${item.id}`}>{item.label}{item.amount !== undefined ? ` · R$ ${item.amount}` : ""}</li>)}
            </ul>
          ) : null}
          {blockers.length ? (
            <Alert tone="warning" title="Há impedimento">{`Não é possível continuar: ${blockers.map((b) => String(b.message || "").replace(/[.\s]+$/, "")).join("; ")}.`}</Alert>
          ) : null}

          {level >= 2 ? (
            <div className={styles.field}>
              <Checkbox id="confirm-action-understood" label="Entendi o impacto" checked={Boolean(understood)} onChange={(event) => onUnderstood && onUnderstood(event.target.checked)} disabled={blockers.length > 0} />
            </div>
          ) : null}
          {level >= 3 ? (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirm-action-code">{`Digite ${impact.record.codeLabel} para confirmar: ${impact.record.code}`}</label>
                <Input id="confirm-action-code" value={typedCode || ""} autoComplete="off" onChange={(event) => onTypedCode && onTypedCode(event.target.value)} disabled={blockers.length > 0} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirm-action-justification">{`Justificativa (mínimo ${impact.confirm.justificationMin} caracteres)`}</label>
                <textarea id="confirm-action-justification" className={styles.textarea} value={justification || ""} onChange={(event) => onJustification && onJustification(event.target.value)} disabled={blockers.length > 0} />
              </div>
            </>
          ) : null}
          {impact.mfaRequired ? <p className={styles.reasons}>Esta ação pede a verificação em duas etapas.</p> : null}
          {!state.canConfirm && !blockers.length ? (
            <ul className={styles.reasons} aria-label="O que falta para confirmar">{state.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          ) : null}
        </>
      ) : null}

      {submitError ? (
        <div className={styles.error}>
          <Alert tone="danger">{submitError.message}</Alert>
          <SupportCode traceId={submitError.traceId} />
        </div>
      ) : null}

      <div className={styles.footer}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
        <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={!state.canConfirm || busy} loading={busy} data-confirm-button="true">{confirmLabel}</Button>
      </div>
    </div>
  );
}
