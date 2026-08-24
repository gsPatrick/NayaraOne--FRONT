"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Select from "@/components/atoms/Select/Select";
import StatTile from "@/components/molecules/StatTile/StatTile";
import SwitchableChart from "@/components/molecules/SwitchableChart/SwitchableChart";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import Pagination from "@/components/molecules/Pagination/Pagination";
import {
  APPROVAL_REQUESTS,
  APPROVAL_STEPS,
  REQUIRED_STEPS_BY_RISK,
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_TONE,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_TONE,
} from "@/lib/mock/finance";
import { USERS } from "@/lib/mock/users";
import { getCurrentUser } from "@/lib/mock/session";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

const ENTITY_LABELS = {
  BankAccount: "Conta bancária",
  FinancialEntry: "Lançamento",
  Commission: "Comissão",
  CommissionInstallment: "Parcela de comissão",
  OwnerRepass: "Repasse a proprietário",
};

const ENTITY_ICON = {
  BankAccount: "money",
  FinancialEntry: "document",
  Commission: "chart",
  CommissionInstallment: "chart",
  OwnerRepass: "layers",
};

function userName(id) {
  return USERS.find((u) => u.id === id)?.name || "—";
}

export default function AprovacoesPage() {
  const currentUser = getCurrentUser();
  const [approvalRequests, setApprovalRequests] = useState(APPROVAL_REQUESTS);
  const [approvalSteps, setApprovalSteps] = useState(APPROVAL_STEPS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  function showNotice(tone, title, message) {
    setNotice({ tone, title, message });
    window.clearTimeout(showNotice._t);
    showNotice._t = window.setTimeout(() => setNotice(null), 6000);
  }

  function handleDecide(request, decision) {
    if (request.requestedByUserId === currentUser.id) {
      showNotice("danger", "Auto-aprovação bloqueada", "Você não pode aprovar/rejeitar uma solicitação que você mesmo criou (segregação de funções).");
      return;
    }
    if (approvalSteps.some((s) => s.approvalRequestId === request.id && s.approverUserId === currentUser.id)) {
      showNotice("danger", "Decisão duplicada", "Você já registrou uma decisão para esta solicitação.");
      return;
    }
    const existingSteps = approvalSteps.filter((s) => s.approvalRequestId === request.id);
    const newStep = { id: `as-${Date.now()}`, approvalRequestId: request.id, approverUserId: currentUser.id, stepOrder: existingSteps.length + 1, decision, decidedAt: new Date().toISOString() };
    setApprovalSteps((prev) => [...prev, newStep]);

    if (decision === "REJECTED") {
      setApprovalRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: "REJECTED" } : r)));
      showNotice("info", "Solicitação rejeitada", request.label);
      return;
    }
    const approvedCount = existingSteps.filter((s) => s.decision === "APPROVED").length + 1;
    const required = REQUIRED_STEPS_BY_RISK[request.riskLevel] || 1;
    if (approvedCount >= required) {
      setApprovalRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: "APPROVED" } : r)));
      showNotice("success", "Aprovado", request.label);
    } else {
      showNotice("info", "Aprovação registrada", `Faltam ${required - approvedCount} aprovação(ões) — risco ${RISK_LEVEL_LABELS[request.riskLevel]} exige ${required}.`);
    }
  }

  const filtered = useMemo(() => {
    return approvalRequests.filter((r) => {
      if (query && !r.label.toLowerCase().includes(query.toLowerCase())) return false;
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
      {notice ? <Alert tone={notice.tone} title={notice.title} className={styles.notice}>{notice.message}</Alert> : null}

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
                const steps = approvalSteps.filter((s) => s.approvalRequestId === r.id);
                const required = REQUIRED_STEPS_BY_RISK[r.riskLevel] || 1;
                const isRequester = r.requestedByUserId === currentUser.id;
                return (
                  <li key={r.id} className={styles.approvalRow}>
                    <span className={styles.entityIconSlot}>
                      <Icon name={ENTITY_ICON[r.relatedEntityType] || "document"} size={16} />
                    </span>
                    <div className={styles.listRowInfo}>
                      <span className={styles.listRowTitle}>{r.label}</span>
                      <span className={styles.listRowSubtitle}>
                        {ENTITY_LABELS[r.relatedEntityType]} · Solicitado em {formatDate(r.createdAt)}
                        {steps.length > 0 ? ` · ${steps.filter((s) => s.decision === "APPROVED").length}/${required} aprovações` : ""}
                      </span>
                    </div>
                    <div className={styles.requesterCell}>
                      <Avatar name={userName(r.requestedByUserId)} size="sm" />
                      <span className={styles.requesterName}>{userName(r.requestedByUserId)}</span>
                    </div>
                    <div className={styles.approvalRight}>
                      <Badge tone={RISK_LEVEL_TONE[r.riskLevel]}>Risco {RISK_LEVEL_LABELS[r.riskLevel]}</Badge>
                      <Badge tone={APPROVAL_STATUS_TONE[r.status]}>{APPROVAL_STATUS_LABELS[r.status]}</Badge>
                      {r.status === "PENDING" ? (
                        isRequester ? (
                          <span className={styles.selfBlockNote}>Você solicitou — não pode decidir</span>
                        ) : (
                          <>
                            <Button size="sm" onClick={() => handleDecide(r, "APPROVED")}>Aprovar</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleDecide(r, "REJECTED")}>Rejeitar</Button>
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

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
