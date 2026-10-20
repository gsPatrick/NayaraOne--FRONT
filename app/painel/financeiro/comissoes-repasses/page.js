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
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Select from "@/components/atoms/Select/Select";
import StatTile from "@/components/molecules/StatTile/StatTile";
import SwitchableChart from "@/components/molecules/SwitchableChart/SwitchableChart";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import Pagination from "@/components/molecules/Pagination/Pagination";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import {
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_TONE,
  REPASSE_STATUS_LABELS,
  REPASSE_STATUS_TONE,
  isBankAccountEligibleForPayment,
  bankAccountCooldownRemainingHours,
  ENTRY_STATUS_LABELS,
} from "@/lib/mock/finance";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import FormField from "@/components/molecules/FormField/FormField";
import {
  listCommissions,
  listCommissionInstallments,
  listOwnerRepasses,
  listEligibleRepasseSources,
  listBankAccounts,
  listFinancialEntries,
  payCommissionInstallment,
  payOwnerRepasse,
  createCommission,
  cancelCommission,
  getCommissionAdjustments,
  getOwnerRepasseComposition,
  approveOwnerRepasse,
  listCostCenters,
  createOwnerRepasse,
} from "@/lib/api/finance";
import { listProperties } from "@/lib/api/properties";
import { listContracts } from "@/lib/api/legal";
import { listPeople } from "@/lib/api/people";
import { apiFetch } from "@/lib/api/client";
import { commissionDescription } from "@/lib/finance/labels";
import { formatBRL, formatDate, formatPercent, formatContractLabel, toNumber, humanizeText, formatCompetence } from "@/lib/format";
import { buildMonthlyChartData } from "@/lib/monthlyChartData";
import styles from "./page.module.css";

function userName(users, id) {
  return users.find((u) => u.id === id)?.name || "Usuário não identificado";
}
function personOf(people, id) {
  return people.find((p) => p.id === id) || null;
}

