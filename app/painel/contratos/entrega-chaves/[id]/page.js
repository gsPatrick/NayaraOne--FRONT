"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import { listPeople } from "@/lib/api/people";
import { getKeyDelivery, getContract, getInspection, releaseKeyDelivery } from "@/lib/api/legal";
import {
  KEY_DELIVERY_STATUS_LABELS,
  KEY_DELIVERY_STATUS_TONE,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONE,
} from "@/lib/mock/legal";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function EntregaChavesDetailPage({ params }) {
  const router = useRouter();
  const [delivery, setDelivery] = useState(null);
  const [contract, setContract] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([getKeyDelivery(params.id), listPeople()])
      .then(async ([deliveryRes, peopleRes]) => {
        if (cancelled) return;
        setDelivery(deliveryRes);
        setPeople(peopleRes || []);
        if (deliveryRes?.contractId) {
          try {
            const c = await getContract(deliveryRes.contractId);
            if (!cancelled) setContract(c);
          } catch {
            // Contrato pode não estar disponível.
          }
        }
        if (deliveryRes?.inspectionId) {
          try {
            const i = await getInspection(deliveryRes.inspectionId);
            if (!cancelled) setInspection(i);
          } catch {
            // Vistoria pode não estar disponível.
          }
        }
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar entrega de chaves."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  function personOf(id) {
    return people.find((p) => p.id === id) || null;
  }

  if (loading) {
    return (
      <AppShell title="Entrega de chaves" backHref="/painel/contratos/entrega-chaves">
        <SkeletonDetail sections={3} />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="Entrega de chaves" backHref="/painel/contratos/entrega-chaves">
        <Alert tone="danger">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!delivery) return notFound();

  const deliveredTo = personOf(delivery.deliveredToPersonId);

  async function handleRelease() {
    setActionError("");
    setBusy(true);
    try {
      const updated = await releaseKeyDelivery(delivery.id);
      setDelivery(updated);
      setNotice({ tone: "success", text: "Chaves liberadas com sucesso." });
    } catch (err) {
      setActionError(err.message || "Erro ao liberar chaves.");
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    setDeleteOpen(false);
  }

  return (
    <AppShell title={contract?.contractNumber || "Entrega de chaves"} backHref="/painel/contratos/entrega-chaves">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={KEY_DELIVERY_STATUS_TONE[delivery.status]}>{KEY_DELIVERY_STATUS_LABELS[delivery.status]}</Badge>
            {contract ? <Badge tone={CONTRACT_STATUS_TONE[contract.status]}>{CONTRACT_STATUS_LABELS[contract.status]}</Badge> : null}
            {inspection ? <Badge tone={INSPECTION_STATUS_TONE[inspection.status]}>Vistoria: {INSPECTION_STATUS_LABELS[inspection.status]}</Badge> : null}
          </div>
          <div className={styles.actionsWrap}>
            {delivery.status === "PENDING" ? (
              <Button onClick={handleRelease} disabled={busy}>
                <Icon name="key" size={16} /> Liberar chaves
              </Button>
            ) : null}
            <RowActions
              onView={() => setNotice({ tone: "info", text: "Você já está vendo os detalhes desta entrega." })}
              onEdit={() => setNotice({ tone: "info", text: "Edição de entregas de chave ainda não implementada nesta versão." })}
              onDelete={() => setDeleteOpen(true)}
            />
          </div>
        </div>

        {actionError ? <Alert tone="danger" title="Liberação bloqueada" className={styles.notice}>{actionError}</Alert> : null}
        {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Detalhes da entrega">
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Entregue para</dt><dd>{deliveredTo?.legalName || "—"}</dd></div>
                <div className={styles.detailRow}><dt>Entregue em</dt><dd>{delivery.deliveredAt ? formatDateTime(delivery.deliveredAt) : "—"}</dd></div>
                <div className={styles.detailRow}><dt>Observações</dt><dd>{delivery.notes || "—"}</dd></div>
                <div className={styles.detailRow}><dt>ID</dt><dd className={styles.mono}>{delivery.id}</dd></div>
              </dl>
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card title="Contrato vinculado">
              {contract ? (
                <div className={styles.linkRow} onClick={() => router.push(`/painel/contratos/lista/${contract.id}`)}>
                  <div className={styles.linkInfo}>
                    <span className={styles.linkTitle}>{contract.contractNumber}</span>
                    <span className={styles.linkSub}>{CONTRACT_STATUS_LABELS[contract.status]}</span>
                  </div>
                  <Icon name="chevronRight" size={16} />
                </div>
              ) : (
                <EmptyState icon="document" title="Sem contrato vinculado" description="Nenhum contrato vinculado a esta entrega de chaves." />
              )}
            </Card>

            <Card title="Vistoria de entrada">
              {inspection ? (
                <div className={styles.linkRow} onClick={() => router.push(`/painel/contratos/vistorias/${inspection.id}`)}>
                  <div className={styles.linkInfo}>
                    <span className={styles.linkTitle}>{inspection.id}</span>
                    <span className={styles.linkSub}>{INSPECTION_STATUS_LABELS[inspection.status]}</span>
                  </div>
                  <Icon name="chevronRight" size={16} />
                </div>
              ) : (
                <EmptyState icon="document" title="Sem vistoria vinculada" description="Nenhuma vistoria de entrada vinculada." />
              )}
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir entrega de chaves"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Não há endpoint de exclusão de entrega de chaves na API — esta ação apenas fecha esta janela.</p>
      </Modal>
    </AppShell>
  );
}
