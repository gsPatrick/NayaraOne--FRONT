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
import Badge from "@/components/atoms/Badge/Badge";
import { listFinancialEntries, listBankTransactions, listBankAccounts, listReconciliations, matchReconciliation,
  matchReconciliationGroup, suggestReconciliationMatches } from "@/lib/api/finance";
import { apiFetch } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/session";
import { formatCalendarDay } from "@/lib/finance/extras";
import { formatBRL, formatDate, formatDateTime, humanizeText } from "@/lib/format";
import styles from "./page.module.css";

// Gap conhecido: não existe endpoint de importação de extrato em lote na API
// (bankTransactions.service.js só expõe createBankTransaction, uma linha por vez). Esta tela
// não tem — e não deveria ganhar — um botão de "importar extrato" até esse endpoint existir.

function userName(users, id) {
  return users.find((u) => u.id === id)?.name || "Usuário não identificado";
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
  const [suggestions, setSuggestions] = useState({}); // bankTransactionId -> { finalClass, candidates }
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [page2, setPage2] = useState(1);
  const [pageSize2, setPageSize2] = useState(20);
  const [page3, setPage3] = useState(1);
  const [pageSize3, setPageSize3] = useState(20);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    setPage2(1);
  }, [pageSize2]);

  useEffect(() => {
    setPage3(1);
  }, [pageSize3]);

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

  async function handleReconcileGroup(entryIds, transactionId) {
    try {
      const result = await matchReconciliationGroup({ financialEntryIds: entryIds, bankTransactionIds: [transactionId] });
      setReconciliations((prev) => [...prev, ...(result?.reconciliations || [])]);
      setReconcileModal(null);
      showNotice("success", "Conciliado em grupo", `${entryIds.length} lançamentos conciliados com a transação de extrato.`);
    } catch (err) {
      showNotice("danger", "Não foi possível conciliar em grupo", err?.message || "A soma dos lançamentos precisa bater exatamente com a transação.");
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

  // GAP REAL (verificação cética adicional, Marco 4, 12/10/2026): a classificação exigida pelo
  // Caderno §11 (EXATO/FORTE/PROVÁVEL/AMBÍGUO/SEM CORRESPONDÊNCIA) vinha da engine real do
  // backend (`suggestReconciliationMatches`), não de um match ingênuo só por valor aqui no
  // front. Busca a sugestão real pra cada transação não conciliada assim que a lista carrega.
  useEffect(() => {
    if (unreconciledTransactions.length === 0) return;
    let cancelled = false;
    Promise.all(
      unreconciledTransactions.map((t) =>
        suggestReconciliationMatches(t.id)
          .then((s) => [t.id, s])
          .catch(() => [t.id, { finalClass: "NO_MATCH", candidates: [] }])
      )
    ).then((pairs) => {
      if (cancelled) return;
      setSuggestions(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreconciledTransactions.map((t) => t.id).join(",")]);

  const MATCH_CLASS_LABEL = {
    EXACT: { text: "Exato", tone: "success" },
    STRONG: { text: "Forte", tone: "success" },
    PROBABLE: { text: "Provável", tone: "warning" },
    AMBIGUOUS: { text: "Ambíguo", tone: "danger" },
    NO_MATCH: { text: "Sem correspondência", tone: "neutral" },
  };

  function candidatesFor(transaction) {
    const suggestion = suggestions[transaction.id];
    if (suggestion) {
      const ids = new Set(suggestion.candidates.map((c) => c.financialEntryId));
      return unreconciledEntries.filter((e) => ids.has(e.id));
    }
    // Enquanto a sugestão real ainda não voltou, usa o mesmo filtro por valor como fallback
    // visual temporário — nunca decide classe nem auto-concilia nada sozinho.
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
      const label = bankAccountOf(bankAccounts, t.bankAccountId)?.bankCode || "conta não identificada";
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
                      const suggestion = suggestions[t.id];
                      const matchClass = suggestion?.finalClass;
                      const classInfo = matchClass ? MATCH_CLASS_LABEL[matchClass] : null;
                      // AMBÍGUO nunca auto-concilia, mesmo com 1 candidato aparente na lista
                      // filtrada — a classe já veio resolvida pela engine real do backend
                      // (§11 do Caderno: "ambíguo: várias possibilidades, nunca auto conciliar").
                      // Só EXATO e FORTE (um único candidato) têm o botão direto "Conciliar". PROVÁVEL e
                      // AMBÍGUO passam pela revisão (humano vê a razão e confirma); nada é automático.
                      const canAutoMatch = candidates.length === 1 && (matchClass === "EXACT" || matchClass === "STRONG");
                      return (
                        <li key={t.id} className={styles.listRow}>
                          <span className={styles.bankIconSlot}>
                            <BankLogo bankCode={account?.bankCode} size={30} square />
                          </span>
                          <div className={styles.listRowInfo}>
                            <span className={styles.listRowTitle}>{humanizeText(t.description)}</span>
                            <span className={styles.listRowSubtitle}>{formatCalendarDay(t.transactionDate)} · {t.externalTransactionId || "sem identificador do banco"} · {account?.bankCode || "conta não identificada"}</span>
                          </div>
                          {classInfo ? <Badge tone={classInfo.tone}>{classInfo.text}</Badge> : null}
                          <span className={styles.listRowRight}>{formatBRL(t.amount)}</span>
                          {canAutoMatch ? (
                            <Button requires="finance:reconcile" size="sm" onClick={() => handleReconcile(candidates[0].id, t.id)}>
                              <Icon name="check" size={14} /> Conciliar
                            </Button>
                          ) : (
                            <Button requires="finance:reconcile" size="sm" variant="secondary" onClick={() => setReconcileModal(t)} disabled={candidates.length === 0}>
                              {candidates.length === 0 ? "Sem candidato" : `Revisar (${candidates.length})`}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className={styles.paginationRow}>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onChange={setPage}
                    pageSize={pageSize}
                    pageSizeOptions={[5, 10, 15, 20, 25]}
                    onPageSizeChange={setPageSize}
                  />
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
                            <span className={styles.listRowTitle}>{humanizeText(e.description)}</span>
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
                  <Pagination
                    page={page2}
                    totalPages={totalPages2}
                    onChange={setPage2}
                    pageSize={pageSize2}
                    pageSizeOptions={[5, 10, 15, 20, 25]}
                    onPageSizeChange={setPageSize2}
                  />
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
                            <span className={styles.listRowTitle}>{humanizeText(entry?.description) || "Lançamento"}</span>
                            <span className={styles.listRowSubtitle}>Conciliado em {formatDateTime(r.matchedAt)} por {userName(users, r.matchedByUserId)}</span>
                          </div>
                          <Icon name="check" size={16} className={styles.checkIcon} />
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className={styles.paginationRow}>
                  <Pagination
                    page={page3}
                    totalPages={totalPages3}
                    onChange={setPage3}
                    pageSize={pageSize3}
                    pageSizeOptions={[5, 10, 15, 20, 25]}
                    onPageSizeChange={setPageSize3}
                  />
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
        matchClass={reconcileModal ? suggestions[reconcileModal.id]?.finalClass : null}
        suggested={reconcileModal ? suggestions[reconcileModal.id]?.candidates || [] : []}
        onClose={() => setReconcileModal(null)}
        onConfirm={(entryId) => handleReconcile(entryId, reconcileModal.id)}
        groupEntries={reconcileModal ? unreconciledEntries.filter((e) => !reconcileModal.bankAccountId || !e.bankAccountId || e.bankAccountId === reconcileModal.bankAccountId) : []}
        onConfirmGroup={(entryIds) => handleReconcileGroup(entryIds, reconcileModal.id)}
      />
    </AppShell>
  );
}

// Razão da sugestão em português (vem do motor: "Valor igual", "Mesma conta bancária"...).
function reasonSuffix(suggested, entryId) {
  const hit = suggested.find((c) => c.financialEntryId === entryId);
  if (!hit || !Array.isArray(hit.reasons) || hit.reasons.length === 0) return "";
  return ` (${hit.reasons.join(", ").toLowerCase()})`;
}

function ReconcileModal({ transaction, candidates, matchClass, suggested = [], onClose, onConfirm, groupEntries = [], onConfirmGroup }) {
  const [entryId, setEntryId] = useState("");
  const [groupMode, setGroupMode] = useState(false);
  const [picked, setPicked] = useState([]);
  const toCents = (v) => Math.round(Math.abs(Number(v) || 0) * 100);
  const pickedCents = groupEntries.filter((e) => picked.includes(e.id)).reduce((acc, e) => acc + toCents(e.amount), 0);
  const targetCents = transaction ? toCents(transaction.amount) : 0;
  const groupMatches = picked.length >= 2 && pickedCents === targetCents;

  if (!transaction) return null;

  return (
    <Modal
      open={Boolean(transaction)}
      onClose={onClose}
      title="Conciliar transação"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          {groupMode ? (
            <Button onClick={() => groupMatches && onConfirmGroup && onConfirmGroup(picked)} disabled={!groupMatches}>Conciliar em grupo</Button>
          ) : (
            <Button onClick={() => entryId && onConfirm(entryId)} disabled={!entryId}>Conciliar</Button>
          )}
        </>
      }
    >
      <p className={styles.modalIntro}>
        {humanizeText(transaction.description)} — {formatBRL(transaction.amount)} em {formatCalendarDay(transaction.transactionDate)}
      </p>
      {matchClass === "AMBIGUOUS" ? (
        <Alert tone="warning" className={styles.notice}>
          Mais de um lançamento combina com esta transação com a mesma força. Quando há dúvida, a
          conciliação nunca é automática: confira os dados abaixo e escolha o lançamento correto.
        </Alert>
      ) : null}
      {groupMode ? (
        <div>
          <p className={styles.modalIntro}>
            Marque dois ou mais lançamentos cuja soma bata exatamente com a transação. Soma marcada: {formatBRL(pickedCents / 100)} de {formatBRL(targetCents / 100)}.
          </p>
          {groupEntries.length === 0 ? (
            <Alert tone="warning" title="Nenhum lançamento em aberto">Não há lançamentos sem conciliação para esta conta.</Alert>
          ) : (
            groupEntries.map((e) => (
              <label key={e.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                <input
                  type="checkbox"
                  checked={picked.includes(e.id)}
                  onChange={(ev) => setPicked((prev) => (ev.target.checked ? [...prev, e.id] : prev.filter((x) => x !== e.id)))}
                />
                <span>{humanizeText(e.description)} — {formatBRL(e.amount)}</span>
              </label>
            ))
          )}
          {picked.length >= 2 && !groupMatches ? (
            <Alert tone="warning">A soma marcada ainda não bate com a transação. A conciliação em grupo só é aceita quando bate no centavo.</Alert>
          ) : null}
          <Button variant="secondary" onClick={() => { setGroupMode(false); setPicked([]); }}>Voltar para conciliação de um lançamento</Button>
        </div>
      ) : candidates.length === 0 ? (
        <Alert tone="warning" title="Nenhum lançamento com valor compatível">
          Nenhum lançamento sozinho tem o valor desta transação.{" "}
          <Button variant="secondary" onClick={() => setGroupMode(true)}>Conciliar vários lançamentos juntos</Button>
        </Alert>
      ) : (
        <Select value={entryId} onChange={(e) => setEntryId(e.target.value)}>
          <option value="">Selecione o lançamento...</option>
          {candidates.map((e) => (
            <option key={e.id} value={e.id}>{humanizeText(e.description)} — {formatBRL(e.amount)}{reasonSuffix(suggested, e.id)}</option>
          ))}
        </Select>
      )}
      {!groupMode && candidates.length > 0 ? (
        <p className={styles.modalIntro}>
          <Button variant="secondary" onClick={() => setGroupMode(true)}>Conciliar vários lançamentos juntos</Button>
        </p>
      ) : null}
    </Modal>
  );
}
