"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Modal from "@/components/organisms/Modal/Modal";
import Badge from "@/components/atoms/Badge/Badge";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Select from "@/components/atoms/Select/Select";
import StatTile from "@/components/molecules/StatTile/StatTile";
import SwitchableChart from "@/components/molecules/SwitchableChart/SwitchableChart";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import Pagination from "@/components/molecules/Pagination/Pagination";
import {
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_TONE,
  REPASSE_STATUS_LABELS,
  REPASSE_STATUS_TONE,
  isBankAccountEligibleForPayment,
  bankAccountCooldownRemainingHours,
} from "@/lib/mock/finance";
import {
  listCommissions,
  listCommissionInstallments,
  listOwnerRepasses,
  listBankAccounts,
  listFinancialEntries,
  payCommissionInstallment,
  payOwnerRepasse,
} from "@/lib/api/finance";
import { listPeople } from "@/lib/api/people";
import { apiFetch } from "@/lib/api/client";
import { commissionDescription } from "@/lib/finance/labels";
import { formatBRL, formatDate } from "@/lib/format";
import { buildMonthlyChartData } from "@/lib/monthlyChartData";
import styles from "./page.module.css";

function userName(users, id) {
  return users.find((u) => u.id === id)?.name || "—";
}
function personOf(people, id) {
  return people.find((p) => p.id === id) || null;
}

