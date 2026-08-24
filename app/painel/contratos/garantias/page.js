"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Select from "@/components/atoms/Select/Select";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Icon from "@/components/atoms/Icon/Icon";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Modal from "@/components/organisms/Modal/Modal";
import Pagination from "@/components/molecules/Pagination/Pagination";
import { PEOPLE } from "@/lib/mock/people";
import {
  CONTRACTS,
  GUARANTEES,
  GUARANTEE_TYPE_LABELS,
  GUARANTEE_TYPE_ICON,
  GUARANTEE_STATUS_LABELS,
  GUARANTEE_STATUS_TONE,
} from "@/lib/mock/legal";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

function contractOf(id) {
  return CONTRACTS.find((c) => c.id === id) || null;
}

function personOf(id) {
  return PEOPLE.find((p) => p.id === id) || null;
}

export default function GarantiasPage() {
  const router = useRouter();
  const [guarantees, setGuarantees] = useState(GUARANTEES);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const filtered = useMemo(() => {
    return guarantees.filter((g) => {
      const contract = contractOf(g.contractId);
      if (query && !`${contract?.contractNumber || ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (typeFilter && g.guaranteeType !== typeFilter) return false;
      return true;
    });
  }, [guarantees, query, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function handleDelete() {
    setGuarantees((prev) => prev.filter((g) => g.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  const activeCount = guarantees.filter((g) => g.status === "ACTIVE").length;
  const totalValue = guarantees.reduce((s, g) => s + Number(g.value || 0), 0);

  return (
    <AppShell title="Garantias" backHref="/painel/contratos">
      <div className={styles.grid}>
        <StatTile label="Total de garantias" value={guarantees.length} tone="neutral" icon="shield" />
        <StatTile label="Ativas" value={activeCount} tone="success" icon="check" />
        <StatTile label="Valor em depósitos/seguros" value={formatBRL(totalValue)} tone="info" icon="money" />
        <StatTile label="Com fiador" value={guarantees.filter((g) => g.guaranteeType === "GUARANTOR").length} tone="neutral" icon="users" />
      </div>

      <Card title="Garantias por contrato" subtitle="Fiador, seguro-fiança, caução e título de capitalização">
        <div className={styles.toolbar}>
          <SearchInput
            placeholder="Buscar por número de contrato..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
          <Select className={styles.filter} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="">Todos os tipos</option>
            {Object.entries(GUARANTEE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className={styles.emptyText}>Nenhuma garantia encontrada.</p>
        ) : (
          <div className={styles.cardsGrid}>
            {pageItems.map((g) => {
              const contract = contractOf(g.contractId);
              const guarantor = g.guarantorPersonId ? personOf(g.guarantorPersonId) : null;
              return (
                <div key={g.id} className={styles.guaranteeCard}>
                  <div className={styles.guaranteeHead}>
                    <span className={styles.guaranteeIcon}><Icon name={GUARANTEE_TYPE_ICON[g.guaranteeType]} size={20} /></span>
                    <div className={styles.guaranteeTitleBlock}>
                      <span className={styles.guaranteeTitle}>{GUARANTEE_TYPE_LABELS[g.guaranteeType]}</span>
                      <span className={styles.guaranteeSub}>{contract?.contractNumber || "—"}</span>
                    </div>
                    <Badge tone={GUARANTEE_STATUS_TONE[g.status]}>{GUARANTEE_STATUS_LABELS[g.status]}</Badge>
                  </div>
                  <div className={styles.guaranteeMeta}>
                    {guarantor ? (
                      <div className={styles.guaranteeMetaRow}><span>Fiador</span><strong>{guarantor.legalName}</strong></div>
                    ) : null}
                    {g.value != null ? (
                      <div className={styles.guaranteeMetaRow}><span>Valor</span><strong>{formatBRL(g.value)}</strong></div>
                    ) : null}
                    <div className={styles.guaranteeMetaRow}>
                      <span>Vigência</span>
                      <strong>{g.startsAt ? `${formatDate(g.startsAt)} — ${g.endsAt ? formatDate(g.endsAt) : "indeterminado"}` : "—"}</strong>
                    </div>
                  </div>
                  <div className={styles.guaranteeActions}>
                    <RowActions
                      onView={() => router.push(`/painel/contratos/garantias/${g.id}`)}
                      onEdit={() => router.push(`/painel/contratos/garantias/${g.id}`)}
                      onDelete={() => setDeleteTarget(g)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
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

      <StickyActionBar>
        <ContractsNavMenu />
        <Button href="/painel/contratos/garantias/novo">
          <Icon name="shield" size={18} /> Nova garantia
        </Button>
      </StickyActionBar>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir garantia"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir a garantia <strong>{deleteTarget ? GUARANTEE_TYPE_LABELS[deleteTarget.guaranteeType] : ""}</strong> do contrato <strong>{contractOf(deleteTarget?.contractId)?.contractNumber || "—"}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
