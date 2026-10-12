"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import NatureBadge from "@/components/molecules/NatureBadge/NatureBadge";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import BankAccountSelect from "@/components/molecules/BankAccountSelect/BankAccountSelect";
import { getBankName } from "@/lib/mock/banks";
import { maskAccountNumber } from "@/lib/mask";
import {
  ENTRY_NATURE_LABELS,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_TONE,
  BANK_ACCOUNT_STATUS_LABELS,
  BANK_ACCOUNT_STATUS_TONE,
  isEntryOverdue,
} from "@/lib/mock/finance";
import {
  getFinancialEntry,
  listFinancialEntries,
  listBankAccounts,
  listCostCenters,
  listResultCenters,
  listReconciliations,
  listBankTransactions,
  settleFinancialEntry,
  settleFinancialEntryPartial,
  reverseFinancialEntry,
  updateFinancialEntry,
  createApprovalRequest,
  listApprovalRequests,
  createPaymentIntent,
  listPaymentIntents,
} from "@/lib/api/finance";
import { formatBRL, formatDate, formatDateTime, dateOnlyInputToIso } from "@/lib/format";
import styles from "./page.module.css";

export default function LancamentoDetailPage({ params }) {
  const router = useRouter();
  const [entry, setEntry] = useState(null);
  const [account, setAccount] = useState(null);
  const [costCenter, setCostCenter] = useState(null);
  const [resultCenter, setResultCenter] = useState(null);
  const [allBankAccounts, setAllBankAccounts] = useState([]);
  const [allCostCenters, setAllCostCenters] = useState([]);
  const [allResultCenters, setAllResultCenters] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversedBy, setReversedBy] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [reconciledTransaction, setReconciledTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaAction, setMfaAction] = useState("settle");
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      getFinancialEntry(params.id).catch((err) => {
        if (err?.status === 404) {
          setNotFoundFlag(true);
          return null;
        }
        throw err;
      }),
      listBankAccounts(),
      listCostCenters(),
      listResultCenters(),
      listFinancialEntries(),
      listReconciliations(),
      listBankTransactions(),
      listApprovalRequests(),
      listPaymentIntents(),
    ])
      .then(([e, bankAccounts, costCenters, resultCenters, allEntries, reconciliations, bankTransactions, approvalRequests, paymentIntents]) => {
        if (cancelled || !e) return;
        setEntry(e);
        setAccount(bankAccounts.find((a) => a.id === e.bankAccountId) || null);
        setCostCenter(costCenters.find((c) => c.id === e.costCenterId) || null);
        setResultCenter(resultCenters.find((r) => r.id === e.resultCenterId) || null);
        setAllBankAccounts(bankAccounts);
        setAllCostCenters(costCenters);
        setAllResultCenters(resultCenters);
        setReversalTarget(e.reversalOfEntryId ? allEntries.find((x) => x.id === e.reversalOfEntryId) || null : null);
        setReversedBy(allEntries.find((x) => x.reversalOfEntryId === e.id) || null);
        const rec = reconciliations.find((r) => r.financialEntryId === e.id) || null;
        setReconciliation(rec);
        setReconciledTransaction(rec ? bankTransactions.find((t) => t.id === rec.bankTransactionId) || null : null);
        // GAP REAL CORRIGIDO (ciclo de verificação adicional 5, Marco 4, 12/10/2026):
        // createApprovalRequest existia no backend e no client (lib/api/finance.js), com rota
        // HTTP própria (POST /finance/approval-requests), mas nenhuma tela chamava — um
        // lançamento PAYABLE com conta bancária (FIN-004, settleFinancialEntry) exige uma
        // ApprovalRequest aprovada antes de liquidar, e não havia como um usuário comum
        // solicitar essa aprovação pela interface (só via chamada direta à API).
        const related = (approvalRequests || [])
          .filter((r) => r.relatedEntityType === "FinancialEntry" && r.relatedEntityId === e.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setApprovalRequest(related[0] || null);
        // GAP REAL CORRIGIDO (ciclo de verificação final, Marco 4, 12/10/2026): createPaymentIntent
        // existia pronto no backend (snapshot/hash do lançamento, Caderno §8 ponto 4 — caminho
        // alternativo e mais rigoroso a "Solicitar aprovação" + "Liquidar"), mas nenhuma tela
        // chamava nenhuma das 6 rotas de /finance/payment-intents.
        const relatedIntents = (paymentIntents || [])
          .filter((p) => p.financialEntryId === e.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPaymentIntent(relatedIntents[0] || null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o lançamento.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    const cancel = load();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (notFoundFlag) return notFound();

  // Liquidar é step-up MFA obrigatório (Caderno §3.3/3.4: "aprovação de pagamento") — abre o
  // modal de verificação; a chamada real de negócio só acontece em runSettle, após confirmar.
  async function handleSettle() {
    const ok = await confirm({
      title: "Liquidar este lançamento?",
      message: `O lançamento "${entry?.description || ""}" (${formatBRL(entry?.amount)}) será marcado como liquidado e o pagamento será efetivado.`,
      confirmLabel: "Liquidar",
    });
    if (!ok) return;
    setMfaAction("settle");
    setMfaOpen(true);
  }

  async function handleRequestApproval() {
    const ok = await confirm({
      title: "Solicitar aprovação de pagamento?",
      message: `Uma solicitação de aprovação será aberta para "${entry?.description || ""}". O lançamento só poderá ser liquidado depois que ela for aprovada.`,
      confirmLabel: "Solicitar aprovação",
    });
    if (!ok) return;
    setBusy(true);
    setNotice(null);
    try {
      const created = await createApprovalRequest({
        relatedEntityType: "FinancialEntry",
        relatedEntityId: entry.id,
      });
      setApprovalRequest(created);
      setNotice({ tone: "success", text: "Aprovação solicitada. Acompanhe em Financeiro → Aprovações." });
    } catch (err) {
      setNotice({ tone: "danger", text: err?.message || "Não foi possível solicitar a aprovação." });
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePaymentIntent() {
    const ok = await confirm({
      title: "Criar intenção de pagamento?",
      message: `Será gravado um "retrato" (snapshot com hash) dos dados atuais de "${entry?.description || ""}". Se o lançamento mudar depois disso, aprovar ou executar a intenção será recusado por segurança.`,
      confirmLabel: "Criar intenção",
    });
    if (!ok) return;
    setBusy(true);
    setNotice(null);
    try {
      const created = await createPaymentIntent({ financialEntryId: entry.id, approvalRequestId: approvalRequest?.id });
      setPaymentIntent(created);
      setNotice({ tone: "success", text: "Intenção de pagamento criada. Acompanhe em Financeiro → Intenções de pagamento." });
    } catch (err) {
      setNotice({ tone: "danger", text: err?.message || "Não foi possível criar a intenção de pagamento." });
    } finally {
      setBusy(false);
    }
  }

  async function runSettle() {
    setBusy(true);
    setNotice(null);
    try {
      const updated = await settleFinancialEntry(entry.id);
      setEntry(updated);
      setNotice({ tone: "success", text: "Lançamento liquidado com sucesso." });
    } catch (err) {
      setNotice({ tone: "danger", text: err?.message || "Não foi possível liquidar o lançamento." });
    } finally {
      setBusy(false);
    }
  }

  // GAP REAL CORRIGIDO (ciclo de verificação adicional, Marco 4, 12/10/2026): settleFinancialEntryPartial
  // (FIN-TS-006, recebimento parcial) existia e era testada no backend desde sempre, mas sem
  // rota HTTP nem tela — ninguém conseguia dar baixa parcial de um lançamento. Mesmo fluxo de
  // step-up MFA do Liquidar total.
  async function handleSettlePartial() {
    const amount = Number(partialAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const ok = await confirm({
      title: "Liquidar parcialmente?",
      message: `Será registrada uma baixa de ${formatBRL(amount)} sobre o saldo de "${entry?.description || ""}".`,
      confirmLabel: "Liquidar parcial",
    });
    if (!ok) return;
    setMfaAction("settle-partial");
    setMfaOpen(true);
  }

  async function runSettlePartial() {
    setBusy(true);
    setNotice(null);
    try {
      const updated = await settleFinancialEntryPartial(entry.id, Number(partialAmount));
      setEntry(updated);
      setPartialOpen(false);
      setPartialAmount("");
      setNotice({ tone: "success", text: "Baixa parcial registrada com sucesso." });
    } catch (err) {
      setNotice({ tone: "danger", text: err?.message || "Não foi possível registrar a baixa parcial." });
    } finally {
      setBusy(false);
    }
  }

  // GAP REAL (verificação cética adicional, Marco 4, 12/10/2026): updateFinancialEntry já
  // existia no backend e no client da API (permite trocar bankAccountId/favorecido,
  // costCenterId, resultCenterId, dueAt, description — só lançamento PENDING, ledger imutável
  // após liquidar), mas nenhuma tela chamava essa função — não havia como um usuário editar o
  // favorecido pela interface, justamente a ação que FIN-004(c)/FIN-TS-003/004 protegem.
  function openEdit() {
    setEditError("");
    setEditForm({
      description: entry.description || "",
      bankAccountId: entry.bankAccountId || "",
      costCenterId: entry.costCenterId || "",
      resultCenterId: entry.resultCenterId || "",
      dueAt: entry.dueAt ? entry.dueAt.slice(0, 10) : "",
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    setEditSaving(true);
    setEditError("");
    try {
      const updated = await updateFinancialEntry(entry.id, {
        description: editForm.description.trim() || undefined,
        bankAccountId: editForm.bankAccountId || undefined,
        costCenterId: editForm.costCenterId || undefined,
        resultCenterId: editForm.resultCenterId || undefined,
        dueAt: editForm.dueAt ? dateOnlyInputToIso(editForm.dueAt) : undefined,
      });
      setEntry(updated);
      setAccount(allBankAccounts.find((a) => a.id === updated.bankAccountId) || null);
      setCostCenter(allCostCenters.find((c) => c.id === updated.costCenterId) || null);
      setResultCenter(allResultCenters.find((r) => r.id === updated.resultCenterId) || null);
      setEditOpen(false);
      setNotice({ tone: "success", text: "Lançamento atualizado com sucesso." });
    } catch (err) {
      setEditError(err?.message || "Não foi possível salvar as alterações.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleReverse() {
    const ok = await confirm({
      title: "Estornar este lançamento?",
      message: `Um lançamento compensatório será criado para reverter "${entry?.description || ""}" (${formatBRL(entry?.amount)}). O lançamento original nunca é editado (ledger imutável) — esta ação não pode ser desfeita.`,
      confirmLabel: "Estornar",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await reverseFinancialEntry(entry.id);
      setEntry(result.original || result);
      setNotice({ tone: "info", text: "Lançamento estornado — um lançamento compensatório foi criado (o original nunca é editado, ledger imutável)." });
    } catch (err) {
      setNotice({ tone: "danger", text: err?.message || "Não foi possível estornar o lançamento." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={entry?.description || "Lançamento"} backHref="/painel/financeiro/lancamentos">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar o lançamento">{loadError}</Alert> : null}

      {loading ? (
        <SkeletonDetail sections={3} />
      ) : !entry ? null : (
        <div className={styles.wrap}>
          <div className={styles.topRow}>
            <div className={styles.badges}>
              <Badge tone={ENTRY_STATUS_TONE[entry.status]}>{ENTRY_STATUS_LABELS[entry.status]}</Badge>
              <NatureBadge nature={entry.nature} />
              {isEntryOverdue(entry) ? <Badge tone="danger">Vencida</Badge> : null}
            </div>
            <div className={styles.actions}>
              {entry.status === "PENDING" ? (
                <Button variant="secondary" onClick={openEdit} disabled={busy}><Icon name="document" size={16} /> Editar</Button>
              ) : null}
              {entry.status === "PENDING" && entry.bankAccountId && approvalRequest?.status !== "APPROVED" ? (
                <Button
                  variant="secondary"
                  onClick={handleRequestApproval}
                  loading={busy}
                  disabled={approvalRequest?.status === "PENDING"}
                >
                  <Icon name="shield" size={16} />
                  {approvalRequest?.status === "PENDING" ? "Aprovação pendente" : "Solicitar aprovação"}
                </Button>
              ) : null}
              {entry.status === "PENDING" && entry.bankAccountId && !["PENDING", "APPROVED"].includes(paymentIntent?.status) ? (
                <Button variant="secondary" onClick={handleCreatePaymentIntent} loading={busy}>
                  <Icon name="shield" size={16} /> Criar intenção de pagamento
                </Button>
              ) : null}
              {entry.status === "PENDING" || entry.status === "PARTIALLY_SETTLED" ? (
                <Button onClick={handleSettle} loading={busy}><Icon name="check" size={16} /> Liquidar</Button>
              ) : null}
              {entry.status === "PENDING" || entry.status === "PARTIALLY_SETTLED" ? (
                <Button variant="secondary" onClick={() => setPartialOpen((v) => !v)} disabled={busy}>
                  <Icon name="money" size={16} /> Liquidar parcial
                </Button>
              ) : null}
              {entry.status === "SETTLED" ? (
                <Button variant="secondary" onClick={handleReverse} loading={busy}><Icon name="settings" size={16} /> Estornar</Button>
              ) : null}
            </div>
          </div>

          {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

          {partialOpen ? (
            <Card title="Liquidação parcial" className={styles.notice}>
              <FormField label="Valor da baixa parcial">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="0,00"
                />
              </FormField>
              <div className={styles.actions}>
                <Button variant="secondary" onClick={() => setPartialOpen(false)}>Cancelar</Button>
                <Button onClick={handleSettlePartial} loading={busy} disabled={!partialAmount || Number(partialAmount) <= 0}>
                  Confirmar baixa parcial
                </Button>
              </div>
            </Card>
          ) : null}

          {editOpen ? (
            <Card title="Editar lançamento" subtitle="Só é possível editar enquanto PENDING — ledger imutável após liquidar (FIN-003). Trocar a conta/favorecido depois de uma aprovação invalida a aprovação (FIN-004).">
              {editError ? <Alert tone="danger" className={styles.notice}>{editError}</Alert> : null}
              <div className={styles.editGrid}>
                <FormField label="Descrição" htmlFor="e-desc">
                  <Input id="e-desc" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
                </FormField>
                <FormField label="Conta bancária / favorecido" htmlFor="e-account">
                  <BankAccountSelect
                    id="e-account"
                    accounts={allBankAccounts}
                    value={editForm.bankAccountId}
                    onChange={(id) => setEditForm((p) => ({ ...p, bankAccountId: id }))}
                  />
                </FormField>
                <FormField label="Vencimento" htmlFor="e-due">
                  <Input id="e-due" type="date" value={editForm.dueAt} onChange={(e) => setEditForm((p) => ({ ...p, dueAt: e.target.value }))} />
                </FormField>
                <FormField label="Centro de custo" htmlFor="e-cc">
                  <Select id="e-cc" value={editForm.costCenterId} onChange={(e) => setEditForm((p) => ({ ...p, costCenterId: e.target.value }))}>
                    <option value="">—</option>
                    {allCostCenters.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Centro de resultado" htmlFor="e-rc">
                  <Select id="e-rc" value={editForm.resultCenterId} onChange={(e) => setEditForm((p) => ({ ...p, resultCenterId: e.target.value }))}>
                    <option value="">—</option>
                    {allResultCenters.map((r) => (
                      <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
                    ))}
                  </Select>
                </FormField>
              </div>
              <div className={styles.editActions}>
                <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancelar</Button>
                <Button onClick={handleSaveEdit} loading={editSaving}>Salvar alterações</Button>
              </div>
            </Card>
          ) : null}

          <div className={styles.grid}>
            <div className={styles.mainCol}>
              <Card title="Detalhes do lançamento">
                <dl className={styles.detailList}>
                  <div className={styles.detailRow}><dt>Valor</dt><dd className={styles.amount}>{formatBRL(entry.amount)}</dd></div>
                  <div className={styles.detailRow}><dt>Tipo</dt><dd>{entry.entryType === "DEBIT" ? "Débito" : "Crédito"}</dd></div>
                  <div className={styles.detailRow}><dt>Natureza</dt><dd><NatureBadge nature={entry.nature} /></dd></div>
                  <div className={styles.detailRow}><dt>Vencimento</dt><dd>{entry.dueAt ? formatDate(entry.dueAt) : "—"}</dd></div>
                  <div className={styles.detailRow}><dt>Liquidado em</dt><dd>{entry.settledAt ? formatDateTime(entry.settledAt) : "—"}</dd></div>
                  <div className={styles.detailRow}><dt>Centro de custo</dt><dd>{costCenter ? `${costCenter.code} — ${costCenter.name}` : "—"}</dd></div>
                  <div className={styles.detailRow}><dt>Centro de resultado</dt><dd>{resultCenter ? `${resultCenter.code} — ${resultCenter.name}` : "—"}</dd></div>
                  <div className={styles.detailRow}><dt>Chave de idempotência</dt><dd>{entry.idempotencyKey || "—"}</dd></div>
                  <div className={styles.detailRow}><dt>ID</dt><dd className={styles.mono}>{entry.id}</dd></div>
                </dl>
              </Card>

              {reversalTarget || reversedBy ? (
                <Card title="Histórico de estorno" subtitle="Ledger imutável — correções nunca editam o lançamento original">
                  {reversalTarget ? (
                    <div className={styles.linkRow} onClick={() => router.push(`/painel/financeiro/lancamentos/${reversalTarget.id}`)}>
                      <Icon name="document" size={16} />
                      <span>Este lançamento é o estorno de <strong>{reversalTarget.description}</strong> ({formatBRL(reversalTarget.amount)})</span>
                    </div>
                  ) : null}
                  {reversedBy ? (
                    <div className={styles.linkRow} onClick={() => router.push(`/painel/financeiro/lancamentos/${reversedBy.id}`)}>
                      <Icon name="document" size={16} />
                      <span>Foi estornado por <strong>{reversedBy.description}</strong> em {formatDateTime(reversedBy.settledAt)}</span>
                    </div>
                  ) : null}
                </Card>
              ) : null}

              <Card title="Conciliação bancária">
                {reconciliation && reconciledTransaction ? (
                  <div className={styles.linkRow}>
                    <Icon name="check" size={16} />
                    <div>
                      <p className={styles.reconLine}>Conciliado com <strong>{reconciledTransaction.description}</strong> ({formatBRL(reconciledTransaction.amount)})</p>
                      <p className={styles.reconMeta}>em {formatDateTime(reconciliation.matchedAt)}</p>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon="document" title="Sem conciliação" description="Este lançamento ainda não foi conciliado com nenhuma transação de extrato." />
                )}
              </Card>
            </div>

            <div className={styles.sideCol}>
              <Card title="Conta bancária">
                {account ? (
                  <div className={styles.accountBlock}>
                    <div className={styles.accountBankRow}>
                      <BankLogo bankCode={account.bankCode} size={32} />
                      <div>
                        <span className={styles.listRowTitle}>{account.bankCode ? getBankName(account.bankCode) : "Chave PIX"}</span>
                        <span className={styles.listRowSubtitle}>
                          {account.bankCode ? `${getBankName(account.bankCode)} · Ag. ${account.agency} · Conta ${maskAccountNumber(account.accountNumber)}` : "Chave PIX"}
                        </span>
                      </div>
                    </div>
                    <Badge tone={BANK_ACCOUNT_STATUS_TONE[account.status]}>{BANK_ACCOUNT_STATUS_LABELS[account.status]}</Badge>
                    <Button size="sm" variant="secondary" onClick={() => router.push(`/painel/financeiro/contas-bancarias/${account.id}`)}>
                      Ver conta
                    </Button>
                  </div>
                ) : (
                  <EmptyState icon="money" title="Sem conta vinculada" description="Nenhuma conta bancária vinculada a este lançamento." />
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      <MfaVerifyModal
        open={mfaOpen}
        onClose={() => setMfaOpen(false)}
        actionLabel={mfaAction === "settle-partial" ? "liquidar parcialmente este lançamento" : "liquidar este lançamento"}
        onVerified={async () => {
          setMfaOpen(false);
          if (mfaAction === "settle-partial") {
            await runSettlePartial();
          } else {
            await runSettle();
          }
        }}
      />

      <ConfirmDialog />
    </AppShell>
  );
}
