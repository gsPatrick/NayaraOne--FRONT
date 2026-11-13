"use client";

// Barra de ações da ficha do lançamento. O que aparece segue o estado do lançamento e as travas da API (a API continua sendo a fonte de verdade):
// FIN-004 (Caderno §3.3/3.4) — liquidar um pagamento exige aprovação prévia ou intenção aprovada; com intenção em trânsito no banco a baixa só
// acontece pela resposta do banco; com baixa no histórico o saldo sai pela baixa parcial ou pelo complemento (§6); estorno também no
// parcialmente recebido (estorna cada baixa).
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import { formatBRL } from "@/lib/format";
import { isOpenIntent } from "@/lib/finance/paymentIntents";
import { ReversalRequestButton } from "./ReversalRequest";

export default function EntryActions({ entry, flags, approvalRequest, paymentIntent, pendingReversal, reversalPreviewText, busy, notFresh, remainingCents, partialChildren, on }) {
  const open = entry.status === "PENDING" || entry.status === "PARTIALLY_SETTLED";
  const { isPayable, isCompensation, evidenceAttached, needsManualEvidence, intentInTransit, approvalGateSatisfied, hasPartialSettlements, isDepositReceived, depositAvailable, complementAvailable } = flags;
  return (
    <>
      {entry.status === "PENDING" ? (
        <Button requires="finance:update" variant="secondary" onClick={on.openEdit} disabled={busy || notFresh}><Icon name="document" size={16} /> Editar</Button>
      ) : null}
      {entry.status === "PENDING" && isPayable && approvalRequest?.status !== "APPROVED" ? (
        <Button requires="finance:create" variant="secondary" onClick={on.requestApproval} loading={busy} disabled={approvalRequest?.status === "PENDING" || notFresh}>
          <Icon name="shield" size={16} />
          {approvalRequest?.status === "PENDING" ? "Aprovação pendente" : "Solicitar aprovação"}
        </Button>
      ) : null}
      {/* Guia M4 §4 (M4PG): a intenção nasce do PREPARE com o valor escolhido (saldo inteiro ou parcela). */}
      {open && isPayable && entry.bankAccountId && !isOpenIntent(paymentIntent) && remainingCents > 0 ? (
        <Button requires="finance:create" variant="secondary" onClick={on.togglePrepare} disabled={busy || notFresh}>
          <Icon name="shield" size={16} /> Preparar pagamento
        </Button>
      ) : null}
      {needsManualEvidence && open && !intentInTransit ? (
        <Button requires="finance:settle" variant="secondary" onClick={on.toggleManual} disabled={busy || notFresh}>
          <Icon name="document" size={16} /> {evidenceAttached ? "Trocar comprovante" : "Anexar comprovante"}
        </Button>
      ) : null}
      {open && intentInTransit ? (
        <Button disabled title="Há uma intenção de pagamento em trânsito no banco — a baixa só acontece pela resposta do banco">
          <Icon name="check" size={16} /> Pagamento em trânsito no banco
        </Button>
      ) : open ? (
        approvalGateSatisfied ? (
          hasPartialSettlements ? null : <Button requires="finance:settle" onClick={on.settle} loading={busy} disabled={notFresh}><Icon name="check" size={16} /> Liquidar</Button>
        ) : approvalRequest?.status === "PENDING" || paymentIntent?.status === "PENDING_APPROVAL" ? (
          <Button disabled title="Aguardando a decisão de outra pessoa antes de liquidar">
            <Icon name="check" size={16} /> Aguardando aprovação
          </Button>
        ) : null
      ) : null}
      {open && !intentInTransit && !isCompensation && approvalGateSatisfied ? (
        <Button requires="finance:settle" variant="secondary" onClick={on.togglePartial} disabled={busy || notFresh}>
          <Icon name="money" size={16} /> Liquidar parcial
        </Button>
      ) : null}
      {isDepositReceived && depositAvailable > 0 ? (
        <Button requires="finance:settle" variant="secondary" onClick={on.openRelease} disabled={busy || notFresh}>
          <Icon name="money" size={16} /> Devolver ou compensar caução
        </Button>
      ) : null}
      {complementAvailable && !intentInTransit && approvalGateSatisfied ? (
        <Button requires="finance:settle" variant="secondary" onClick={on.complement} loading={busy} disabled={notFresh}>
          <Icon name="check" size={16} /> Quitar saldo ({formatBRL(remainingCents / 100)})
        </Button>
      ) : null}
      {entry.status === "SETTLED" || (entry.status === "PARTIALLY_SETTLED" && partialChildren.length > 0) ? (
        // Guia M4 §8 (M4PG): o pedido abre o caso; o estorno (pelo ledger, M4LR §6) só é lançado quando outra pessoa aprova. Lançamento com
        // baixas parciais estorna cada baixa: o pedido é sempre do total (o parcial é feito na ficha da baixa).
        <ReversalRequestButton entry={entry} pendingCase={pendingReversal} disabled={busy || notFresh} onRequested={on.reversalRequested}
          preview={reversalPreviewText} allowPartial={partialChildren.length === 0} />
      ) : null}
    </>
  );
}
