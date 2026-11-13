"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Select from "@/components/atoms/Select/Select";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Icon from "@/components/atoms/Icon/Icon";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Modal from "@/components/organisms/Modal/Modal";
import Pagination from "@/components/molecules/Pagination/Pagination";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listPeople } from "@/lib/api/people";
import { listContracts, listGuarantees, deleteGuarantee } from "@/lib/api/legal";
import {
  GUARANTEE_TYPES,
  GUARANTEE_TYPE_LABELS,
  GUARANTEE_TYPE_ICON,
  GUARANTEE_STATUS_LABELS,
  GUARANTEE_STATUS_TONE,
  normalizeGuaranteeType,
} from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatBRL, formatDate, formatContractLabel } from "@/lib/format";
import styles from "./page.module.css";

export default function GarantiasPage() {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  // M9-D940: carregando, vazio, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  const listQuery = useAsyncState(async () => {
    const [guaranteesRes, contractsRes, peopleRes] = await Promise.all([listGuarantees(), listContracts(), listPeople()]);
    return { guarantees: guaranteesRes || [], contracts: contractsRes || [], people: peopleRes || [] };
  }, { key: "contratos-garantias", isEmpty: (d) => !d || d.guarantees.length === 0 });
  const loaded = listQuery.data;
  const guarantees = useMemo(() => loaded?.guarantees || [], [loaded]);
  const contracts = useMemo(() => loaded?.contracts || [], [loaded]);
  const people = useMemo(() => loaded?.people || [], [loaded]);

  function contractOf(id) {
    return contracts.find((c) => c.id === id) || null;
  }

  function personOf(id) {
    return people.find((p) => p.id === id) || null;
  }

  const filtered = useMemo(() => {
    return guarantees.filter((g) => {
      const contract = contractOf(g.contractId);
      if (query && !formatContractLabel(contract).toLowerCase().includes(query.toLowerCase())) return false;
      if (typeFilter && normalizeGuaranteeType(g.guaranteeType) !== typeFilter) return false;
      return true;
    });
  }, [guarantees, contracts, query, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleDelete() {
    setActionError("");
    try {
      await deleteGuarantee(deleteTarget.id);
      listQuery.reload();
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao excluir garantia."));
    } finally {
      setDeleteTarget(null);
    }
  }

  const activeCount = guarantees.filter((g) => g.status === "ACTIVE").length;
  const pendingCount = guarantees.filter((g) => g.status === "PENDING").length;
  const totalValue = guarantees.reduce((s, g) => s + Number(g.value || 0), 0);

  return (
    <AppShell title="Garantias" backHref="/painel/contratos">
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <div className={styles.grid}>
        <StatTile label="Total de garantias" value={guarantees.length} tone="neutral" icon="shield" />
        <StatTile label="Ativas" value={activeCount} tone="success" icon="check" />
        <StatTile label="Pendentes (faltam dados)" value={pendingCount} tone="warning" icon="clock" />
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
            {GUARANTEE_TYPES.map((k) => (
              <option key={k} value={k}>{GUARANTEE_TYPE_LABELS[k]}</option>
            ))}
          </Select>
        </div>

        <AsyncState result={listQuery} loadingLabel="Carregando garantias..." emptyTitle="Nenhuma garantia cadastrada" emptyDescription="Cadastre a primeira garantia de um contrato." emptyAction={{ label: "Nova garantia", href: "/painel/contratos/garantias/novo" }}>
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
                    <span className={styles.guaranteeIcon}><Icon name={GUARANTEE_TYPE_ICON[normalizeGuaranteeType(g.guaranteeType)]} size={20} /></span>
                    <div className={styles.guaranteeTitleBlock}>
                      <span className={styles.guaranteeTitle}>{GUARANTEE_TYPE_LABELS[normalizeGuaranteeType(g.guaranteeType)]}</span>
                      <span className={styles.guaranteeSub}>{contract ? formatContractLabel(contract) : "Contrato não encontrado"}</span>
                    </div>
                    <Badge tone={GUARANTEE_STATUS_TONE[g.status] || "neutral"}>{GUARANTEE_STATUS_LABELS[g.status] || "Situação desconhecida"}</Badge>
                  </div>
                  <div className={styles.guaranteeMeta}>
                    {guarantor ? (
                      <div className={styles.guaranteeMetaRow}><span>Fiador</span><strong>{guarantor.legalName}</strong></div>
                    ) : null}
                    {g.replacedByGuaranteeId ? (
                      <div className={styles.guaranteeMetaRow}><span>Histórico</span><strong>Substituída por outra garantia</strong></div>
                    ) : null}
                    {g.value != null ? (
                      <div className={styles.guaranteeMetaRow}><span>Valor</span><strong>{formatBRL(g.value)}</strong></div>
                    ) : null}
                    <div className={styles.guaranteeMetaRow}>
                      <span>Vigência</span>
                      <strong>{g.startsAt ? `${formatDate(g.startsAt)} — ${g.endsAt ? formatDate(g.endsAt) : "indeterminado"}` : "Sem vigência definida"}</strong>
                    </div>
                  </div>
                  <div className={styles.guaranteeActions}>
                    <RowActions
                      onView={() => router.push(`/painel/contratos/garantias/${g.id}`)}
                      onEdit={g.replacedByGuaranteeId ? undefined : () => router.push(`/painel/contratos/garantias/${g.id}`)}
                      onDelete={g.replacedByGuaranteeId ? undefined : () => setDeleteTarget(g)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </AsyncState>
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
        <p>Tem certeza que deseja excluir a garantia <strong>{deleteTarget ? GUARANTEE_TYPE_LABELS[deleteTarget.guaranteeType] : ""}</strong> do contrato <strong>{formatContractLabel(contractOf(deleteTarget?.contractId)) || "Contrato sem identificação"}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
