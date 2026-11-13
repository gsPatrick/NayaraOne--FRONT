"use client";

// Ficha do lançamento financeiro. A página monta as partes: estado e carga (useEntryDetailState), baixa e pedidos (useSettlementActions),
// comprovante da baixa manual (useManualEvidence), complemento (useComplementAction), edição (useEntryEdit) e saldo/estorno pelo ledger
// (ledgerBalance.js, Caderno M4 §6). Os cartões estão em EntryActions, SettlementForms, EditEntryCard, EntryDetailsCard e EntrySideCards.
import { useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import NatureBadge from "@/components/molecules/NatureBadge/NatureBadge";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { ENTRY_STATUS_LABELS, ENTRY_STATUS_TONE, isEntryOverdue } from "@/lib/mock/finance";
import { formatBRL, humanizeText } from "@/lib/format";
import { isInFlight, nextInstallmentNumber } from "@/lib/finance/paymentIntents";
import PaymentIntentPrepare, { IntentInvalidatedNotice } from "./PaymentIntentPrepare";
import { PendingReversalNotice } from "./ReversalRequest";
import ThirdPartyReleaseModal, { thirdPartyBalance } from "./ThirdPartyReleaseModal";
import { ledgerBalance, reversalPreview, canComplement } from "./ledgerBalance";
import useEntryDetailState from "./useEntryDetailState";
import useSettlementActions from "./useSettlementActions";
import useManualEvidence from "./useManualEvidence";
import useComplementAction from "./useComplementAction";
import useEntryEdit from "./useEntryEdit";
import EntryActions from "./EntryActions";
import { ManualEvidenceCard, PartialSettlementCard } from "./SettlementForms";
import EditEntryCard from "./EditEntryCard";
import EntryDetailsCard from "./EntryDetailsCard";
import { ReversalHistoryCard, ReconciliationCard, BankAccountCard } from "./EntrySideCards";
import styles from "./page.module.css";

export default function LancamentoDetailPage({ params }) {
  const router = useRouter();
  const d = useEntryDetailState(params.id);
  const { detailQuery, load, entry, allEntries, approvalRequest, paymentIntent, setPaymentIntent, pendingReversal, setPendingReversal } = d;
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [prepareOpen, setPrepareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaAction, setMfaAction] = useState("settle");
  const { confirm, ConfirmDialog } = useConfirm();

  // Revisão independente 18/10/2026 (A1): TODO pagamento (PAYABLE) exige aprovação prévia — a ApprovalRequest ou a intenção de pagamento
  // APPROVED. O backend continua sendo a fonte de verdade. Compensação de caução não move caixa: não leva comprovante.
  const isPayable = entry?.nature === "PAYABLE";
  const isCompensation = entry?.thirdPartyReleaseType === "COMPENSATION";
  const evidenceAttached = Boolean(entry?.settlementEvidenceFileId);
  const needsManualEvidence = isPayable && !isCompensation;
  // A2: com intenção em trânsito no banco, a baixa só pode acontecer pela resposta do banco.
  const intentInTransit = isInFlight(paymentIntent);
  const approvalGateSatisfied = !isPayable || approvalRequest?.status === "APPROVED" || paymentIntent?.status === "APPROVED";
  // Caução recebida (dinheiro de terceiro a receber, já liquidado): permite devolver/compensar ligado a ela.
  const isDepositReceived = entry?.nature === "RECEIVABLE" && entry?.isThirdPartyFunds && ["SETTLED", "PARTIALLY_SETTLED"].includes(entry?.status);
  const depositBalance = isDepositReceived ? thirdPartyBalance(entry, allEntries) : null;
  // Baixas parciais (Caderno §6): o saldo é o valor do lançamento menos o que as baixas realizaram (cada baixa menos o estorno dela).
  const balance = ledgerBalance(entry, allEntries);
  const { children: partialChildren, remainingCents } = balance;
  const hasPartialSettlements = entry?.status === "PARTIALLY_SETTLED" || partialChildren.length > 0;
  const complementAvailable = canComplement(entry, allEntries);
  const reversalInfo = reversalPreview(entry, allEntries);

  // Contexto lido na hora de cada ação (os hooks vêm antes do retorno antecipado).
  const ctx = () => ({ ...d, entry, needsManualEvidence, evidenceAttached, remainingCents, confirm, setBusy, setNotice, setMfaAction, setMfaOpen,
    requireAttachedEvidence: evidence.requireAttachedEvidence, setPartialOpen: settlement.setPartialOpen });
  const settlement = useSettlementActions(ctx);
  const evidence = useManualEvidence(ctx);
  const { handleComplement, runComplement } = useComplementAction(ctx);
  const edit = useEntryEdit(ctx);

  if (detailQuery.error?.status === 404) return notFound();

  // Ação (liquidar, estornar, aprovar...) só com o dado fresco: na revisita o cache mostra a ficha, mas não vale agir sobre ela.
  const notFresh = !detailQuery.fresh;
  // Se a recarga depois de uma ação falhar, a ficha local continua na tela e a falha vira um aviso com "tentar de novo".
  const reloadFailed = Boolean(entry) && ["RETRY", "OFFLINE", "ERROR", "VALIDATION_ERROR"].includes(detailQuery.status);
  const detailView = reloadFailed ? { ...detailQuery, status: "CONTENT" } : detailQuery;

  // Guia M4 §4 (M4PG): a intenção nasce do PREPARE com o valor escolhido (saldo inteiro ou parcela); a aprovação nasce da regra.
  function handlePaymentIntentCreated(created) {
    setPaymentIntent(created);
    setPrepareOpen(false);
    load();
    setNotice({ tone: "success", text: `Pagamento preparado (${formatBRL(created?.amount)}). A aprovação é de outra pessoa, em Financeiro → Intenções de pagamento.` });
  }

  // Guia M4 §8 (M4PG): o pedido de estorno (202) abre o caso; o estorno só é lançado quando outra pessoa aprova.
  function handleReversalRequested(created) {
    setPendingReversal(created);
    load();
    setNotice({ tone: "info", text: "Estorno pedido. Ele só é lançado quando outra pessoa aprovar, em Financeiro → Aprovações (Estornos pendentes)." });
  }


  const on = {
    openEdit: edit.openEdit,
    requestApproval: settlement.handleRequestApproval,
    togglePrepare: () => setPrepareOpen((v) => !v),
    toggleManual: () => { settlement.setPartialOpen(false); evidence.setManualOpen((v) => !v); },
    settle: settlement.handleSettle,
    togglePartial: () => { evidence.setManualOpen(false); settlement.setPartialOpen((v) => !v); },
    openRelease: () => setReleaseOpen(true),
    complement: handleComplement,
    reversalRequested: handleReversalRequested,
  };
  const flags = { isPayable, isCompensation, evidenceAttached, needsManualEvidence, intentInTransit, approvalGateSatisfied, hasPartialSettlements, isDepositReceived, depositAvailable: depositBalance?.available || 0, complementAvailable };

  return (
    <AppShell title={humanizeText(entry?.description) || "Lançamento"} backHref="/painel/financeiro/lancamentos">
      <AsyncState result={detailView} loadingLabel="Carregando lançamento...">
      {!entry ? null : (
        <div className={styles.wrap}>
          {reloadFailed ? (
            <Alert tone="warning">
              Não foi possível atualizar a ficha agora; os dados abaixo podem estar desatualizados e as ações ficam bloqueadas até recarregar.{" "}
              <Button size="sm" variant="secondary" onClick={() => detailQuery.reload()}>Tentar de novo</Button>
            </Alert>
          ) : null}
          {approvalRequest?.status === "STALE" && entry.status === "PENDING" ? (
            <Alert tone="warning">Invalidada: o lançamento foi alterado depois do pedido. Peça a aprovação de novo.</Alert>
          ) : null}
          <div className={styles.topRow}>
            <div className={styles.badges}>
              <Badge tone={ENTRY_STATUS_TONE[entry.status]}>{ENTRY_STATUS_LABELS[entry.status]}</Badge>
              <NatureBadge nature={entry.nature} />
              {isEntryOverdue(entry) ? <Badge tone="danger">Vencida</Badge> : null}
            </div>
            <div className={styles.actions}>
              <EntryActions entry={entry} flags={flags} approvalRequest={approvalRequest} paymentIntent={paymentIntent} pendingReversal={pendingReversal}
                reversalPreviewText={reversalInfo.text} busy={busy} notFresh={notFresh}
                remainingCents={remainingCents} partialChildren={partialChildren} on={on} />
            </div>
          </div>

          {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}
          <PendingReversalNotice pendingCase={pendingReversal} />
          {["PENDING", "PARTIALLY_SETTLED"].includes(entry.status) ? <IntentInvalidatedNotice intent={paymentIntent} /> : null}
          {prepareOpen ? (
            <PaymentIntentPrepare entry={entry} balanceCents={remainingCents} installmentNumber={nextInstallmentNumber(entry, allEntries)} onCancel={() => setPrepareOpen(false)} onCreated={handlePaymentIntentCreated} />
          ) : null}
          {evidence.manualOpen && needsManualEvidence ? <ManualEvidenceCard evidence={evidence} busy={busy} /> : null}
          {settlement.partialOpen ? <PartialSettlementCard settlement={settlement} needsManualEvidence={needsManualEvidence} busy={busy} /> : null}
          {edit.editOpen ? <EditEntryCard edit={edit} allBankAccounts={d.allBankAccounts} allCostCenters={d.allCostCenters} allResultCenters={d.allResultCenters} /> : null}

          <div className={styles.grid}>
            <div className={styles.mainCol}>
              <EntryDetailsCard entry={entry} balance={balance} hasPartialSettlements={hasPartialSettlements} contractInfo={d.contractInfo} holderInfo={d.holderInfo}
                depositBalance={depositBalance} costCenter={d.costCenter} resultCenter={d.resultCenter} />
              <ReversalHistoryCard reversalTarget={d.reversalTarget} reversedBy={d.reversedBy} />
              <ReconciliationCard reconciliation={d.reconciliation} reconciledTransaction={d.reconciledTransaction} />
            </div>
            <div className={styles.sideCol}>
              <BankAccountCard account={d.account} />
            </div>
          </div>
        </div>
      )}
      </AsyncState>

      <MfaVerifyModal
        open={mfaOpen}
        onClose={() => setMfaOpen(false)}
        actionLabel={mfaAction === "settle-partial" ? "liquidar parcialmente este lançamento" : mfaAction === "settle-complement" ? "quitar o saldo deste lançamento" : "liquidar este lançamento"}
        onVerified={async () => {
          setMfaOpen(false);
          if (mfaAction === "settle-partial") await settlement.runSettlePartial();
          else if (mfaAction === "settle-complement") await runComplement();
          else await settlement.runSettle();
        }}
      />

      <ThirdPartyReleaseModal
        open={releaseOpen}
        onClose={() => setReleaseOpen(false)}
        origin={entry}
        allEntries={allEntries}
        contract={d.contractInfo}
        holderName={d.holderInfo?.legalName}
        costCenters={d.allCostCenters}
        bankAccounts={d.allBankAccounts}
        onCreated={(created) => {
          setReleaseOpen(false);
          router.push(`/painel/financeiro/lancamentos/${created.id}`);
        }}
      />

      <ConfirmDialog />
    </AppShell>
  );
}
