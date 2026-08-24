"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
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
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import Pagination from "@/components/molecules/Pagination/Pagination";
import {
  REQUIRED_STEPS_BY_RISK,
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_TONE,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_TONE,
} from "@/lib/mock/finance";
import { listApprovalRequests, decideApprovalStep } from "@/lib/api/finance";
import { apiFetch } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/session";
import { entityTypeLabel, approvalRequestLabel } from "@/lib/finance/labels";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

const ENTITY_ICON = {
  BankAccount: "money",
  FinancialEntry: "document",
  Commission: "chart",
  CommissionInstallment: "chart",
  OwnerRepass: "layers",
};

function userName(users, id) {
  return users.find((u) => u.id === id)?.name || "—";
}

export default function AprovacoesPage() {
  const currentUser = getCurrentUser();
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listApprovalRequests(), apiFetch("/users")])
      .then(([ar, us]) => {
        if (cancelled) return;
        setApprovalRequests(ar || []);
        setUsers(us || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar as aprovações.");
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

  async function handleDecide(request, decision) {
    // Trava de maker-checker aplicada no front por UX imediata — a API também recusa
    // (FINANCE_APPROVAL_SELF_APPROVAL_FORBIDDEN) então o erro real sempre vem dela.
    if (request.requestedByUserId === currentUser?.id) {
      showNotice("danger", "Auto-aprovação bloqueada", "Você não pode aprovar/rejeitar uma solicitação que você mesmo criou (segregação de funções).");
      return;
    }
    setBusyId(request.id);
    try {
      const result = await decideApprovalStep(request.id, { decision });
      const updated = result.approvalRequest || result;
      setApprovalRequests((prev) => prev.map((r) => (r.id === request.id ? updated : r)));
      if (decision === "REJECTED") showNotice("info", "Solicitação rejeitada", approvalRequestLabel(request));
      else showNotice("success", updated.status === "APPROVED" ? "Aprovado" : "Aprovação registrada", approvalRequestLabel(request));
    } catch (err) {
      showNotice("danger", "Não foi possível decidir", err?.message || "Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    return approvalRequests.filter((r) => {
      if (query && !approvalRequestLabel(r).toLowerCase().includes(query.toLowerCase())) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    });
  }, [approvalRequests, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pendingApprovals = useMemo(() => approvalRequests.filter((r) => r.status === "PENDING"), [approvalRequests]);
  const approvedCount = approvalRequests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = approvalRequests.filter((r) => r.status === "REJECTED").length;
  const highRiskPending = pendingApprovals.filter((r) => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL").length;

  const byRisk = useMemo(() => {
    const counts = {};
    approvalRequests.forEach((r) => { counts[r.riskLevel] = (counts[r.riskLevel] || 0) + 1; });
    return Object.entries(counts).map(([risk, value]) => ({ label: RISK_LEVEL_LABELS[risk] || risk, value }));
  }, [approvalRequests]);

  const byStatus = useMemo(() => {
    const counts = {};
    approvalRequests.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({
      label: APPROVAL_STATUS_LABELS[status] || status,
      value,
      color: status === "APPROVED" ? "var(--color-success)" : status === "REJECTED" ? "var(--color-danger)" : "var(--color-warning)",
    }));
  }, [approvalRequests]);

  return (
    <AppShell title="Aprovações" backHref="/painel/financeiro">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar as aprovações">{loadError}</Alert> : null}
      {notice ? <Alert tone={notice.tone} title={notice.title} className={styles.notice}>{notice.message}</Alert> : null}

      {loading ? (
        <Spinner size="lg" />
      ) : (
        <>
          <div className={styles.grid}>
            <StatTile label="Pendentes" value={pendingApprovals.length} tone={pendingApprovals.length > 0 ? "warning" : "success"} icon="shield" />
            <StatTile label="Alto risco pendente" value={highRiskPending} tone={highRiskPending > 0 ? "danger" : "success"} icon="shield" />
            <StatTile label="Aprovadas" value={approvedCount} tone="success" icon="check" />
            <StatTile label="Rejeitadas" value={rejectedCount} tone={rejectedCount > 0 ? "danger" : "neutral"} icon="document" />
          </div>

          <div className={styles.layout}>
            <Card title="Aprovações (maker-checker)" subtitle="Quem solicita não pode aprovar a própria solicitação" className={styles.listCard}>
              <div className={styles.toolbar}>
                <SearchInput placeholder="Buscar solicitação..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
                <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="">Todos os status</option>
                  {Object.entries(APPROVAL_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </div>

              {filtered.length === 0 ? (
                <p className={styles.emptyText}>Nenhuma solicitação encontrada.</p>
              ) : (
                <ul className={styles.list}>
                  {pageItems.map((r) => {
                    const required = REQUIRED_STEPS_BY_RISK[r.riskLevel] || 1;
                    const isRequester = r.requestedByUserId === currentUser?.id;
                    return (
                      <li key={r.id} className={styles.approvalRow}>
                        <span className={styles.entityIconSlot}>
                          <Icon name={ENTITY_ICON[r.relatedEntityType] || "document"} size={16} />
                        </span>
                        <div className={styles.listRowInfo}>
                          <span className={styles.listRowTitle}>{approvalRequestLabel(r)}</span>
                          <span className={styles.listRowSubtitle}>
                            {entityTypeLabel(r.relatedEntityType)} · Solicitado em {formatDate(r.createdAt || r.created_at)}
                          </span>
                        </div>
                        <div className={styles.requesterCell}>
                          <Avatar name={userName(users, r.requestedByUserId)} size="sm" />
                          <span className={styles.requesterName}>{userName(users, r.requestedByUserId)}</span>
                        </div>
                        <div className={styles.approvalRight}>
                          <Badge tone={RISK_LEVEL_TONE[r.riskLevel]}>Risco {RISK_LEVEL_LABELS[r.riskLevel]}</Badge>
                          <Badge tone={APPROVAL_STATUS_TONE[r.status]}>{APPROVAL_STATUS_LABELS[r.status]}</Badge>
                          {r.status === "PENDING" ? (
                            isRequester ? (
                              <span className={styles.selfBlockNote}>Você solicitou — não pode decidir</span>
                            ) : (
                              <>
                                <Button size="sm" onClick={() => handleDecide(r, "APPROVED")} loading={busyId === r.id}>Aprovar</Button>
                                <Button size="sm" variant="secondary" onClick={() => handleDecide(r, "REJECTED")} loading={busyId === r.id}>Rejeitar</Button>
                              </>
                            )
                          ) : null}
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

            <div className={styles.sidebar}>
              <Card title="Por nível de risco" subtitle="Troque o tipo de gráfico">
                <SwitchableChart items={byRisk} defaultType="column" />
              </Card>
              <Card title="Por status" subtitle="Troque o tipo de gráfico">
                <SwitchableChart items={byStatus} defaultType="donut" />
              </Card>
            </div>
          </div>
        </>
      )}

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