export default function ComissoesRepassesPage() {
  const [commissions, setCommissions] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [newRepasseModal, setNewRepasseModal] = useState(false);
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
  const [pageSize, setPageSize] = useState(20);
  const [page2, setPage2] = useState(1);
  const [pageSize2, setPageSize2] = useState(20);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    setPage2(1);
  }, [pageSize2]);
  const [payModal, setPayModal] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [newCommissionModal, setNewCommissionModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);
  const [adjustmentsModal, setAdjustmentsModal] = useState(null);
  const [compositionModal, setCompositionModal] = useState(null);
  // §12 (Frente 3): aprovação do repasse por outra pessoa (centro de custo + MFA recente).
  const [approveModal, setApproveModal] = useState(null);
  const [approveMfa, setApproveMfa] = useState(null);

  async function handleViewAdjustments(commission) {
    setAdjustmentsModal({ commission, loading: true, items: [] });
    try {
      const items = await getCommissionAdjustments(commission.id);
      setAdjustmentsModal({ commission, loading: false, items });
    } catch (err) {
      setAdjustmentsModal({ commission, loading: false, items: [], error: err?.message || "Não foi possível carregar os ajustes." });
    }
  }

  async function handleViewComposition(repasse) {
    setCompositionModal({ repasse, loading: true, data: null });
    try {
      const data = await getOwnerRepasseComposition(repasse.id);
      setCompositionModal({ repasse, loading: false, data });
    } catch (err) {
      setCompositionModal({ repasse, loading: false, data: null, error: err?.message || "Não foi possível carregar a composição." });
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listCommissions({ includeInstallments: true }), listOwnerRepasses(), listBankAccounts(), listFinancialEntries({ status: "PENDING" }), listPeople(), apiFetch("/users")])
      .then(async ([com, rep, ba, entries, pp, us]) => {
        if (cancelled) return;
        setCommissions(com || []);
        setRepasses(rep || []);
        setBankAccounts(ba || []);
        setPendingEntries(entries || []);
        setPeople(pp || []);
        setUsers(us || []);
        // O2 (auditoria M45): parcelas vêm junto da listagem (uma chamada), sem N+1.
        if (!cancelled) setInstallments((com || []).flatMap((c) => c.installments || []));
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

  async function handleCreateRepasse(payload) {
    setBusyId("new-repasse");
    try {
      const created = await createOwnerRepasse(payload);
      const repasse = created?.repasse || created;
      setRepasses((prev) => [repasse, ...prev]);
      setNewRepasseModal(false);
      showNotice("success", "Repasse criado", `Repasse de ${formatBRL(repasse.netAmount)} (ref. ${formatCompetence(repasse.referenceMonth)}) aguardando aprovação por outra pessoa.`);
    } catch (err) {
      showNotice("danger", "Não foi possível criar o repasse", err?.message || "Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateCommission(payload) {
    setBusyId("new-commission");
    try {
      const { commission } = await createCommission(payload);
      setCommissions((prev) => [commission, ...prev]);
      const its = await listCommissionInstallments(commission.id).catch(() => []);
      setInstallments((prev) => [...prev, ...its]);
      setNewCommissionModal(false);
      showNotice("success", "Comissão criada", `Comissão de ${formatBRL(commission.totalAmount)} registrada para ${userName(users, commission.beneficiaryUserId)}.`);
    } catch (err) {
      showNotice("danger", "Não foi possível criar a comissão", err?.message || "Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  // GAP REAL CORRIGIDO (verificação cética adicional, Marco 4, 12/10/2026): cancelCommission
  // (FIN-TS-017 — rollback de comissão ao cancelar contrato) já existia e era testado no
  // backend, mas nenhum humano conseguia disparar isso pela interface — a única ação na tela
  // era "Pagar parcela". Botão de cancelamento com motivo obrigatório adicionado.
  async function handleCancelCommission(commission, reason) {
    setBusyId(`cancel-${commission.id}`);
    try {
      const { commission: updated } = await cancelCommission(commission.id, reason);
      setCommissions((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setInstallments((prev) =>
        prev.map((i) => (i.commissionId === updated.id && i.status === "PENDING" ? { ...i, status: "CANCELLED" } : i))
      );
      setCancelModal(null);
      showNotice("success", "Comissão cancelada", `Comissão de ${userName(users, updated.beneficiaryUserId)} cancelada — ajuste registrado em auditoria.`);
    } catch (err) {
      showNotice("danger", "Não foi possível cancelar a comissão", err?.message || "Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  async function runApproveRepasse({ repasse, costCenterId }) {
    setBusyId(repasse.id);
    try {
      const { repasse: updated } = await approveOwnerRepasse(repasse.id, { costCenterId });
      setRepasses((prev) => prev.map((r) => (r.id === repasse.id ? updated : r)));
      showNotice("success", "Repasse aprovado", "Lançamento a pagar criado — pague pelo banco (ou baixa com comprovante) e depois confirme o pagamento aqui.");
    } catch (err) {
      showNotice("danger", "Não foi possível aprovar o repasse", err?.message || "Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePayRepasse(repasse) {
    if (repasse.status !== "APPROVED") return;
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
      showNotice("success", "Pagamento confirmado", `Repasse de ${formatBRL(updated.netAmount)} confirmado como pago (com comprovante/confirmação bancária).`);
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
        <SkeletonDetail sections={3} />
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
              >
                <div className={styles.toolbar}>
                  <SearchInput placeholder="Buscar por corretor..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
                  <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                    <option value="">Todos os status</option>
                    {Object.entries(COMMISSION_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </Select>
                  {/* FIX (reportado pela cliente 18/09/2026): não existia nenhuma ação de
                      criação de comissão na tela nem gatilho automático a partir do contrato —
                      a API já tinha createCommission pronta e testada, só faltava esta tela. */}
                  <Button onClick={() => setNewCommissionModal(true)}>
                    <Icon name="plus" size={16} /> Nova comissão
                  </Button>
                </div>
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
                              <span className={styles.listRowSubtitle}>{userName(users, c.beneficiaryUserId)} · {formatPercent(c.percentage)} sobre {formatBRL(c.baseAmount)}</span>
                            </div>
                            <div className={styles.listRowRight}>
                              <Badge tone={COMMISSION_STATUS_TONE[c.status]}>{COMMISSION_STATUS_LABELS[c.status]}</Badge>
                              <strong className={styles.commissionTotal}>{formatBRL(c.totalAmount)}</strong>
                              {c.status !== "CANCELLED" && c.status !== "PAID" ? (
                                <Button size="sm" variant="danger" onClick={() => setCancelModal(c)}>Cancelar</Button>
                              ) : null}
                              {c.status === "CANCELLED" ? (
                                <Button size="sm" variant="secondary" onClick={() => handleViewAdjustments(c)}>Ver ajustes</Button>
                              ) : null}
                            </div>
                          </div>
                          <div className={styles.installmentsList}>
                            {its.map((i) => (
                              <div key={i.id} className={styles.installmentRow}>
                                <span>Parcela {i.installmentNumber} — {formatBRL(i.amount)} — vence {formatDate(i.dueAt)}</span>
                                {i.status === "PAID" ? (
                                  <Badge tone="success">Paga em {formatDate(i.paidAt)}</Badge>
                                ) : i.status === "CANCELLED" || c.status === "CANCELLED" ? (
                                  <Badge tone="neutral">Cancelada</Badge>
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

              <Card title="Repasses a proprietários" subtitle="Líquido = bruto − deduções (sempre calculado, nunca editável)">
                <div className={styles.toolbar}>
                  {/* F4 (auditoria M45): não havia como criar repasse pela tela. */}
                  <Button onClick={() => setNewRepasseModal(true)}>
                    <Icon name="plus" size={16} /> Novo repasse
                  </Button>
                </div>
                {repasses.length === 0 ? <p className={styles.emptyText}>Nenhum repasse registrado.</p> : null}
                <ul className={styles.list}>
                  {pageItems2.map((r) => {
                    const account = bankAccountOf(r.bankAccountId);
                    const owner = personOf(people, r.ownerPersonId);
                    return (
                      <li key={r.id} className={styles.listRow}>
                        <Avatar name={owner?.legalName || "?"} size="sm" />
                        <span className={styles.bankIconSlot}>
                          <BankLogo bankCode={account?.bankCode} size={28} square />
                        </span>
                        <div className={styles.listRowInfo}>
                          <span className={styles.listRowTitle}>{owner?.legalName || "Proprietário não encontrado"}</span>
                          <span className={styles.listRowSubtitle}>
                            Ref. {formatCompetence(r.referenceMonth)} · Bruto {formatBRL(r.grossAmount)} − Deduções {formatBRL(r.deductionsAmount)} = <strong>{formatBRL(r.netAmount)}</strong>
                          </span>
                        </div>
                        <div className={styles.listRowRight}>
                          <Badge tone={REPASSE_STATUS_TONE[r.status]}>{REPASSE_STATUS_LABELS[r.status]}</Badge>
                          <Button size="sm" variant="secondary" onClick={() => handleViewComposition(r)}>Composição</Button>
                          {r.status === "PENDING" ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setApproveModal(r)}
                              loading={busyId === r.id}
                              disabled={account && !isBankAccountEligibleForPayment({ ...account, updatedAt: account.updatedAt || account.updated_at })}
                            >
                              Aprovar
                            </Button>
                          ) : null}
                          {r.status === "APPROVED" ? (
                            <Button size="sm" variant="secondary" onClick={() => handlePayRepasse(r)} loading={busyId === r.id}>
                              Confirmar pagamento
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
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

      <NewCommissionModal
        open={newCommissionModal}
        users={users.filter((u) => u.status === "ACTIVE")}
        onClose={() => setNewCommissionModal(false)}
        onConfirm={handleCreateCommission}
        busy={busyId === "new-commission"}
      />

      <NewRepasseModal
        open={newRepasseModal}
        people={people}
        bankAccounts={bankAccounts}
        onClose={() => setNewRepasseModal(false)}
        onConfirm={handleCreateRepasse}
        busy={busyId === "new-repasse"}
      />

      <CancelCommissionModal
        commission={cancelModal}
        users={users}
        onClose={() => setCancelModal(null)}
        onConfirm={(reason) => handleCancelCommission(cancelModal, reason)}
        busy={cancelModal ? busyId === `cancel-${cancelModal.id}` : false}
      />

      <ApproveRepasseModal
        repasse={approveModal}
        onClose={() => setApproveModal(null)}
        onConfirm={(costCenterId) => {
          setApproveMfa({ repasse: approveModal, costCenterId });
          setApproveModal(null);
        }}
      />
      <MfaVerifyModal
        open={Boolean(approveMfa)}
        onClose={() => setApproveMfa(null)}
        actionLabel="aprovar este repasse ao proprietário"
        onVerified={async () => {
          const pending = approveMfa;
          setApproveMfa(null);
          await runApproveRepasse(pending);
        }}
      />

      <AdjustmentsModal state={adjustmentsModal} onClose={() => setAdjustmentsModal(null)} />
      <CompositionModal state={compositionModal} onClose={() => setCompositionModal(null)} />
    </AppShell>
  );
}

function formatMonthBR(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ""));
  return m ? `${m[2]}/${m[1]}` : ym;
}

function NewRepasseModal({ open, people, bankAccounts, onClose, onConfirm, busy }) {
  const empty = { ownerPersonId: "", propertyId: "", contractId: "", referenceMonth: "", bankAccountId: "", deductionsAmount: "", deductionsReason: "", sourceEntryIds: [] };
  const [form, setForm] = useState(empty);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [properties, setProperties] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [receivablesState, setReceivablesState] = useState({ loading: false, error: "" });

  useEffect(() => {
    if (!open) return;
    setForm(empty);
    setOwnerQuery("");
    setReceivables([]);
    Promise.all([
      listProperties().catch(() => []),
      listContracts().catch(() => []),
    ]).then(([props, cts]) => {
      setProperties(Array.isArray(props) ? props : props?.items || []);
      setContracts(Array.isArray(cts) ? cts : cts?.items || []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // M45 F4: a lista de recebimentos vem da API já filtrada pelo imóvel/contrato/período
  // escolhidos — mesma regra que a criação do repasse valida (liquidado, não é de terceiro,
  // do contrato escolhido ou de contrato do imóvel, competência até o período, com saldo).
  useEffect(() => {
    if (!open) return undefined;
    if (!form.propertyId) {
      setReceivables([]);
      return undefined;
    }
    let cancelled = false;
    setReceivablesState({ loading: true, error: "" });
    const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(form.referenceMonth) ? form.referenceMonth : undefined;
    listEligibleRepasseSources({ propertyId: form.propertyId, contractId: form.contractId || undefined, referenceMonth: validMonth })
      .then((items) => {
        if (cancelled) return;
        const list = Array.isArray(items) ? items : [];
        setReceivables(list);
        setForm((prev) => ({ ...prev, sourceEntryIds: prev.sourceEntryIds.filter((id) => list.some((e) => e.id === id)) }));
        setReceivablesState({ loading: false, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setReceivablesState({ loading: false, error: err?.message || "Não foi possível carregar os recebimentos elegíveis." });
      });
    return () => { cancelled = true; };
  }, [open, form.propertyId, form.contractId, form.referenceMonth]);

  const owners = useMemo(() => {
    const q = ownerQuery.trim().toLowerCase();
    const seen = new Set();
    return (people || [])
      .filter((p) => !seen.has(p.id) && seen.add(p.id))
      .filter((p) => !q || (p.legalName || "").toLowerCase().includes(q) || (p.taxId || "").includes(q))
      .slice(0, 50);
  }, [people, ownerQuery]);
  // O4: com proprietário escolhido, só entram os imóveis em que ele consta como proprietário.
  const ownerProperties = form.ownerPersonId
    ? properties.filter((p) => (p.owners || []).some((o) => o.personId === form.ownerPersonId))
    : properties;
  const propertyContracts = contracts.filter((c) => !form.propertyId || c.propertyId === form.propertyId);
  const activeAccounts = (bankAccounts || []).filter((a) => a.status === "ACTIVE");
  const isValid =
    form.ownerPersonId && form.propertyId && /^\d{4}-(0[1-9]|1[0-2])$/.test(form.referenceMonth) && form.sourceEntryIds.length > 0 &&
    (!(toNumber(form.deductionsAmount) > 0) || (form.deductionsReason || "").trim().length > 0);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }
  function toggleSource(id) {
    setForm((prev) => ({
      ...prev,
      sourceEntryIds: prev.sourceEntryIds.includes(id) ? prev.sourceEntryIds.filter((x) => x !== id) : [...prev.sourceEntryIds, id],
    }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo repasse ao proprietário"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!isValid}
            loading={busy}
            onClick={() =>
              onConfirm({
                ownerPersonId: form.ownerPersonId,
                propertyId: form.propertyId,
                contractId: form.contractId || null,
                referenceMonth: form.referenceMonth,
                bankAccountId: form.bankAccountId || null,
                sourceEntryIds: form.sourceEntryIds,
                deductionsAmount: form.deductionsAmount ? toNumber(form.deductionsAmount) : 0,
                deductionsReason: form.deductionsReason ? form.deductionsReason.trim() : null,
                idempotencyKey: `repasse-${form.ownerPersonId}-${form.propertyId}-${form.contractId || "sem"}-${form.referenceMonth}`,
              })
            }
          >
            Criar repasse
          </Button>
        </>
      }
    >
      <FormField label="Buscar proprietário" htmlFor="nr-owner-q" helper="Digite parte do nome ou CPF/CNPJ (até 50 resultados)">
        <Input id="nr-owner-q" value={ownerQuery} onChange={(e) => setOwnerQuery(e.target.value)} placeholder="Nome ou documento" />
      </FormField>
      <FormField label="Proprietário" htmlFor="nr-owner" required>
        <Select id="nr-owner" value={form.ownerPersonId} onChange={(e) => setForm((prev) => ({ ...prev, ownerPersonId: e.target.value, propertyId: "", contractId: "", sourceEntryIds: [] }))}>
          <option value="">Selecionar…</option>
          {owners.map((p) => (
            <option key={p.id} value={p.id}>{p.legalName}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Imóvel" htmlFor="nr-property" required>
        <Select id="nr-property" value={form.propertyId} onChange={(e) => setForm((prev) => ({ ...prev, propertyId: e.target.value, contractId: "" }))}>
          <option value="">Selecionar…</option>
          {ownerProperties.map((p) => (
            <option key={p.id} value={p.id}>{p.title || p.name || p.code || p.address || "Imóvel"}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Contrato (opcional)" htmlFor="nr-contract">
        <Select id="nr-contract" value={form.contractId} onChange={update("contractId")}>
          <option value="">Sem contrato</option>
          {propertyContracts.map((c) => (
            <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Período (competência)" htmlFor="nr-month" required helper="Só pode haver um repasse por proprietário/imóvel/contrato no mesmo período">
        <Input id="nr-month" type="month" value={form.referenceMonth} onChange={update("referenceMonth")} />
      </FormField>
      <FormField label="Conta de pagamento" htmlFor="nr-bank">
        <Select id="nr-bank" value={form.bankAccountId} onChange={update("bankAccountId")}>
          <option value="">Definir depois</option>
          {activeAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.bankName || a.bankCode} · ag. {a.agency} · cc {a.accountNumber}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Recebimentos que compõem o repasse" required helper="Só recebimentos já liquidados (dinheiro real), que não sejam de terceiros, do imóvel/contrato escolhido e com competência até o período">
        {!form.propertyId ? (
          <p>Escolha o imóvel (e, se quiser, o contrato e o período) para ver os recebimentos elegíveis.</p>
        ) : receivablesState.loading ? (
          <p>Carregando recebimentos elegíveis…</p>
        ) : receivablesState.error ? (
          <Alert tone="danger">{receivablesState.error}</Alert>
        ) : receivables.length === 0 ? (
          <p>Nenhum recebimento liquidado com saldo disponível para este imóvel/contrato/período.</p>
        ) : (
          <div style={{ maxHeight: 180, overflowY: "auto", display: "grid", gap: 4 }}>
            {receivables.map((e) => (
              <label key={e.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={form.sourceEntryIds.includes(e.id)} onChange={() => toggleSource(e.id)} />
                <span>
                  {humanizeText(e.description) || "Recebimento"} — disponível {formatBRL(e.availableAmount)}
                  {Number(e.alreadyAllocatedAmount) > 0 ? ` de ${formatBRL(e.amount)}` : ""}
                  {e.competenceMonth ? ` · competência ${formatMonthBR(e.competenceMonth)}` : ""}
                  {e.settledAt ? ` · recebido em ${formatDate(e.settledAt)}` : ""}
                </span>
              </label>
            ))}
          </div>
        )}
      </FormField>
      <FormField label="Deduções (R$)" htmlFor="nr-ded" helper="O bruto é o valor elegível dos recebimentos; líquido = bruto − deduções">
        <DecimalInput id="nr-ded" value={form.deductionsAmount} onChange={update("deductionsAmount")} placeholder="0,00" />
      </FormField>
      {toNumber(form.deductionsAmount) > 0 && (
        <FormField label="Motivo das deduções" htmlFor="nr-ded-reason" helper="Obrigatório quando há desconto (ex.: taxa de administração do contrato)">
          <Input id="nr-ded-reason" value={form.deductionsReason} onChange={update("deductionsReason")} placeholder="Motivo do desconto" />
        </FormField>
      )}
    </Modal>
  );
}

function CancelCommissionModal({ commission, users, onClose, onConfirm, busy }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason("");
  }, [commission]);

  return (
    <Modal
      open={Boolean(commission)}
      onClose={onClose}
      title="Cancelar comissão"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Voltar</Button>
          <Button variant="danger" disabled={!reason.trim()} loading={busy} onClick={() => onConfirm(reason.trim())}>
            Confirmar cancelamento
          </Button>
        </>
      }
    >
      {commission ? (
        <>
          <p className={styles.modalIntro}>
            {commissionDescription(commission)} — {userName(users, commission.beneficiaryUserId)} —{" "}
            {formatBRL(commission.totalAmount)}
          </p>
          <Alert tone="warning">
            Parcelas já pagas permanecem pagas. Parcelas ainda não pagas serão canceladas e um ajuste auditável será
            registrado (FIN-TS-017) — esta ação não pode ser desfeita.
          </Alert>
          <FormField label="Motivo do cancelamento" htmlFor="cancel-reason" required helper="Obrigatório — ex.: contrato cancelado, erro de lançamento">
            <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o motivo..." />
          </FormField>
        </>
      ) : null}
    </Modal>
  );
}

function ApproveRepasseModal({ repasse, onClose, onConfirm }) {
  const [costCenters, setCostCenters] = useState([]);
  const [costCenterId, setCostCenterId] = useState("");
  useEffect(() => {
    if (!repasse) return;
    setCostCenterId("");
    listCostCenters().then((list) => setCostCenters(list || [])).catch(() => setCostCenters([]));
  }, [repasse]);
  return (
    <Modal
      open={Boolean(repasse)}
      onClose={onClose}
      title="Aprovar repasse"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!costCenterId} onClick={() => onConfirm(costCenterId)}>Aprovar</Button>
        </>
      }
    >
      <p>
        A aprovação precisa ser de outra pessoa (não de quem registrou o repasse) e cria o lançamento a pagar de{" "}
        <strong>{repasse ? formatBRL(repasse.netAmount) : ""}</strong> (período {formatCompetence(repasse?.referenceMonth)}).
      </p>
      <FormField label="Centro de custo do pagamento" htmlFor="ar-cc" required>
        <Select id="ar-cc" value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)}>
          <option value="">Selecionar…</option>
          {costCenters.map((c) => (
            <option key={c.id} value={c.id}>{c.code ? `${c.code} — ${c.name}` : c.name}</option>
          ))}
        </Select>
      </FormField>
    </Modal>
  );
}

// Frente 3 (§14): percentual e base vêm da regra de comissão vigente (Motor de Regras) e do
// recebimento que gera o direito — a tela só escolhe o fato gerador e o componente.
function NewCommissionModal({ open, users, onClose, onConfirm, busy }) {
  const empty = { beneficiaryUserId: "", sourceEntryId: "", component: "BROKER", installmentsCount: "1" };
  const [form, setForm] = useState(empty);
  const [receivables, setReceivables] = useState([]);

  // FIX (reportado pela cliente): o seletor de beneficiário vinha PRÉ-SELECIONADO com o
  // primeiro usuário da lista (podendo ser um usuário de teste/QA) sem nenhum clique — agora
  // o campo sempre abre vazio, forçando escolha explícita.
  useEffect(() => {
    if (!open) return;
    setForm(empty);
    listFinancialEntries({ nature: "RECEIVABLE" })
      .then((list) => setReceivables((list || []).filter((e) => e.nature === "RECEIVABLE" && !e.isThirdPartyFunds && !e.parentEntryId && !["CANCELLED", "REVERSED"].includes(e.status))))
      .catch(() => setReceivables([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isValid = form.beneficiaryUserId && form.sourceEntryId && form.component;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova comissão"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!isValid}
            loading={busy}
            onClick={() =>
              onConfirm({
                beneficiaryUserId: form.beneficiaryUserId,
                sourceEntryId: form.sourceEntryId,
                component: form.component,
                installmentsCount: Number(form.installmentsCount) || 1,
                idempotencyKey: `commission-${form.sourceEntryId}-${form.component}-${form.beneficiaryUserId}`,
              })
            }
          >
            Criar comissão
          </Button>
        </>
      }
    >
      <FormField label="Corretor/beneficiário" htmlFor="nc-user" required>
        <Select id="nc-user" value={form.beneficiaryUserId} onChange={update("beneficiaryUserId")}>
          <option value="">Selecionar…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Recebimento que gera o direito (fato gerador)" htmlFor="nc-source" required helper="A base é o valor deste recebimento; o pagamento é liberado na proporção do que já foi recebido">
        <Select id="nc-source" value={form.sourceEntryId} onChange={update("sourceEntryId")}>
          <option value="">Selecionar…</option>
          {receivables.map((e) => (
            <option key={e.id} value={e.id}>{humanizeText(e.description) || "Recebimento"} · {formatBRL(e.amount)} · {ENTRY_STATUS_LABELS[e.status] || e.status}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Componente" htmlFor="nc-component" required helper="O percentual vem da regra de comissão vigente para o componente">
        <Select id="nc-component" value={form.component} onChange={update("component")}>
          <option value="BROKER">Corretor</option>
          <option value="MANAGER">Gerente</option>
          <option value="CORRESPONDENT">Correspondente</option>
        </Select>
      </FormField>
      <FormField label="Número de parcelas" htmlFor="nc-installments" helper="A última parcela absorve a diferença de arredondamento — a soma sempre fecha com o total">
        <Input id="nc-installments" type="number" min="1" step="1" value={form.installmentsCount} onChange={update("installmentsCount")} />
      </FormField>
    </Modal>
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
                <option key={e.id} value={e.id}>{humanizeText(e.description)} — {formatBRL(e.amount)}</option>
              ))}
            </Select>
          )}
        </>
      ) : null}
    </Modal>
  );
}

// GAP REAL CORRIGIDO (ciclo de verificação adicional, Marco 4, 12/10/2026): getCommissionAdjustments
// existia no backend desde o cancelamento de comissão, sem nenhuma tela mostrando o histórico.
function AdjustmentsModal({ state, onClose }) {
  const open = Boolean(state);
  const commission = state?.commission;
  return (
    <Modal open={open} onClose={onClose} title="Histórico de ajustes da comissão">
      {commission ? (
        <>
          <p className={styles.modalSubtitle}>{commissionDescription(commission)}</p>
          {state.loading ? (
            <SkeletonDetail />
          ) : state.error ? (
            <Alert tone="danger">{state.error}</Alert>
          ) : state.items.length === 0 ? (
            <p className={styles.emptyText}>Nenhum ajuste registrado para esta comissão.</p>
          ) : (
            <ul className={styles.list}>
              {state.items.map((adj, idx) => (
                <li key={idx} className={styles.listRow}>
                  <div className={styles.listRowInfo}>
                    <span className={styles.listRowTitle}>{adj.adjustmentType === "CANCELLATION_REVERSAL" ? "Cancelamento" : adj.adjustmentType}</span>
                    <span className={styles.listRowSubtitle}>
                      Já pago {formatBRL(adj.paidAmountBefore)} de {formatBRL(adj.totalAmountBefore)} · Ajuste de {formatBRL(adj.adjustmentAmount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </Modal>
  );
}

// GAP REAL CORRIGIDO: Caderno §12 — "extrato do proprietário mostra composição, não apenas
// valor líquido". getOwnerRepasseComposition existia no backend, sem nenhuma tela.
function CompositionModal({ state, onClose }) {
  const open = Boolean(state);
  const repasse = state?.repasse;
  return (
    <Modal open={open} onClose={onClose} title="Composição do repasse">
      {repasse ? (
        <>
          <p className={styles.modalSubtitle}>
            Ref. {formatCompetence(repasse.referenceMonth)} · Líquido {formatBRL(repasse.netAmount)}
          </p>
          {state.loading ? (
            <SkeletonDetail />
          ) : state.error ? (
            <Alert tone="danger">{state.error}</Alert>
          ) : !state.data?.composition?.length ? (
            <p className={styles.emptyText}>Nenhum lançamento-fonte registrado para este repasse.</p>
          ) : (
            <>
              <ul className={styles.list}>
                {state.data.composition.map((src, idx) => (
                  <li key={idx} className={styles.listRow}>
                    <div className={styles.listRowInfo}>
                      <span className={styles.listRowTitle}>{humanizeText(src.description) || "Recebimento"}</span>
                      <span className={styles.listRowSubtitle}>Valor elegível: {formatBRL(src.eligibleAmount ?? src.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className={styles.modalSubtitle}>
                Valor elegível total: <strong>{formatBRL(state.data.eligibleAmount)}</strong>
                {state.data.formalAdjustment ? ` · Ajuste formal: ${formatBRL(state.data.formalAdjustment)}` : ""}
              </p>
            </>
          )}
        </>
      ) : null}
    </Modal>
  );
}
