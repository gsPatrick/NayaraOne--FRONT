"use client";

import { useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import { PEOPLE } from "@/lib/mock/people";
import {
  KEY_DELIVERIES,
  CONTRACTS,
  INSPECTIONS,
  KEY_DELIVERY_STATUS_LABELS,
  KEY_DELIVERY_STATUS_TONE,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONE,
  keyDeliveryBlockReason,
} from "@/lib/mock/legal";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

function personOf(id) {
  return PEOPLE.find((p) => p.id === id) || null;
}

export default function EntregaChavesDetailPage({ params }) {
  const router = useRouter();
  const source = KEY_DELIVERIES.find((d) => d.id === params.id);
  const [delivery, setDelivery] = useState(() => (source ? { ...source } : null));
  const [notice, setNotice] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!source || !delivery) return notFound();

  const contract = CONTRACTS.find((c) => c.id === delivery.contractId) || null;
  const inspection = delivery.inspectionId ? INSPECTIONS.find((i) => i.id === delivery.inspectionId) || null : null;
  const deliveredTo = personOf(delivery.deliveredToPersonId);
  const blockReason = keyDeliveryBlockReason(delivery, contract, inspection);

  function handleRelease() {
    if (blockReason) {
      setNotice({ tone: "danger", text: blockReason });
      return;
    }
    setDelivery((prev) => ({ ...prev, status: "RELEASED", deliveredAt: new Date().toISOString() }));
    setNotice({ tone: "success", text: "Chaves liberadas com sucesso." });
  }

  function handleDelete() {
    setDeleteOpen(false);
    // Mock: em produção isto chamaria DELETE /v1/legal/key-deliveries/:id (keyDeliveries.service.js)
    router.push("/painel/contratos/entrega-chaves");
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
              <Button onClick={handleRelease} disabled={Boolean(blockReason)}>
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

        {blockReason && delivery.status === "PENDING" ? (
          <Alert tone="danger" title="Liberação bloqueada" className={styles.notice}>{blockReason}</Alert>
        ) : null}
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
                <p className={styles.emptyText}>Sem contrato vinculado.</p>
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
                <p className={styles.emptyText}>Sem vistoria de entrada vinculada.</p>
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
        <p>Tem certeza que deseja excluir esta entrega de chaves do contrato <strong>{contract?.contractNumber || "—"}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
