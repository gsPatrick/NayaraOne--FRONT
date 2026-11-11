"use client";

// Vencimentos (ciclos) de uma obrigação da locação (Caderno M5 §12 "Pendência gera alerta/cobrança; não some quando contrato
// encerra"): cada vencimento com a situação, quem pagou e o comprovante. Vencimento em aberto ou vencido pode ser pago (com
// comprovante) ou dispensado com motivo registrado (exige aprovação na cobrança).
import { useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { useHasPermission } from "@/lib/rbac/useHasPermission";
import { listUtilityObligationCycles, waiveUtilityCycle } from "@/lib/api/billing";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { CYCLE_STATUS_LABELS, CYCLE_STATUS_TONE, isOpenCycle, PAID_BY_LABELS, waiveReasonProblem } from "@/lib/legal/obligationCycles";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

function cycleDetail(cycle) {
  if (cycle.status === "PAID") {
    const who = PAID_BY_LABELS[cycle.paidByParty] || "parte não informada";
    return `Pago${cycle.paidAt ? ` em ${formatDate(cycle.paidAt)}` : ""} por ${who.toLowerCase()}${cycle.amount != null ? ` — ${formatBRL(cycle.amount)}` : ""}${cycle.proofFileId ? " · com comprovante" : ""}${cycle.reimbursementId ? " · gerou reembolso" : ""}`;
  }
  if (cycle.status === "WAIVED") return `Dispensado${cycle.waivedReason ? `: ${cycle.waivedReason}` : ""}`;
  if (cycle.status === "OVERDUE") return `Sem comprovante${cycle.overdueSince ? ` desde ${formatDate(cycle.overdueSince)}` : ""}`;
  return "Aguardando pagamento e comprovante";
}

export default function UtilityCyclesModal({ obligation, title, onClose, onPay, onChanged, onError }) {
  const open = Boolean(obligation);
  const canWaive = useHasPermission("billing:approve");
  const [waiveTarget, setWaiveTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const cyclesQuery = useAsyncState(() => listUtilityObligationCycles(obligation.id), {
    deps: [obligation?.id],
    enabled: open,
    isEmpty: (data) => !Array.isArray(data) || data.length === 0,
  });
  const cycles = Array.isArray(cyclesQuery.data) ? cyclesQuery.data : [];
  const problem = waiveReasonProblem(reason);

  async function handleWaive() {
    if (problem) return;
    onError("");
    setBusy(true);
    try {
      await waiveUtilityCycle(waiveTarget.id, reason.trim());
      setWaiveTarget(null);
      setReason("");
      cyclesQuery.reload();
      onChanged();
    } catch (err) {
      onError(legalErrorMessage(err, "Erro ao dispensar o vencimento."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={title || "Vencimentos da obrigação"} footer={<Button variant="secondary" onClick={onClose} disabled={busy}>Fechar</Button>}>
      <AsyncState
        result={cyclesQuery}
        loadingLabel="Carregando vencimentos..."
        emptyTitle="Nenhum vencimento ainda"
        emptyDescription="Os vencimentos começam na entrega das chaves, conforme a periodicidade da obrigação."
      >
        <ul className={styles.helper} data-testid="utility-cycles">
          {cycles.map((cycle) => (
            <li key={cycle.id} className={styles.rowActions}>
              <strong>{formatDate(cycle.dueOn)}</strong>
              <Badge tone={CYCLE_STATUS_TONE[cycle.status] || "neutral"}>{CYCLE_STATUS_LABELS[cycle.status] || "Situação não informada"}</Badge>
              <span>{cycleDetail(cycle)}</span>
              {isOpenCycle(cycle) ? (
                <>
                  <Button size="sm" variant="secondary" onClick={() => onPay(cycle.id)} disabled={busy}>Registrar pagamento</Button>
                  {canWaive ? <Button size="sm" variant="ghost" onClick={() => { setWaiveTarget(cycle); setReason(""); }} disabled={busy}>Dispensar</Button> : null}
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </AsyncState>
      {waiveTarget ? (
        <div data-testid="utility-cycle-waive">
          <FormField
            label={`Motivo da dispensa do vencimento de ${formatDate(waiveTarget.dueOn)}`}
            htmlFor="utility-cycle-waive-reason"
            required
            helper="No mínimo 10 caracteres. A dispensa fica registrada com o motivo e quem decidiu."
            error={reason && problem ? problem : undefined}
          >
            <textarea id="utility-cycle-waive-reason" rows={3} style={{ width: "100%" }} value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
          <div className={styles.rowActions}>
            <Button size="sm" variant="secondary" onClick={() => setWaiveTarget(null)} disabled={busy}>Cancelar</Button>
            <Button size="sm" variant="danger" onClick={handleWaive} loading={busy} disabled={busy || Boolean(problem)}>Dispensar vencimento</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
