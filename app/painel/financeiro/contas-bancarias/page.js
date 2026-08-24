"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Select from "@/components/atoms/Select/Select";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import StatTile from "@/components/molecules/StatTile/StatTile";
import PieChart from "@/components/molecules/PieChart/PieChart";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Modal from "@/components/organisms/Modal/Modal";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import Pagination from "@/components/molecules/Pagination/Pagination";
import {
  BANK_ACCOUNT_STATUS_LABELS,
  BANK_ACCOUNT_STATUS_TONE,
  bankAccountCooldownRemainingHours,
} from "@/lib/mock/finance";
import { getBankName } from "@/lib/mock/banks";
import { maskAccountNumber } from "@/lib/mask";
import { listBankAccounts } from "@/lib/api/finance";
import { listPeople } from "@/lib/api/people";
import { bankAccountLabel } from "@/lib/finance/labels";
import styles from "./page.module.css";

export default function ContasBancariasPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listBankAccounts(), listPeople()])
      .then(([ba, pp]) => {
        if (cancelled) return;
        setAccounts(ba || []);
        setPeople(pp || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar as contas bancárias.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function personName(id) {
    if (!id) return "Conta operacional";
    return people.find((p) => p.id === id)?.legalName || "Conta operacional";
  }

  const filtered = useMemo(
    () => accounts.filter((a) => bankAccountLabel(a, personName(a.ownerPersonId)).toLowerCase().includes(query.toLowerCase())),
    [accounts, query, people]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Não há endpoint de exclusão definitiva usado no fluxo normal (deleteBankAccount existe na
  // API, mas a operação sensível padrão para desativar uma conta é bloquear, não apagar).
  async function handleDelete() {
    setActionError("Use \"Bloquear\" na ficha da conta para desativá-la — exclusão definitiva não é o fluxo recomendado aqui.");
    setDeleteTarget(null);
  }

  const activeCount = accounts.filter((a) => a.status === "ACTIVE").length;
  const cooldownCount = accounts.filter((a) => a.status === "PENDING_COOLDOWN").length;
  const blockedCount = accounts.filter((a) => a.status === "BLOCKED").length;
  const cooldownAccounts = accounts.filter((a) => a.status === "PENDING_COOLDOWN");
  const withOwnerCount = accounts.filter((a) => a.ownerPersonId).length;

  const byStatus = useMemo(
    () => [
      { label: "Ativas", value: activeCount, color: "var(--color-success)" },
      { label: "Em resfriamento", value: cooldownCount, color: "var(--color-warning)" },
      { label: "Bloqueadas", value: blockedCount, color: "var(--color-danger)" },
    ].filter((i) => i.value > 0),
    [activeCount, cooldownCount, blockedCount]
  );

  const columns = [
    {
      key: "label",
      label: "Conta",
      render: (row) => (
        <div className={styles.bankCell}>
          <span className={styles.bankIconSlot}>
            <BankLogo bankCode={row.bankCode} size={32} square />
          </span>
          <div className={styles.nameCell}>
            <span className={styles.nameMain}>{bankAccountLabel(row, personName(row.ownerPersonId))}</span>
            <span className={styles.nameSub}>
              {row.bankCode ? `${getBankName(row.bankCode)} · Ag. ${row.agency} · Conta ${maskAccountNumber(row.accountNumber)}` : "Chave PIX"} · {personName(row.ownerPersonId)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const remaining = bankAccountCooldownRemainingHours({ ...row, updatedAt: row.updatedAt || row.updated_at });
        return (
          <div className={styles.statusCell}>
            <Badge tone={BANK_ACCOUNT_STATUS_TONE[row.status]}>{BANK_ACCOUNT_STATUS_LABELS[row.status]}</Badge>
            {row.status === "PENDING_COOLDOWN" ? <span className={styles.cooldownText}>{remaining}h restantes</span> : null}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <RowActions
          onView={() => router.push(`/painel/financeiro/contas-bancarias/${row.id}`)}
          onEdit={() => router.push(`/painel/financeiro/contas-bancarias/${row.id}`)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <AppShell title="Contas bancárias" backHref="/painel/financeiro">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar as contas bancárias">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      {loading ? (
        <Spinner size="lg" />
      ) : (
        <>
          <div className={styles.grid}>
            <StatTile label="Ativas" value={activeCount} tone="success" icon="check" />
            <StatTile label="Em resfriamento" value={cooldownCount} tone="warning" icon="calendar" />
            <StatTile label="Bloqueadas" value={blockedCount} tone={blockedCount > 0 ? "danger" : "neutral"} icon="shield" />
            <StatTile label="Vinculadas a proprietário" value={withOwnerCount} tone="neutral" icon="money" />
          </div>

          <div className={styles.layout}>
            <Card
              title="Contas bancárias"
              subtitle="Contas novas ou com dado sensível alterado nascem em resfriamento por 48h (antifraude)"
              className={styles.tableCard}
            >
              <div className={styles.filters}>
                <SearchInput placeholder="Buscar por nome da conta..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
              </div>
              <Table columns={columns} rows={pageItems} emptyMessage="Nenhuma conta encontrada." />
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
              <Card title="Distribuição por status" subtitle="Rosca">
                <PieChart items={byStatus} donut />
              </Card>
              <Card title="Em resfriamento" subtitle={`${cooldownAccounts.length} conta(s) aguardando liberação`}>
                {cooldownAccounts.length === 0 ? (
                  <p className={styles.emptyText}>Nenhuma conta em resfriamento no momento.</p>
                ) : (
                  <ul className={styles.sideList}>
                    {cooldownAccounts.map((a) => (
                      <li key={a.id} className={styles.sideListRow}>
                        <Icon name="calendar" size={14} />
                        <span className={styles.sideListLabel}>{bankAccountLabel(a, personName(a.ownerPersonId))}</span>
                        <strong className={styles.sideListValue}>{bankAccountCooldownRemainingHours({ ...a, updatedAt: a.updatedAt || a.updated_at })}h</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      <StickyActionBar>
        <FinanceNavMenu />
        <Button href="/painel/financeiro/contas-bancarias/novo">
          <Icon name="money" size={18} /> Nova conta
        </Button>
      </StickyActionBar>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir conta bancária"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir <strong>{deleteTarget ? bankAccountLabel(deleteTarget, personName(deleteTarget.ownerPersonId)) : ""}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
