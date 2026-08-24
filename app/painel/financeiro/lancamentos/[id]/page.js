"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import NatureBadge from "@/components/molecules/NatureBadge/NatureBadge";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
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
  reverseFinancialEntry,
} from "@/lib/api/finance";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function LancamentoDetailPage({ params }) {
  const router = useRouter();
  const [entry, setEntry] = useState(null);
  const [account, setAccount] = useState(null);
  const [costCenter, setCostCenter] = useState(null);
  const [resultCenter, setResultCenter] = useState(null);
  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversedBy, setReversedBy] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [reconciledTransaction, setReconciledTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

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
    ])
      .then(([e, bankAccounts, costCenters, resultCenters, allEntries, reconciliations, bankTransactions]) => {
        if (cancelled || !e) return;
        setEntry(e);
        setAccount(bankAccounts.find((a) => a.id === e.bankAccountId) || null);
        setCostCenter(costCenters.find((c) => c.id === e.costCenterId) || null);
        setResultCenter(resultCenters.find((r) => r.id === e.resultCenterId) || null);
        setReversalTarget(e.reversalOfEntryId ? allEntries.find((x) => x.id === e.reversalOfEntryId) || null : null);
        setReversedBy(allEntries.find((x) => x.reversalOfEntryId === e.id) || null);
        const rec = reconciliations.find((r) => r.financialEntryId === e.id) || null;
        setReconciliation(rec);
        setReconciledTransaction(rec ? bankTransactions.find((t) => t.id === rec.bankTransactionId) || null : null);
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

  async function handleSettle() {
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

  async function handleReverse() {
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
        <Spinner size="lg" />
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
                <Button onClick={handleSettle} loading={busy}><Icon name="check" size={16} /> Liquidar</Button>
              ) : null}
              {entry.status === "SETTLED" ? (
                <Button variant="secondary" onClick={handleReverse} loading={busy}><Icon name="settings" size={16} /> Estornar</Button>
              ) : null}
            </div>
          </div>

          {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

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
                  <p className={styles.emptyText}>Este lançamento ainda não foi conciliado com nenhuma transação de extrato.</p>
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
                  <p className={styles.emptyText}>Sem conta vinculada.</p>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