export default function ComissoesRepassesPage() {
  const [commissions, setCommissions] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [repasses, setRepasses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [people, setPeople] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [page2, setPage2] = useState(1);
  const [pageSize2, setPageSize2] = useState(8);
  const [payModal, setPayModal] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listCommissions(), listOwnerRepasses(), listBankAccounts(), listFinancialEntries({ status: "PENDING" }), listPeople(), apiFetch("/users")])
      .then(async ([com, rep, ba, entries, pp, us]) => {
        if (cancelled) return;
        setCommissions(com || []);
        setRepasses(rep || []);
        setBankAccounts(ba || []);
        setPendingEntries(entries || []);
        setPeople(pp || []);
        setUsers(us || []);
        const allInstallments = await Promise.all(
          (com || []).map((c) => listCommissionInstallments(c.id).catch(() => []))
        );
        if (!cancelled) setInstallments(allInstallments.flat());
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar comissões e repasses.");
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

  function bankAccountOf(id) {
    return bankAccounts.find((a) => a.id === id) || null;
  }

  // payCommissionInstallment exige financialEntryId — a tela original não pedia esse vínculo,
  // então abrimos um seletor de lançamento PENDING antes de confirmar o pagamento.
  async function confirmPayInstallment(installment, financialEntryId) {
    setBusyId(installment.id);
    try {
      const updated = await payCommissionInstallment(installment.id, financialEntryId);
      setInstallments((prev) => prev.map((i) => (i.id === installment.id ? updated : i)));
      setPayModal(null);
      showNotice("success", "Parcela paga", `Parcela ${installment.installmentNumber} marcada como paga.`);
    } catch (err) {
      showNotice("danger", "Não foi possível pagar a parcela", err?.message || "Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePayRepasse(repasse) {
    if (repasse.status !== "PENDING") return;
    const account = bankAccountOf(repasse.bankAccountId);
    if (account && !isBankAccountEligibleForPayment({ ...account, updatedAt: account.updatedAt || account.updated_at })) {
      if (account.status === "BLOCKED") showNotice("danger", "Bloqueado (antifraude)", "A conta deste repasse está bloqueada.");
      else showNotice("warning", "Conta em resfriamento", `Faltam ${bankAccountCooldownRemainingHours({ ...account, updatedAt: account.updatedAt || account.updated_at })}h para esta conta ficar elegível.`);
      return;
    }
    setBusyId(repasse.id);
    try {
      const updated = await payOwnerRepasse(repasse.id);
      setRepasses((prev) => prev.map((r) => (r.id === repasse.id ? updated : r)));
      showNotice("success", "Repasse pago", `Repasse de ${formatBRL(updated.netAmount)} pago ao proprietário.`);
    } catch (err) {
      showNotice("danger", "Não foi possível pagar o repasse", err?.message || "Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      if (query && !userName(users, c.beneficiaryUserId).toLowerCase().includes(query.toLowerCase())) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [commissions, users, query, statusFilter]);

  const totalCommissions = commissions.reduce((s, c) => s + Number(c.totalAmount), 0);
  const totalRepasses = repasses.reduce((s, r) => s + Number(r.netAmount), 0);
  const pendingInstallments = installments.filter((i) => i.status !== "PAID").length;
  const pendingRepasses = repasses.filter((r) => r.status === "PENDING").length;

  const installmentsByMonth = useMemo(
    () =>
      buildMonthlyChartData(installments, {
        getDate: (i) => i.dueAt,
        getValue: (i) => Number(i.amount),
        formatValue: formatBRL,
      }),
    [installments]
  );

  const byBeneficiary = useMemo(() => {
    const counts = {};
    commissions.forEach((c) => {
      const name = userName(users, c.beneficiaryUserId);
      counts[name] = (counts[name] || 0) + Number(c.totalAmount);
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value, displayValue: formatBRL(value) }));
  }, [commissions, users]);

  const repasseByStatus = useMemo(
    () => [
      { label: "Pendente", value: repasses.filter((r) => r.status === "PENDING").length, color: "var(--color-warning)" },
      { label: "Pago", value: repasses.filter((r) => r.status === "PAID").length, color: "var(--color-success)" },
    ].filter((i) => i.value > 0),
    [repasses]
  );

  const totalPages = Math.max(1, Math.ceil(filteredCommissions.length / pageSize));
  const pageItems = filteredCommissions.slice((page - 1) * pageSize, page * pageSize);

  const totalPages2 = Math.max(1, Math.ceil(repasses.length / pageSize2));
  const pageItems2 = repasses.slice((page2 - 1) * pageSize2, page2 * pageSize2);

  return (
    <AppShell title="Comissões & Repasses" backHref="/painel/financeiro">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar comissões e repasses">{loadError}</Alert> : null}
      {notice ? <Alert tone={notice.tone} title={notice.title} className={styles.notice}>{notice.message}</Alert> : null}

      {loading ? (
        <Spinner size="lg" />
      ) : (
        <>
          <div className={styles.grid}>
            <StatTile label="Comissões (total)" value={formatBRL(totalCommissions)} tone="info" icon="chart" />
            <StatTile label="Repasses (total)" value={formatBRL(totalRepasses)} tone="info" icon="layers" />
            <StatTile label="Parcelas pendentes" value={pendingInstallments} tone={pendingInstallments > 0 ? "warning" : "success"} icon="calendar" />
            <StatTile label="Repasses pendentes" value={pendingRepasses} tone={pendingRepasses > 0 ? "warning" : "success"} icon="money" />
          </div>

          <Card title="Projeção de parcelas por mês" subtitle="Soma de parcelas de comissão por vencimento — troque o tipo de gráfico" className={styles.heroCard}>
            <SwitchableChart items={installmentsByMonth} defaultType="line" />
          </Card>

          <div className={styles.layout}>
            <div className={styles.mainCol}>
              <Card
                title="Comissões"
                subtitle="Direito de comissão por corretor/oportunidade"
                actions={
                  <div className={styles.toolbar}>
                    <SearchInput placeholder="Buscar por corretor..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
                    <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                      <option value="">Todos os status</option>
                      {Object.entries(COMMISSION_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </Select>
                  </div>
                }
              >
                {filteredCommissions.length === 0 ? (
                  <p className={styles.emptyText}>Nenhuma comissão encontrada.</p>
                ) : (
                  <ul className={styles.list}>
                    {pageItems.map((c) => {
                      const its = installments.filter((i) => i.commissionId === c.id);
                      return (
                        <li key={c.id} className={styles.commissionBlock}>
                          <div className={styles.listRow}>
                            <Avatar name={userName(users, c.beneficiaryUserId)} size="sm" />
                            <div className={styles.listRowInfo}>
                              <span className={styles.listRowTitle}>{commissionDescription(c)}</span>
                              <span className={styles.listRowSubtitle}>{userName(users, c.beneficiaryUserId)} · {c.percentage}% sobre {formatBRL(c.baseAmount)}</span>
                            </div>
                            <div className={styles.listRowRight}>
                              <Badge tone={COMMISSION_STATUS_TONE[c.status]}>{COMMISSION_STATUS_LABELS[c.status]}</Badge>
                              <strong className={styles.commissionTotal}>{formatBRL(c.totalAmount)}</strong>
                            </div>
                          </div>
                          <div className={styles.installmentsList}>
                            {its.map((i) => (
                              <div key={i.id} className={styles.installmentRow}>
                                <span>Parcela {i.installmentNumber} — {formatBRL(i.amount)} — vence {formatDate(i.dueAt)}</span>
                                {i.status === "PAID" ? (
                                  <Badge tone="success">Paga em {formatDate(i.paidAt)}</Badge>
                                ) : (
                                  <Button size="sm" variant="secondary" onClick={() => setPayModal(i)} loading={busyId === i.id}>Pagar</Button>
                                )}
                              </div>
                            ))}
                          </div>
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

              <Card title="Repasses a proprietários" subtitle="Líquido = bruto − deduções (sempre calculado, nunca editável)">
                <ul className={styles.list}>
                  {pageItems2.map((r) => {
                    const account = bankAccountOf(r.bankAccountId);
                    const owner = personOf(people, r.ownerPersonId);
                    return (
                      <li key={r.id} className={styles.listRow}>
                        <Avatar name={owner?.legalName || "—"} size="sm" />
                        <span className={styles.bankIconSlot}>
                          <BankLogo bankCode={account?.bankCode} size={28} square />
                        </span>
                        <div className={styles.listRowInfo}>
                          <span className={styles.listRowTitle}>{owner?.legalName || "—"}</span>
                          <span className={styles.listRowSubtitle}>
                            Ref. {r.referenceMonth} · Bruto {formatBRL(r.grossAmount)} − Deduções {formatBRL(r.deductionsAmount)} = <strong>{formatBRL(r.netAmount)}</strong>
                          </span>
                        </div>
                        <div className={styles.listRowRight}>
                          <Badge tone={REPASSE_STATUS_TONE[r.status]}>{REPASSE_STATUS_LABELS[r.status]}</Badge>
                          {r.status === "PENDING" ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handlePayRepasse(r)}
                              loading={busyId === r.id}
                              disabled={account && !isBankAccountEligibleForPayment({ ...account, updatedAt: account.updatedAt || account.updated_at })}
                            >
                              Pagar
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
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
            </div>

            <div className={styles.sidebar}>
              <Card title="Comissões por corretor" subtitle="Troque o tipo de gráfico">
                <SwitchableChart items={byBeneficiary} defaultType="column" />
              </Card>
              <Card title="Repasses por status" subtitle="Troque o tipo de gráfico">
                <SwitchableChart items={repasseByStatus} defaultType="donut" />
              </Card>
            </div>
          </div>
        </>
      )}

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>

      <PayInstallmentModal
        installment={payModal}
        pendingEntries={pendingEntries}
        onClose={() => setPayModal(null)}
        onConfirm={(financialEntryId) => confirmPayInstallment(payModal, financialEntryId)}
        busy={payModal ? busyId === payModal.id : false}
      />
    </AppShell>
  );
}

function PayInstallmentModal({ installment, pendingEntries, onClose, onConfirm, busy }) {
  const [entryId, setEntryId] = useState("");

  useEffect(() => {
    setEntryId("");
  }, [installment]);

  return (
    <Modal
      open={Boolean(installment)}
      onClose={onClose}
      title="Pagar parcela de comissão"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => entryId && onConfirm(entryId)} disabled={!entryId} loading={busy}>Confirmar pagamento</Button>
        </>
      }
    >
      {/* payCommissionInstallment exige financialEntryId (commissions.service.js) — a tela
          original não pedia esse vínculo, então adicionamos este seletor de lançamento PENDING. */}
      {installment ? (
        <>
          <p className={styles.modalIntro}>Parcela {installment.installmentNumber} — {formatBRL(installment.amount)}</p>
          <Alert tone="info">Selecione o lançamento (PENDING) do ledger que corresponde ao pagamento desta parcela.</Alert>
          {pendingEntries.length === 0 ? (
            <Alert tone="warning">Nenhum lançamento PENDING disponível — crie um lançamento antes de pagar esta parcela.</Alert>
          ) : (
            <Select value={entryId} onChange={(e) => setEntryId(e.target.value)}>
              <option value="">Selecione o lançamento...</option>
              {pendingEntries.map((e) => (
                <option key={e.id} value={e.id}>{e.description} — {formatBRL(e.amount)}</option>
              ))}
            </Select>
          )}
        </>
      ) : null}
    </Modal>
  );
}
