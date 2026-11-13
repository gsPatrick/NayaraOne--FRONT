"use client";

// Pedidos de reabertura de período aguardando decisão (Caderno §16; Guia §18 "fluxo CRITICAL"). Quem decide é OUTRA pessoa com a
// permissão "Reabrir período fechado" e MFA recente; o nº de aprovações é o parâmetro fechamento.reabertura.aprovadores (vem no pedido).
// Atingido o número, o mês reabre; recusar encerra o pedido e o mês continua fechado.
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { approvePeriodReopenRequest, rejectPeriodReopenRequest } from "@/lib/api/financeApprovals";
import { decisionBlock, decisionProgress } from "@/lib/finance/approvalFlows";
import { financeAuthErrorMessage } from "@/lib/finance/authorizationErrors";
import { RISK_LEVEL_LABELS, RISK_LEVEL_TONE } from "@/lib/mock/finance";
import { formatCompetence, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const FIXED = { position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" };

export default function ReopenRequestsCard({ requests, currentUserId, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const pending = (requests || []).filter((r) => r.status === "PENDING");

  async function decide(request, approve) {
    const month = formatCompetence(request.payloadJson?.referenceMonth);
    const ok = await confirm({
      title: approve ? `Aprovar a reabertura de ${month}?` : `Recusar a reabertura de ${month}?`,
      message: approve
        ? `Motivo do pedido: "${request.reason || "sem motivo registrado"}". Ao atingir o número de aprovações, o mês reabre e lançamentos dele voltam a poder ser criados e editados. Pede a verificação em duas etapas se a sua não for recente.`
        : "O pedido é encerrado e o mês continua fechado. Pede a verificação em duas etapas se a sua não for recente.",
      confirmLabel: approve ? "Aprovar reabertura" : "Recusar",
      tone: approve ? "primary" : "danger",
    });
    if (!ok) return;
    setBusyId(request.id);
    setMessage(null);
    try {
      if (approve) {
        const result = await approvePeriodReopenRequest(request.id);
        const reopened = result?.closure?.status === "OPEN";
        const progress = `${result?.approvedCount ?? 1} de ${result?.required ?? decisionProgress(request).required}`;
        setMessage({ tone: "success", text: reopened ? `Período ${month} reaberto.` : `Sua aprovação foi registrada (${progress}). Falta a aprovação de outra pessoa.` });
      } else {
        await rejectPeriodReopenRequest(request.id);
        setMessage({ tone: "info", text: `Pedido de reabertura de ${month} recusado. O mês continua fechado.` });
      }
      onChanged();
    } catch (err) {
      setMessage({ tone: "danger", text: financeAuthErrorMessage(err, "Não foi possível decidir o pedido de reabertura.") });
      if (["FINANCE_APPROVAL_STALE", "FINANCE_APPROVAL_ALREADY_DECIDED"].includes(err?.code)) onChanged();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className={styles.formCard}>
      {message ? (
        <div style={FIXED}>
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      ) : null}
      <h2 className={styles.sectionTitle}>Pedidos de reabertura</h2>
      <p className={styles.helper}>A reabertura só acontece quando outra pessoa, com a permissão de reabrir período e verificação em duas etapas, aprova o pedido.</p>
      {pending.length === 0 ? (
        <p className={styles.helper}>Nenhum pedido de reabertura aguardando decisão.</p>
      ) : (
        <ul className={styles.checklist}>
          {pending.map((request) => {
            const block = decisionBlock(request, currentUserId);
            const progress = decisionProgress(request);
            const mine = String(request.requestedByUserId) === String(currentUserId);
            return (
              <li key={request.id} className={styles.checkItem}>
                <div className={styles.checkHeader}>
                  <span className={styles.checkLabel}>Reabrir {formatCompetence(request.payloadJson?.referenceMonth)}</span>
                  <Badge tone={RISK_LEVEL_TONE[request.riskLevel] || "danger"}>Risco {RISK_LEVEL_LABELS[request.riskLevel] || "Crítico"}</Badge>
                </div>
                <p className={styles.checkDetail}>
                  Motivo: {request.reason || "sem motivo registrado"} · pedido {mine ? "por você" : "por outra pessoa"} em {formatDateTime(request.createdAt || request.created_at)} · {progress.text}
                </p>
                {block.allowed ? (
                  <div className={styles.reopenActions}>
                    <Button requires="finance:periodReopen" size="sm" onClick={() => decide(request, true)} loading={busyId === request.id}>Aprovar reabertura</Button>
                    <Button requires="finance:periodReopen" size="sm" variant="secondary" onClick={() => decide(request, false)} loading={busyId === request.id}>Recusar</Button>
                  </div>
                ) : (
                  <p className={styles.helper}>{block.reason}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog />
    </Card>
  );
}
