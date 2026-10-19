"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Select from "@/components/atoms/Select/Select";
import StatTile from "@/components/molecules/StatTile/StatTile";
import ColumnChart from "@/components/molecules/ColumnChart/ColumnChart";
import PieChart from "@/components/molecules/PieChart/PieChart";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import Pagination from "@/components/molecules/Pagination/Pagination";
import RowActions from "@/components/molecules/RowActions/RowActions";
import NatureBadge from "@/components/molecules/NatureBadge/NatureBadge";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Modal from "@/components/organisms/Modal/Modal";
import {
  ENTRY_NATURE_LABELS,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_TONE,
  isEntryOverdue,
} from "@/lib/mock/finance";
import {
  listFinancialEntries,
  listBankAccounts,
  listCostCenters,
  listClassificationPendings,
  resolveClassificationPending,
} from "@/lib/api/finance";
import FormField from "@/components/molecules/FormField/FormField";
import { listPeople } from "@/lib/api/people";
import { bankAccountLabel } from "@/lib/finance/labels";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default function LancamentosPage() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [natureFilter, setNatureFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  // GAP REAL CORRIGIDO (ciclo de verificação adicional, Marco 4, 12/10/2026): fila de
  // pendências de classificação (M4-contrato §10) existia inteira no backend, sem tela —
  // nenhum humano via nem resolvia um excedente aguardando classificação final.
  const [pendings, setPendings] = useState([]);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveNature, setResolveNature] = useState("");
  // A3 (revisão 18/10/2026): classificar como despesa cria uma obrigação a pagar e exige centro de custo.
  const [resolveCostCenterId, setResolveCostCenterId] = useState("");
  const [resolveBusy, setResolveBusy] = useState(false);
  const [resolveError, setResolveError] = useState("");

  function reloadPendings() {
    listClassificationPendings({ status: "PENDING" })
      .then((items) => setPendings(items || []))
      .catch(() => {});
  }

  async function handleResolvePending() {
    if (!resolveTarget || !resolveNature) return;
    if (resolveNature === "PAYABLE" && !resolveCostCenterId) {
      setResolveError("Classificar como despesa exige o centro de custo.");
      return;
    }
    setResolveBusy(true);
    setResolveError("");
    try {
      await resolveClassificationPending(resolveTarget.id, resolveNature, {
        costCenterId: resolveNature === "PAYABLE" ? resolveCostCenterId : undefined,
      });
      setResolveTarget(null);
      setResolveNature("");
      setResolveCostCenterId("");
      reloadPendings();
    } catch (err) {
      setResolveError(err?.message || "Não foi possível resolver a pendência.");
    } finally {
      setResolveBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listFinancialEntries(), listBankAccounts(), listCostCenters(), listPeople()])
      .then(([e, ba, cc, pp]) => {
        if (cancelled) return;
        setEntries(e || []);
        setBankAccounts(ba || []);
        setCostCenters(cc || []);
        setPeople(pp || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar os lançamentos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    reloadPendings();
    return () => {
      cancelled = true;
    };
  }, []);

  function bankAccountOf(id) {
    return bankAccounts.find((a) => a.id === id) || null;
  }

  function ownerOf(account) {
    if (!account?.ownerPersonId) return null;
    return people.find((p) => p.id === account.ownerPersonId) || null;
  }

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (query && !(e.description || "").toLowerCase().includes(query.toLowerCase())) return false;
      if (natureFilter && e.nature !== natureFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    });
  }, [entries, query, natureFilter, statusFilter]);

  // Não há endpoint de exclusão de lançamento na API (ledger imutável — FIN-003/FIN-010);
  // "excluir" aqui só remove da lista local exibida, sem chamar a API.
  function handleDelete() {
    setActionError("Não é possível excluir um lançamento — o ledger é imutável (use estornar no detalhe).");
    setDeleteTarget(null);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetPage() {
    setPage(1);
  }

  const totalPayable = entries.filter((e) => e.nature === "PAYABLE" && e.status === "PENDING").reduce((s, e) => s + Number(e.amount), 0);
  const totalReceivable = entries.filter((e) => e.nature === "RECEIVABLE" && e.status === "PENDING").reduce((s, e) => s + Number(e.amount), 0);
  const overdueCount = entries.filter(isEntryOverdue).length;
  const settledCount = entries.filter((e) => e.status === "SETTLED").length;
  const overdueEntries = entries.filter(isEntryOverdue);

  const byStatus = useMemo(() => {
    const counts = {};
    entries.forEach((e) => { counts[e.status] = (counts[e.status] || 0) + Number(e.amount); });
    return Object.entries(counts).map(([status, value]) => ({ label: ENTRY_STATUS_LABELS[status] || status, value, displayValue: formatBRL(value) }));
  }, [entries]);

  const byCostCenter = useMemo(() => {
    const counts = {};
    entries.forEach((e) => {
      const cc = costCenters.find((c) => c.id === e.costCenterId);
      const key = cc ? cc.name : "Sem centro";
      counts[key] = (counts[key] || 0) + Number(e.amount);
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value, displayValue: formatBRL(value) }));
  }, [entries, costCenters]);

  const columns = [
    {
      key: "description",
      label: "Lançamento",
      width: "32%",
      render: (row) => {
        const account = bankAccountOf(row.bankAccountId);
        const owner = ownerOf(account);
        return (
          <div className={styles.descCell}>
            <span className={styles.iconStack}>
              <BankLogo bankCode={account?.bankCode} size={30} square />
            </span>
            {owner ? <Avatar name={owner.legalName} size="sm" className={styles.ownerAvatar} /> : null}
            <div className={styles.nameCell}>
              <span className={styles.nameMain} title={row.description}>{row.description}</span>
              <span className={styles.nameSub}>{bankAccountLabel(account, owner?.legalName)}</span>
            </div>
          </div>
        );
      },
    },
    { key: "nature", label: "Natureza", width: "14%", render: (row) => <NatureBadge nature={row.nature} /> },
    { key: "amount", label: "Valor", width: "11%", render: (row) => formatBRL(row.amount) },
    { key: "dueAt", label: "Vencimento", width: "13%", render: (row) => (row.dueAt ? formatDate(row.dueAt) : "—") },
    {
      key: "status",
      label: "Status",
      width: "18%",
      render: (row) => (
        <div className={styles.statusCell}>
          <Badge tone={ENTRY_STATUS_TONE[row.status]}>{ENTRY_STATUS_LABELS[row.status]}</Badge>
          {isEntryOverdue(row) ? <Badge tone="danger">Vencida</Badge> : null}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "12%",
      render: (row) => (
        <RowActions
          onView={() => router.push(`/painel/financeiro/lancamentos/${row.id}`)}
          onEdit={() => router.push(`/painel/financeiro/lancamentos/${row.id}`)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <AppShell title="Lançamentos" backHref="/painel/financeiro">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar os lançamentos">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      {pendings.length > 0 ? (
        <Card
          title="Pendências de classificação"
          subtitle="Excedentes que precisam de um humano decidir a classificação final — nunca automático."
        >
          <ul className={styles.list}>
            {pendings.map((p) => (
              <li key={p.id} className={styles.listRow}>
                <div className={styles.listRowInfo}>
                  <span className={styles.listRowTitle}>{p.description}</span>
                  <span className={styles.listRowSubtitle}>{formatBRL(p.amount)} · desde {formatDate(p.createdAt)}</span>
                </div>
                <Button size="sm" onClick={() => { setResolveTarget(p); setResolveNature(""); setResolveCostCenterId(""); setResolveError(""); }}>
                  Classificar
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <>
          <div className={styles.grid}>
            <StatTile label="A pagar (pendente)" value={formatBRL(totalPayable)} tone="warning" icon="document" />
            <StatTile label="A receber (pendente)" value={formatBRL(totalReceivable)} tone="info" icon="money" />
            <StatTile label="Vencidas" value={overdueCount} tone={overdueCount > 0 ? "danger" : "success"} icon="calendar" />
            <StatTile label="Liquidadas" value={settledCount} tone="success" icon="check" />
          </div>

          <div className={styles.layout}>
            <Card
              title="Contas a pagar e receber"
              subtitle="Ledger — cada correção gera um lançamento de estorno, nunca edita o original (imutabilidade)"
              className={styles.tableCard}
            >
              <div className={styles.toolbar}>
                <SearchInput
                  placeholder="Buscar por descrição..."
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); resetPage(); }}
                />
                <Select className={styles.filter} value={natureFilter} onChange={(e) => { setNatureFilter(e.target.value); resetPage(); }}>
                  <option value="">Todas as naturezas</option>
                  {Object.entries(ENTRY_NATURE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
                <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}>
                  <option value="">Todos os status</option>
                  {Object.entries(ENTRY_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </div>
              <Table columns={columns} rows={loading ? [] : pageItems} loading={loading} emptyMessage="Nenhum lançamento encontrado." />
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

            <div className={styles.sidebar}>
              <Card title="Por status" subtitle="Distribuição em colunas">
                <ColumnChart items={byStatus} />
              </Card>
              <Card title="Por centro de custo" subtitle="Distribuição em pizza">
                <PieChart items={byCostCenter} donut={false} />
              </Card>
              <Card title="Vencidas" subtitle={`${overdueEntries.length} lançamento(s) com vencimento no passado`}>
                {overdueEntries.length === 0 ? (
                  <p className={styles.emptyText}>Nenhuma conta vencida.</p>
                ) : (
                  <ul className={styles.sideList}>
                    {overdueEntries.map((e) => (
                      <li key={e.id} className={styles.sideListRow}>
                        <Icon name="document" size={14} />
                        <span className={styles.sideListLabel}>{e.description}</span>
                        <strong className={styles.sideListValue}>{formatBRL(e.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>

      <StickyActionBar>
        <FinanceNavMenu />
        <Button href="/painel/financeiro/lancamentos/novo">
          <Icon name="document" size={18} /> Novo lançamento
        </Button>
      </StickyActionBar>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir lançamento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir <strong>{deleteTarget?.description}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>

      <Modal
        open={Boolean(resolveTarget)}
        onClose={() => setResolveTarget(null)}
        title="Classificar pendência"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResolveTarget(null)}>Cancelar</Button>
            <Button onClick={handleResolvePending} loading={resolveBusy} disabled={!resolveNature}>Confirmar</Button>
          </>
        }
      >
        {resolveTarget ? (
          <>
            <p>
              {resolveTarget.description} — <strong>{formatBRL(resolveTarget.amount)}</strong>
            </p>
            {resolveError ? <Alert tone="danger">{resolveError}</Alert> : null}
            <FormField label="Classificação final">
              <Select value={resolveNature} onChange={(e) => setResolveNature(e.target.value)}>
                <option value="">Selecione...</option>
                <option value="RECEIVABLE">Receita (RECEIVABLE)</option>
                <option value="PAYABLE">Despesa (PAYABLE)</option>
                <option value="ADJUSTMENT">Ajuste (ADJUSTMENT)</option>
              </Select>
            </FormField>
            {resolveNature === "PAYABLE" ? (
              <>
                <FormField label="Centro de custo" required>
                  <Select value={resolveCostCenterId} onChange={(e) => setResolveCostCenterId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {costCenters.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </Select>
                </FormField>
                <Alert tone="info">
                  Vira uma obrigação a pagar (pendente), que segue o fluxo normal de pagamento: aprovação e confirmação do banco ou comprovante.
                </Alert>
              </>
            ) : null}
          </>
        ) : null}
      </Modal>
    </AppShell>
  );
}
