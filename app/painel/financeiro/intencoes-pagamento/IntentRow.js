"use client";

// Uma intenção de pagamento na lista (Guia M4 §3 e §4; Caderno §8 e §9): valor e parcela, favorecido congelado na preparação, risco e
// de onde ele veio (regra REG-FIN-002 ou faixas de valor), progresso "X de N aprovações", aviso de intenção invalidada e as ações
// que o estado permite. As ações em si ficam na página (callbacks).
import Alert from "@/components/molecules/Alert/Alert";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import { RISK_LEVEL_LABELS, RISK_LEVEL_TONE } from "@/lib/mock/finance";
import { formatDateTime, humanizeText } from "@/lib/format";
import {
  approvalProgress,
  beneficiaryRows,
  frozenBeneficiary,
  hasApproved,
  intentAmountText,
  intentInvalidation,
  intentStatusLabel,
  intentStatusTone,
  isLegacySnapshot,
  riskSourceLabel,
} from "@/lib/finance/paymentIntents";
import styles from "./page.module.css";

function ApprovalInfo({ approval }) {
  const progress = approvalProgress(approval);
  if (!approval || !progress) return <span className={styles.rowSubtitle}>Sem pedido de aprovação vinculado.</span>;
  return (
    <span className={styles.rowSubtitle}>
      <Badge tone={RISK_LEVEL_TONE[approval.riskLevel] || "neutral"}>Risco {RISK_LEVEL_LABELS[approval.riskLevel] || "não informado"}</Badge>{" "}
      definido por: {riskSourceLabel(approval.riskSource)} · <strong>{progress.text}</strong>
    </span>
  );
}

export default function IntentRow({ intent, entry, currentUserId, busy, rowResult, onApprove, onExecute, onCancel, onReconcile, onResolve }) {
  const invalidation = intentInvalidation(intent);
  const legacy = isLegacySnapshot(intent);
  const mine = Boolean(currentUserId) && String(intent.createdBy) === String(currentUserId);
  const alreadyApproved = hasApproved(intent.approval, currentUserId);
  return (
    <li className={styles.row}>
      <div className={styles.rowInfo}>
        <span className={styles.rowTitle}>{humanizeText(entry?.description) || "Lançamento"}</span>
        <span className={styles.rowSubtitle}>
          {intentAmountText(intent)} · código de verificação {intent.snapshotHash ? `${intent.snapshotHash.slice(0, 10)}…` : "não gerado"} · preparada em{" "}
          {formatDateTime(intent.createdAt || intent.created_at)}
        </span>
        <span className={styles.rowSubtitle}>
          Favorecido congelado na preparação:{" "}
          {beneficiaryRows(frozenBeneficiary(intent)).map(([label, value]) => `${label}: ${value}`).join(" · ")}
        </span>
        <ApprovalInfo approval={intent.approval} />
        {invalidation ? (
          <Alert tone="warning" title={invalidation.title}>{invalidation.reason}</Alert>
        ) : intent.status === "CANCELED" && intent.cancelReason ? (
          <span className={styles.rowSubtitle}>Cancelada: {humanizeText(intent.cancelReason)}</span>
        ) : null}
        {legacy && ["PENDING_APPROVAL", "APPROVED"].includes(intent.status) ? (
          <Alert tone="warning">Preparada antes de o favorecido fazer parte do retrato: não pode ser aprovada nem paga. Cancele e prepare uma nova.</Alert>
        ) : null}
        {rowResult ? <Alert tone={rowResult.tone}>{rowResult.text}</Alert> : null}
      </div>
      <div className={styles.rowRight}>
        <Badge tone={invalidation ? "warning" : intentStatusTone(intent)}>{invalidation ? "Invalidada" : intentStatusLabel(intent)}</Badge>
        {!invalidation && intent.statusMessage ? <span className={styles.rowSubtitle}>{intent.statusMessage}</span> : null}
        {intent.reconciledAt ? <Badge tone="success">Conciliado com o extrato</Badge> : null}
        {intent.status === "PENDING_APPROVAL" ? (
          <>
            {mine ? (
              <span className={styles.rowSubtitle}>Você preparou: a aprovação é de outra pessoa</span>
            ) : alreadyApproved ? (
              <span className={styles.rowSubtitle}>Você já aprovou: falta outra pessoa</span>
            ) : (
              <Button requires="finance:approve" size="sm" onClick={() => onApprove(intent)} loading={busy}>Aprovar</Button>
            )}
            <Button requires="finance:update" size="sm" variant="secondary" onClick={() => onCancel(intent)} loading={busy}>Cancelar</Button>
          </>
        ) : null}
        {intent.status === "EXECUTING" ? (
          <>
            <Button requires="finance:settle" size="sm" variant="secondary" onClick={() => onReconcile(intent)} loading={busy}>Consultar banco</Button>
            <Button requires="finance:approve" size="sm" variant="secondary" onClick={() => onResolve(intent)} loading={busy}>Resolver incerteza</Button>
          </>
        ) : null}
        {intent.status === "APPROVED" ? (
          <>
            <Button requires="finance:settle" size="sm" onClick={() => onExecute(intent)} loading={busy}>
              <Icon name="check" size={14} /> Registrar pagamento
            </Button>
            <Button requires="finance:update" size="sm" variant="secondary" onClick={() => onCancel(intent)} loading={busy}>Cancelar</Button>
          </>
        ) : null}
      </div>
    </li>
  );
}
