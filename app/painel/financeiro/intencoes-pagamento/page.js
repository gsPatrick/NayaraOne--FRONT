"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import ConfirmAction from "@/components/molecules/ConfirmAction/ConfirmAction";
import Alert from "@/components/molecules/Alert/Alert";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import StatTile from "@/components/molecules/StatTile/StatTile";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import {
  listPaymentIntents,
  approvePaymentIntent,
  executePaymentIntent,
  cancelPaymentIntent,
  listFinancialEntries,
  reconcilePaymentIntent,
  resolveUncertainPaymentIntent,
} from "@/lib/api/finance";
import { formatBRL, formatDateTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth/session";
import { INTENT_STATUS_LABELS, approvalProgress, intentStatusLabel } from "@/lib/finance/paymentIntents";
import { financeAuthErrorMessage } from "@/lib/finance/authorizationErrors";
import { RISK_LEVEL_LABELS } from "@/lib/mock/finance";
import IntentRow from "./IntentRow";
import styles from "./page.module.css";

const RECONCILE_OUTCOME_LABELS = {
  CONFIRMED: "o banco confirmou o pagamento e o lançamento foi liquidado.",
  NOT_UNCERTAIN: "esta intenção não estava mais em trânsito.",
  STILL_UNCERTAIN: "o banco ainda não deu resposta definitiva.",
  BANK_UNREACHABLE: "o banco não respondeu — tente de novo mais tarde.",
  PENDING_EXTERNAL: "o banco informa que o pagamento ainda está em processamento.",
  PROCESSING: "o banco informa que o pagamento ainda está em processamento.",
  REJECTED: "o banco recusou o pagamento.",
  FAILED: "o banco informou falha no pagamento.",
};

const FIXED_NOTICE = { position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" };

// A resposta do aprovar traz a aprovação resumida (sem a lista de quem aprovou): junta com o que a lista já tinha.
const mergeIntent = (before, after) => ({ ...before, ...after, approval: { ...(before.approval || {}), ...(after.approval || {}) } });

export default function IntencoesPagamentoPage() {
  const currentUser = getCurrentUser();
  const [intents, setIntents] = useState([]);
  const [entries, setEntries] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rowResult, setRowResult] = useState({});
  // B2 — resolver a incerteza de um envio ao banco exige motivo (e só dá como falha com resposta final do banco).
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveReason, setResolveReason] = useState("");
  const [resolveError, setResolveError] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  // M9-D940: carregando, erro, sem acesso e sem conexão vêm do padrão único; as ações atualizam a lista local.
  // O favorecido vem congelado na própria intenção (beneficiarySnapshot): não depende do cadastro atual de contas e pessoas.
  const intentsQuery = useAsyncState(async () => {
    const [pi, fe] = await Promise.all([listPaymentIntents(), listFinancialEntries()]);
    return { intents: pi || [], entries: fe || [] };
  }, { key: "intencoes-pagamento", isEmpty: () => false });
  const load = intentsQuery.reload;
  useEffect(() => {
    const data = intentsQuery.data;
    if (!data) return;
    setIntents(data.intents);
    setEntries(data.entries);
  }, [intentsQuery.data]);

  function showNotice(tone, text) {
    setNotice({ tone, text });
    window.clearTimeout(showNotice._t);
    showNotice._t = window.setTimeout(() => setNotice(null), 8000);
  }

  const entryFor = (intent) => entries.find((e) => e.id === intent.financialEntryId) || null;
  const replaceIntent = (updated) => setIntents((prev) => prev.map((i) => (i.id === updated.id ? mergeIntent(i, updated) : i)));

  async function handleApprove(intent) {
    const progress = approvalProgress(intent.approval);
    const ok = await confirm({
      title: "Aprovar este pagamento?",
      message: `Confira o favorecido congelado na preparação e o valor (${formatBRL(intent.amount ?? intent.snapshotJson?.amount)}). Risco ${RISK_LEVEL_LABELS[intent.approval?.riskLevel] || "não informado"}: ${progress ? `exige ${progress.required} ${progress.required === 1 ? "aprovação" : "aprovações"} (já registradas: ${progress.approved})` : "exige aprovação"}. O retrato é reconferido agora: se o favorecido ou o lançamento mudaram, nada é aprovado. Risco alto ou crítico pede a verificação em duas etapas.`,
      confirmLabel: "Aprovar",
    });
    if (!ok) return;
    setBusyId(intent.id);
    try {
      const updated = await approvePaymentIntent(intent.id);
      replaceIntent(updated);
      const after = approvalProgress(updated.approval);
      if (updated.status === "APPROVED") showNotice("success", "Intenção aprovada: o pagamento pode ser registrado.");
      else showNotice("info", `Sua aprovação foi registrada (${after ? after.text : "aprovação parcial"}). Falta a aprovação de outra pessoa.`);
      load();
    } catch (err) {
      showNotice("danger", financeAuthErrorMessage(err, "Não foi possível aprovar."));
      if (["FINANCE_PAYMENT_INTENT_STALE", "FINANCE_PAYMENT_INTENT_INVALID_STATUS"].includes(err?.code)) load();
    } finally {
      setBusyId(null);
    }
  }

  // A4 (revisão 18/10/2026): registrar o pagamento feito fora do banco usa o comprovante ANEXADO ao lançamento antes da aprovação.
  async function handleExecute(intent) {
    const entry = entryFor(intent);
    if (!entry?.settlementEvidenceFileId) {
      showNotice("danger", "Anexe o comprovante no detalhe do lançamento antes. A intenção precisa ser aprovada depois do comprovante — cancele esta e prepare outra após anexar.");
      return;
    }
    const ok = await confirm({
      title: "Registrar pagamento com o comprovante anexado?",
      message: `Serão baixados ${formatBRL(intent.amount ?? intent.snapshotJson?.amount)} por baixa manual com o comprovante anexado (motivo: ${entry.settlementReason || "sem motivo registrado"}) — não como confirmação do banco. A conciliação com o extrato continua necessária.`,
      confirmLabel: "Registrar",
      tone: "primary",
    });
    if (!ok) return;
    setBusyId(intent.id);
    try {
      const result = await executePaymentIntent(intent.id);
      replaceIntent(result.intent || result);
      showNotice("success", result.replayed ? "Este pagamento já estava registrado: nada foi pago de novo." : "Pagamento registrado com o comprovante anexado.");
      load();
    } catch (err) {
      showNotice("danger", financeAuthErrorMessage(err, "Não foi possível registrar o pagamento."));
    } finally {
      setBusyId(null);
    }
  }

  // M45-RECONF F2: o resultado da consulta ao banco aparece na própria linha e no aviso fixo do topo.
  async function handleReconcile(intent) {
    setBusyId(intent.id);
    try {
      const result = await reconcilePaymentIntent(intent.id);
      const updated = result?.intent || intent;
      replaceIntent(updated);
      const outcomeText = RECONCILE_OUTCOME_LABELS[result?.outcome] || "O banco respondeu.";
      const text = `Banco consultado em ${formatDateTime(new Date())}: ${outcomeText} Situação atual: ${intentStatusLabel(updated)}.`;
      const tone = updated.status === "CONFIRMED" ? "success" : updated.status === "FAILED" ? "danger" : "info";
      setRowResult((prev) => ({ ...prev, [intent.id]: { tone, text } }));
      showNotice(tone, text);
      if (updated.status === "CONFIRMED") load();
    } catch (err) {
      const text = financeAuthErrorMessage(err, "Não foi possível consultar o banco.");
      setRowResult((prev) => ({ ...prev, [intent.id]: { tone: "danger", text } }));
      showNotice("danger", text);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmResolve() {
    const intent = resolveTarget;
    if (!resolveReason.trim()) {
      setResolveError("Informe o motivo.");
      return;
    }
    setBusyId(intent.id);
    try {
      const result = await resolveUncertainPaymentIntent(intent.id, resolveReason.trim());
      const updated = result?.intent || intent;
      replaceIntent(updated);
      setResolveTarget(null);
      showNotice("info", `Situação resolvida com o banco: ${intentStatusLabel(updated)}.`);
    } catch (err) {
      setResolveError(financeAuthErrorMessage(err, "Não foi possível resolver a incerteza."));
    } finally {
      setBusyId(null);
    }
  }

  // M9-D852 (linha 2): cancelar o pagamento passa pelo ConfirmAction (impacto, código digitado e justificativa).
  async function handleCancelConfirmed(confirmation) {
    const intent = cancelTarget;
    setBusyId(intent.id);
    try {
      replaceIntent(await cancelPaymentIntent(intent.id, confirmation.justification, confirmation));
      setCancelTarget(null);
      showNotice("info", "Intenção cancelada.");
    } finally {
      setBusyId(null);
    }
  }

  const sorted = useMemo(
    () => [...intents].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)),
    [intents]
  );
  const countOf = (status) => intents.filter((i) => i.status === status).length;
  const pendingCount = countOf("PENDING_APPROVAL");
  const executingCount = countOf("EXECUTING");
  // M45 F9: filtro por situação — mostra todos os estados do livro, mesmo sem itens (contagem 0).
  const visible = statusFilter ? sorted.filter((i) => i.status === statusFilter) : sorted;

  return (
    <AppShell title="Intenções de pagamento" backHref="/painel/financeiro">
      {notice ? (
        <div style={FIXED_NOTICE}>
          <Alert tone={notice.tone}>{notice.text}</Alert>
        </div>
      ) : null}

      <p className={styles.intro}>
        Cada pagamento é preparado a partir do detalhe de um lançamento a pagar: escolhe-se o valor (o saldo em aberto ou uma parcela) e a
        intenção congela o favorecido (banco, agência, conta, chave PIX e nome) num retrato com código de verificação. O risco do valor define
        quantas pessoas aprovam. Se os dados bancários do favorecido ou o lançamento mudarem antes do pagamento, a intenção é invalidada.
      </p>

      <AsyncState result={intentsQuery} lockStale loadingLabel="Carregando intenções de pagamento...">
        <>
          <div className={styles.grid}>
            <StatTile label="Aguardando aprovação" value={pendingCount} tone={pendingCount > 0 ? "warning" : "success"} icon="shield" />
            <StatTile label="Aprovadas" value={countOf("APPROVED")} tone="info" icon="check" />
            <StatTile label="Em execução no banco" value={executingCount} tone={executingCount > 0 ? "warning" : "success"} icon="clock" />
            <StatTile label="Pagas" value={countOf("CONFIRMED")} tone="success" icon="money" />
          </div>

          <div className={styles.filters} role="group" aria-label="Filtrar por situação">
            {[["", "Todas"], ...Object.entries(INTENT_STATUS_LABELS)].map(([value, label]) => (
              <Button key={value || "ALL"} size="sm" variant={statusFilter === value ? "primary" : "secondary"} aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)}>
                {label} ({value ? countOf(value) : intents.length})
              </Button>
            ))}
          </div>

          {resolveTarget ? (
            <Card
              title="Resolver envio incerto ao banco"
              subtitle="O banco é consultado de novo. A intenção só é dada como falha se o banco responder falha ou não conhecer o pagamento — nunca sem resposta do banco. Esta ação exige verificação em duas etapas (MFA) recente: se for preciso, o código será pedido ao confirmar."
            >
              {resolveError ? <Alert tone="danger">{resolveError}</Alert> : null}
              <FormField label="Motivo" required>
                <Input value={resolveReason} onChange={(e) => setResolveReason(e.target.value)} placeholder="Ex.: banco fora do ar no envio de 18/10, conferido com o gerente" />
              </FormField>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <Button variant="secondary" onClick={() => setResolveTarget(null)}>Cancelar</Button>
                <Button onClick={confirmResolve} loading={busyId === resolveTarget.id}>Consultar banco e resolver</Button>
              </div>
            </Card>
          ) : null}

          <Card title="Intenções de pagamento" subtitle="Quem preparou a intenção não pode aprová-la: a aprovação é sempre de outra pessoa">
            {visible.length === 0 ? (
              <p className={styles.emptyText}>
                {statusFilter
                  ? `Nenhuma intenção na situação "${INTENT_STATUS_LABELS[statusFilter]}".`
                  : "Nenhuma intenção de pagamento preparada ainda — prepare uma a partir do detalhe de um lançamento a pagar com conta bancária."}
              </p>
            ) : (
              <ul className={styles.list}>
                {visible.map((intent) => (
                  <IntentRow
                    key={intent.id}
                    intent={intent}
                    entry={entryFor(intent)}
                    currentUserId={currentUser?.id}
                    busy={busyId === intent.id}
                    rowResult={rowResult[intent.id]}
                    onApprove={handleApprove}
                    onExecute={handleExecute}
                    onCancel={setCancelTarget}
                    onReconcile={handleReconcile}
                    onResolve={(target) => { setResolveTarget(target); setResolveReason(""); setResolveError(""); }}
                  />
                ))}
              </ul>
            )}
          </Card>
        </>
      </AsyncState>

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>

      {cancelTarget ? (
        <ConfirmAction
          open
          onClose={() => setCancelTarget(null)}
          title="Cancelar esta intenção de pagamento?"
          confirmLabel="Cancelar intenção"
          target={{ method: "GET", path: `/finance/payment-intents/${cancelTarget.id}/impact` }}
          onConfirm={handleCancelConfirmed}
        />
      ) : null}
      <ConfirmDialog />
    </AppShell>
  );
}
