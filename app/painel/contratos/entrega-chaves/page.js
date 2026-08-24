"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Icon from "@/components/atoms/Icon/Icon";
import Select from "@/components/atoms/Select/Select";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Modal from "@/components/organisms/Modal/Modal";
import Pagination from "@/components/molecules/Pagination/Pagination";
import { PEOPLE } from "@/lib/mock/people";
import {
  KEY_DELIVERIES,
  CONTRACTS,
  INSPECTIONS,
  KEY_DELIVERY_STATUS_LABELS,
  KEY_DELIVERY_STATUS_TONE,
  keyDeliveryBlockReason,
} from "@/lib/mock/legal";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

function personOf(id) {
  return PEOPLE.find((p) => p.id === id) || null;
}

function contractOf(id) {
  return CONTRACTS.find((c) => c.id === id) || null;
}

function inspectionOf(id) {
  return INSPECTIONS.find((i) => i.id === id) || null;
}

export default function EntregaChavesPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState(KEY_DELIVERIES);
  const [blocked, setBlocked] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  function handleDelete() {
    setDeliveries((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  const totalPages = Math.max(1, Math.ceil(deliveries.length / pageSize));
  const pageItems = deliveries.slice((page - 1) * pageSize, page * pageSize);

  const pendingCount = deliveries.filter((d) => d.status === "PENDING").length;
  const releasedCount = deliveries.filter((d) => d.status === "RELEASED").length;

  function handleRelease(delivery) {
    const contract = contractOf(delivery.contractId);
    const inspection = delivery.inspectionId ? inspectionOf(delivery.inspectionId) : null;
    const reason = keyDeliveryBlockReason(delivery, contract, inspection);
    if (reason) {
      setBlocked((prev) => ({ ...prev, [delivery.id]: reason }));
      return;
    }
    setBlocked((prev) => ({ ...prev, [delivery.id]: null }));
    setDeliveries((prev) =>
      prev.map((d) => (d.id === delivery.id ? { ...d, status: "RELEASED", deliveredAt: new Date().toISOString() } : d))
    );
  }

  return (
    <AppShell title="Entrega de chaves" backHref="/painel/contratos">
      <div className={styles.grid}>
        <StatTile label="Entregas registradas" value={deliveries.length} tone="neutral" icon="key" />
        <StatTile label="Pendentes" value={pendingCount} tone={pendingCount > 0 ? "warning" : "success"} icon="calendar" />
        <StatTile label="Liberadas" value={releasedCount} tone="success" icon="check" />
        <StatTile label="Travas ativas" value={deliveries.filter((d) => keyDeliveryBlockReason(d, contractOf(d.contractId), d.inspectionId ? inspectionOf(d.inspectionId) : null) && d.status === "PENDING").length} tone="danger" icon="shield" />
      </div>

      <Card title="Entregas de chave" subtitle="A liberação só é permitida com contrato SIGNED/ACTIVE e vistoria de entrada concluída">
        <div className={styles.list}>
          {pageItems.map((delivery) => {
            const contract = contractOf(delivery.contractId);
            const inspection = delivery.inspectionId ? inspectionOf(delivery.inspectionId) : null;
            const person = personOf(delivery.deliveredToPersonId);
            const reason = blocked[delivery.id];
            return (
              <div key={delivery.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowTitle}>{contract?.contractNumber || "—"}</span>
                  <span className={styles.rowSub}>Para {person?.legalName || "—"}{delivery.deliveredAt ? ` · entregue em ${formatDateTime(delivery.deliveredAt)}` : ""}</span>
                </div>
                <div className={styles.rowRight}>
                  <Badge tone={KEY_DELIVERY_STATUS_TONE[delivery.status]}>{KEY_DELIVERY_STATUS_LABELS[delivery.status]}</Badge>
                  {delivery.status === "PENDING" ? (
                    <Button size="sm" onClick={() => handleRelease(delivery)}>
                      <Icon name="key" size={16} /> Liberar chaves
                    </Button>
                  ) : null}
                  <RowActions
                    onView={() => router.push(`/painel/contratos/entrega-chaves/${delivery.id}`)}
                    onEdit={() => router.push(`/painel/contratos/entrega-chaves/${delivery.id}`)}
                    onDelete={() => setDeleteTarget(delivery)}
                  />
                </div>
                {reason ? (
                  <div className={styles.alertWrap}>
                    <Alert tone="danger" title="Liberação bloqueada">{reason}</Alert>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
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
        <Button href="/painel/contratos/entrega-chaves/novo">
          <Icon name="key" size={18} /> Nova entrega
        </Button>
      </StickyActionBar>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir entrega de chaves"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir esta entrega de chaves do contrato <strong>{contractOf(deleteTarget?.contractId)?.contractNumber || "—"}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
