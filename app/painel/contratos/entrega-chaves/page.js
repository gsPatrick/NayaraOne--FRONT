"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Icon from "@/components/atoms/Icon/Icon";
import Select from "@/components/atoms/Select/Select";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Modal from "@/components/organisms/Modal/Modal";
import Pagination from "@/components/molecules/Pagination/Pagination";
import { listPeople } from "@/lib/api/people";
import { listKeyDeliveries, listContracts, releaseKeyDelivery } from "@/lib/api/legal";
import {
  KEY_DELIVERY_STATUS_LABELS,
  KEY_DELIVERY_STATUS_TONE,
} from "@/lib/mock/legal";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function EntregaChavesPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [releaseError, setReleaseError] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listKeyDeliveries(), listContracts(), listPeople()])
      .then(([deliveriesRes, contractsRes, peopleRes]) => {
        if (cancelled) return;
        setDeliveries(deliveriesRes || []);
        setContracts(contractsRes || []);
        setPeople(peopleRes || []);
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar entregas de chave."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function personOf(id) {
    return people.find((p) => p.id === id) || null;
  }

  function contractOf(id) {
    return contracts.find((c) => c.id === id) || null;
  }

  function handleDelete() {
    setDeleteTarget(null);
  }

  const totalPages = Math.max(1, Math.ceil(deliveries.length / pageSize));
  const pageItems = deliveries.slice((page - 1) * pageSize, page * pageSize);

  const pendingCount = deliveries.filter((d) => d.status === "PENDING").length;
  const releasedCount = deliveries.filter((d) => d.status === "RELEASED").length;

  async function handleRelease(delivery) {
    setReleaseError((prev) => ({ ...prev, [delivery.id]: null }));
    setBusyId(delivery.id);
    try {
      const updated = await releaseKeyDelivery(delivery.id);
      setDeliveries((prev) => prev.map((d) => (d.id === delivery.id ? updated : d)));
    } catch (err) {
      setReleaseError((prev) => ({ ...prev, [delivery.id]: err.message || "Erro ao liberar chaves." }));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <AppShell title="Entrega de chaves" backHref="/painel/contratos">
        <Spinner size="lg" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Entrega de chaves" backHref="/painel/contratos">
      {loadError ? <Alert tone="danger">{loadError}</Alert> : null}

      <div className={styles.grid}>
        <StatTile label="Entregas registradas" value={deliveries.length} tone="neutral" icon="key" />
        <StatTile label="Pendentes" value={pendingCount} tone={pendingCount > 0 ? "warning" : "success"} icon="calendar" />
        <StatTile label="Liberadas" value={releasedCount} tone="success" icon="check" />
        <StatTile label="Travas ativas" value={Object.values(releaseError).filter(Boolean).length} tone="danger" icon="shield" />
      </div>

      <Card title="Entregas de chave" subtitle="A liberação só é permitida com contrato SIGNED/ACTIVE e vistoria de entrada concluída">
        <div className={styles.list}>
          {pageItems.map((delivery) => {
            const contract = contractOf(delivery.contractId);
            const person = personOf(delivery.deliveredToPersonId);
            const reason = releaseError[delivery.id];
            return (
              <div key={delivery.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowTitle}>{contract?.contractNumber || "—"}</span>
                  <span className={styles.rowSub}>Para {person?.legalName || "—"}{delivery.deliveredAt ? ` · entregue em ${formatDateTime(delivery.deliveredAt)}` : ""}</span>
                </div>
                <div className={styles.rowRight}>
                  <Badge tone={KEY_DELIVERY_STATUS_TONE[delivery.status]}>{KEY_DELIVERY_STATUS_LABELS[delivery.status]}</Badge>
                  {delivery.status === "PENDING" ? (
                    <Button size="sm" onClick={() => handleRelease(delivery)} disabled={busyId === delivery.id}>
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
        <p>Não há endpoint de exclusão de entrega de chaves na API — esta ação apenas fecha esta janela.</p>
      </Modal>
    </AppShell>
  );
}
