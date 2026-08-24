"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import Modal from "@/components/organisms/Modal/Modal";
import Select from "@/components/atoms/Select/Select";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import StatTile from "@/components/molecules/StatTile/StatTile";
import SwitchableChart from "@/components/molecules/SwitchableChart/SwitchableChart";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import NatureBadge from "@/components/molecules/NatureBadge/NatureBadge";
import Pagination from "@/components/molecules/Pagination/Pagination";
import { listFinancialEntries, listBankTransactions, listBankAccounts, listReconciliations, matchReconciliation } from "@/lib/api/finance";
import { apiFetch } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/session";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

// Gap conhecido: não existe endpoint de importação de extrato em lote na API
// (bankTransactions.service.js só expõe createBankTransaction, uma linha por vez). Esta tela
// não tem — e não deveria ganhar — um botão de "importar extrato" até esse endpoint existir.

function userName(users, id) {
  return users.find((u) => u.id === id)?.name || "—";
}

function bankAccountOf(bankAccounts, id) {
  return bankAccounts.find((a) => a.id === id) || null;
}

export default function ConciliacaoPage() {
  const currentUser = getCurrentUser();
  const [entries, setEntries] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState(null);
  const [reconcileModal, setReconcileModal] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [page2, setPage2] = useState(1);
  const [pageSize2, setPageSize2] = useState(8);
  const [page3, setPage3] = useState(1);
  const [pageSize3, setPageSize3] = useState(8);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listFinancialEntries(), listBankTransactions(), listBankAccounts(), listReconciliations(), apiFetch("/users")])
      .then(([e, t, ba, r, u]) => {
        if (cancelled) return;
        setEntries(e || []);
        setTransactions(t || []);
        setBankAccounts(ba || []);
        setReconciliations(r || []);
        setUsers(u || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar a conciliação bancária.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function showNotice(tone, title, message) {
    setNotice({ tone, title, message });
    window.clearTimeout(showNotice._t);
    showNotice._t = window.setTimeout(() => setNotice(null), 6000);
  }

  async function handleReconcile(entryId, transactionId) {
    try {
      const created = await matchReconciliation({ financialEntryId: entryId, bankTransactionId: transactionId });
      setReconciliations((prev) => [...prev, created]);
      setReconcileModal(null);
      showNotice("success", "Conciliado", "Lançamento conciliado com a transação de extrato.");
    } catch (err) {
      showNotice("danger", "Não foi possível conciliar", err?.message || "Verifique se os valores batem e se nenhum dos dois já está conciliado.");
    }
  }

  const unreconciledTransactions = useMemo(
    () =>
      transactions
        .filter((t) => !reconciliations.some((r) => r.bankTransactionId === t.id))
        .filter((t) => (t.description || "").toLowerCase().includes(query.toLowerCase())),
    [transactions, reconciliations, query]
  );
  const unreconciledEntries = useMemo(
    () => entries.filter((e) => e.status !== "REVERSED" && !reconciliations.some((r) => r.financialEntryId === e.id)),
    [entries, reconciliations]
  );

  function candidatesFor(transaction) {
    return unreconciledEntries.filter((e) => Number(e.amount) === Math.abs(Number(transaction.amount)));
  }

  const byStatus = useMemo(
    () => [
      { label: "Conciliado", value: reconciliations.length, color: "var(--color-success)" },
      { label: "Pendente", value: unreconciledTransactions.length, color: "var(--color-warning)" },
    ].filter((i) => i.value > 0),
    [reconciliations, unreconciledTransactions]
  );

  const byBankAccount = useMemo(() => {
    const counts = {};
    transactions.forEach((t) => {
      const label = bankAccountOf(bankAccounts, t.bankAccountId)?.bankCode || "—";
      counts[label] = (counts[label] || 0) + Number(t.amount);
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value, displayValue: formatBRL(value) }));
  }, [transactions, bankAccounts]);

  const totalUnreconciledValue = unreconciledTransactions.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const matchRate = transactions.length === 0 ? 0 : Math.round((reconciliations.length / transactions.length) * 100);

  const totalPages = Math.max(1, Math.ceil(unreconciledTransactions.length / pageSize));
  const pageItems = unreconciledTransactions.slice((page - 1) * pageSize, page * pageSize);

  const totalPages2 = Math.max(1, Math.ceil(unreconciledEntries.length / pageSize2));
  const pageItems2 = unreconciledEntries.slice((page2 - 1) * pageSize2, page2 * pageSize2);

  const totalPages3 = Math.max(1, Math.ceil(reconciliations.length / pageSize3));
  const pageItems3 = reconciliations.slice((page3 - 1) * pageSize3, page3 * pageSize3);

  return (
    <AppShell title="Conciliação bancária" backHref="/painel/financeiro">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar a conciliação bancária">{loadError}</Alert> : null}
      {notice ? <Alert tone={notice.tone} title={notice.title} className={styles.notice}>{notice.message}</Alert> : null}

      {loading ? (
        <SkeletonDetail sections={3} />
      ) : (
        <>
          <div className={styles.grid}>
            <StatTile label="Não conciliadas" value={unreconciledTransactions.length} tone={unreconciledTransactions.length > 0 ? "warning" : "success"} icon="document" />
            <StatTile label="Valor pendente" value={formatBRL(totalUnreconciledValue)} tone="warning" icon="money" />
            <StatTile label="Conciliações feitas" value={reconciliations.length} tone="success" icon="check" />
            <StatTile label="Taxa de conciliação" value={`${matchRate}%`} tone={matchRate === 100 ? "success" : "neutral"} icon="chart" />
          </div>

          <div className={styles.layout}>
            <div className={styles.mainCol}>
              <Card
                title="Transações não conciliadas"
                subtitle="Linhas de extrato ainda sem lançamento correspondente"
                actions={
                  <div className={styles.cardSearch}>
                    <SearchInput placeholder="Buscar transação..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
                  </div>
                }
              >
                {unreconciledTransactions.length === 0 ? (
                  <p className={styles.emptyText}>Tudo conciliado.</p>
                ) : (
                  <ul className={styles.list}>
                    {pageItems.map((t) => {
                      const account = bankAccountOf(bankAccounts, t.bankAccountId);
                      const candidates = candidatesFor(t);
                      return (
                        <li key={t.id} className={styles.listRow}>
                          <span className={styles.bankIconSlot}>
                            <BankLogo bankCode={account?.bankCode} size={30} square />
                          </span>
                          <div className={styles.listRowInfo}>
                            <span className={styles.listRowTitle}>{t.description}</span>
                            <span className={styles.listRowSubtitle}>{formatDate(t.transactionDate)} · {t.externalTransactionId} · {account?.bankCode || "—"}</span>
                          </div>
                          <span className={styles.listRowRight}>{formatBRL(t.amount)}</span>
                          {candidates.length === 1 ? (
                            <Button size="sm" onClick={() => handleReconcile(candidates[0].id, t.id)}>
                              <Icon name="check" size={14} /> Match automático
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => setReconcileModal(t)} disabled={candidates.length === 0}>
                              {candidates.length === 0 ? "Sem candidato" : `Conciliar (${candidates.length})`}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className={styles.paginationRow}>
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                  <label className={styles.pageSizeLabel}>
                    Por página
                    <Select
                      className={styles.pageSizeSelect}
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    >
                      <option value={8}>8</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </Select>
                  </label>
                </div>
              </Card>

              <Card title="Lançamentos aguardando conciliação" subtitle={`${unreconciledEntries.length} lançamento(s) elegível(is)`}>
                {unreconciledEntries.length === 0 ? (
                  <p className={styles.emptyText}>Nenhum lançamento pendente de conciliação.</p>
                ) : (
                  <ul className={styles.list}>
                    {pageItems2.map((e) => {
                      const account = bankAccountOf(bankAccounts, e.bankAccountId);
                      return (
                        <li key={e.id} className={styles.listRow}>
                          <span className={styles.bankIconSlot}>
                            <BankLogo bankCode={account?.bankCode} size={30} square />
                          </span>
                          <div className={styles.listRowInfo}>
                            <span className={styles.listRowTitle}>{e.description}</span>
                            <span className={styles.listRowSubtitle}>{e.dueAt ? formatDate(e.dueAt) : "Sem vencimento"}</span>
                          </div>
                          <NatureBadge nature={e.nature} />
                          <span className={styles.listRowRight}>{formatBRL(e.amount)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className={styles.paginationRow}>
                  <Pagination page={page2} totalPages={totalPages2} onChange={setPage2} />
                  <label className={styles.pageSizeLabel}>
                    Por página
                    <Select
                      className={styles.pageSizeSelect}
                      value={pageSize2}
                      onChange={(e) => { setPageSize2(Number(e.target.value)); setPage2(1); }}
                    >
                      <option value={8}>8</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </Select>
                  </label>
                </div>
              </Card>

              <Card title="Conciliações feitas" subtitle="Histórico de casamentos lançamento ↔ extrato">
                {reconciliations.length === 0 ? (
                  <p className={styles.emptyText}>Nenhuma conciliação ainda.</p>
                ) : (
                  <ul className={styles.list}>
                    {pageItems3.map((r) => {
                      const entry = entries.find((e) => e.id === r.financialEntryId);
                      const account = bankAccountOf(bankAccounts, entry?.bankAccountId);
                      return (
                        <li key={r.id} className={styles.listRow}>
                          <span className={styles.bankIconSlot}>
                            <BankLogo bankCode={account?.bankCode} size={30} square />
                          </span>
                          <div className={styles.listRowInfo}>
                            <span className={styles.listRowTitle}>{entry?.description || r.financialEntryId}</span>
                            <span className={styles.listRowSubtitle}>Conciliado em {formatDateTime(r.matchedAt)} por {userName(users, r.matchedByUserId)}</span>
                          </div>
                          <Icon name="check" size={16} className={styles.checkIcon} />
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className={styles.paginationRow}>
                  <Pagination page={page3} totalPages={totalPages3} onChange={setPage3} />
                  <label className={styles.pageSizeLabel}>
                    Por página
                    <Select
                      className={styles.pageSizeSelect}
                      value={pageSize3}
                      onChange={(e) => { setPageSize3(Number(e.target.value)); setPage3(1); }}
                    >
                      <option value={8}>8</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </Select>
                  </label>
                </div>
              </Card>
            </div>

            <div className={styles.sidebar}>
              <Card title="Status de conciliação" subtitle="Troque o tipo de gráfico">
                <SwitchableChart items={byStatus} defaultType="donut" />
              </Card>
              <Card title="Por conta bancária" subtitle="Volume de transações do extrato">
                <SwitchableChart items={byBankAccount} defaultType="column" />
              </Card>
            </div>
          </div>
        </>
      )}

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>

      <ReconcileModal
        transaction={reconcileModal}
        candidates={reconcileModal ? candidatesFor(reconcileModal) : []}
        onClose={() => setReconcileModal(null)}
        onConfirm={(entryId) => handleReconcile(entryId, reconcileModal.id)}
      />
    </AppShell>
  );
}

function ReconcileModal({ transaction, candidates, onClose, onConfirm }) {
  const [entryId, setEntryId] = useState("");

  if (!transaction) return null;

  return (
    <Modal
      open={Boolean(transaction)}
      onClose={onClose}
      title="Conciliar transação"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => entryId && onConfirm(entryId)} disabled={!entryId}>Conciliar</Button>
        </>
      }
    >
      <p className={styles.modalIntro}>
        {transaction.description} — {formatBRL(transaction.amount)} em {formatDate(transaction.transactionDate)}
      </p>
      {candidates.length === 0 ? (
        <Alert tone="warning" title="Nenhum lançamento com valor compatível">
          Só é possível conciliar lançamentos cujo valor bate exatamente com a transação.
        </Alert>
      ) : (
        <Select value={entryId} onChange={(e) => setEntryId(e.target.value)}>
          <option value="">Selecione o lançamento...</option>
          {candidates.map((e) => (
            <option key={e.id} value={e.id}>{e.description} — {formatBRL(e.amount)}</option>
          ))}
        </Select>
      )}
    </Modal>
  );
}
