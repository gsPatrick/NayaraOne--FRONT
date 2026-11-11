"use client";

// Estornos pendentes (Guia M4 §8 e §15; DEC-003, DEC-062): cada pedido de estorno é um caso que OUTRA pessoa, com "Aprovar" do Financeiro
// e verificação em duas etapas recente, aprova (só então o lançamento compensatório é criado) ou recusa (nada é lançado).
import { useState } from "react";
import Link from "next/link";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listReversalCases, approveReversalCase, rejectReversalCase } from "@/lib/api/financeApprovals";
import { decisionBlock } from "@/lib/finance/approvalFlows";
import { financeAuthErrorMessage } from "@/lib/finance/authorizationErrors";
import { RISK_LEVEL_LABELS, RISK_LEVEL_TONE } from "@/lib/mock/finance";
import { formatBRL, formatDateTime, humanizeText } from "@/lib/format";
import styles from "./page.module.css";

function reversalAmountText(item) {
  const partial = item.payloadJson?.partialAmount;
  return partial ? `${formatBRL(partial)} (estorno parcial de ${formatBRL(item.original?.amount)})` : `${formatBRL(item.amount ?? item.original?.amount)} (valor total)`;
}

export default function ReversalCasesCard({ currentUserId, userName, onNotice, onDecided }) {
  const casesQuery = useAsyncState(() => listReversalCases({ status: "PENDING" }).then((items) => items || []), { key: "estornos-pendentes", isEmpty: () => false });
  const cases = casesQuery.data || [];
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  async function run(item, action) {
    setBusyId(item.id);
    try {
      await action();
      casesQuery.reload();
      onDecided?.();
    } catch (err) {
      onNotice("danger", "Não foi possível decidir o estorno", financeAuthErrorMessage(err, "Tente novamente."));
      if (["FINANCE_APPROVAL_STALE", "FINANCE_APPROVAL_ALREADY_DECIDED"].includes(err?.code)) casesQuery.reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(item) {
    const ok = await confirm({
      title: "Aprovar este estorno?",
      message: `O estorno de ${reversalAmountText(item)} sobre "${humanizeText(item.original?.description) || "o lançamento"}" será lançado agora, com um lançamento compensatório (o original não é editado). Pede a verificação em duas etapas se a sua não for recente.`,
      confirmLabel: "Aprovar e lançar estorno",
    });
    if (!ok) return;
    await run(item, async () => {
      const result = await approveReversalCase(item.id);
      onNotice("success", result?.replayed ? "Estorno já lançado" : "Estorno lançado", result?.replayed ? "Este estorno já tinha sido lançado: nada foi lançado de novo." : "O lançamento compensatório foi criado.");
    });
  }

  async function handleReject() {
    const item = rejectTarget;
    await run(item, async () => {
      await rejectReversalCase(item.id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason("");
      onNotice("info", "Estorno recusado", "O pedido foi encerrado e nada foi lançado.");
    });
  }

  return (
    <div id="estornos-pendentes">
      <Card title="Estornos pendentes" subtitle="O estorno só é lançado quando outra pessoa aprova o pedido. Quem pediu não decide.">
        <AsyncState result={casesQuery} loadingLabel="Carregando estornos pendentes...">
          {cases.length === 0 ? (
            <p className={styles.emptyText}>Nenhum pedido de estorno aguardando aprovação.</p>
          ) : (
            <ul className={styles.list}>
              {cases.map((item) => {
                const block = decisionBlock(item, currentUserId);
                return (
                  <li key={item.id} className={styles.approvalRow}>
                    <div className={styles.listRowInfo}>
                      <span className={styles.listRowTitle}>
                        {item.original ? <Link href={`/painel/financeiro/lancamentos/${item.original.id}`}>{humanizeText(item.original.description) || "Lançamento"}</Link> : "Lançamento não encontrado"}
                      </span>
                      <span className={styles.listRowSubtitle}>Estorno de {reversalAmountText(item)} · motivo: {item.reason || "sem motivo registrado"}</span>
                      <span className={styles.listRowSubtitle}>Pedido por {userName(item.requestedByUserId)} em {formatDateTime(item.createdAt || item.created_at)}</span>
                      {rejectTarget?.id === item.id ? (
                        <FormField label="Motivo da recusa (fica registrado)" htmlFor={`reject-${item.id}`}>
                          <Input id={`reject-${item.id}`} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ex.: o lançamento está correto, conferido com o extrato" />
                        </FormField>
                      ) : null}
                    </div>
                    <div className={styles.approvalRight}>
                      <Badge tone={RISK_LEVEL_TONE[item.riskLevel] || "neutral"}>Risco {RISK_LEVEL_LABELS[item.riskLevel] || "não informado"}</Badge>
                      {!block.allowed ? (
                        <span className={styles.selfBlockNote}>{block.reason}</span>
                      ) : rejectTarget?.id === item.id ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setRejectTarget(null)}>Voltar</Button>
                          <Button requires="finance:approve" size="sm" variant="danger" onClick={handleReject} loading={busyId === item.id}>Confirmar recusa</Button>
                        </>
                      ) : (
                        <>
                          <Button requires="finance:approve" size="sm" onClick={() => handleApprove(item)} loading={busyId === item.id}>Aprovar estorno</Button>
                          <Button requires="finance:approve" size="sm" variant="secondary" onClick={() => { setRejectTarget(item); setRejectReason(""); }}>Recusar</Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AsyncState>
      </Card>
      <ConfirmDialog />
    </div>
  );
}
