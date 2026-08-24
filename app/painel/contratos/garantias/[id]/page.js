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
  GUARANTEES,
  CONTRACTS,
  GUARANTEE_TYPE_LABELS,
  GUARANTEE_TYPE_ICON,
  GUARANTEE_STATUS_LABELS,
  GUARANTEE_STATUS_TONE,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
} from "@/lib/mock/legal";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

function personOf(id) {
  return PEOPLE.find((p) => p.id === id) || null;
}

export default function GarantiaDetailPage({ params }) {
  const router = useRouter();
  const source = GUARANTEES.find((g) => g.id === params.id);
  const [guarantee, setGuarantee] = useState(() => (source ? { ...source } : null));
  const [notice, setNotice] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!source || !guarantee) return notFound();

  const contract = CONTRACTS.find((c) => c.id === guarantee.contractId) || null;
  const guarantor = guarantee.guarantorPersonId ? personOf(guarantee.guarantorPersonId) : null;

  function handleDelete() {
    setDeleteOpen(false);
    // Mock: em produção isto chamaria DELETE /v1/legal/guarantees/:id (guarantees.service.js)
    router.push("/painel/contratos/garantias");
  }

  return (
    <AppShell title={GUARANTEE_TYPE_LABELS[guarantee.guaranteeType]} backHref="/painel/contratos/garantias">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={GUARANTEE_STATUS_TONE[guarantee.status]}>{GUARANTEE_STATUS_LABELS[guarantee.status]}</Badge>
            {contract ? <Badge tone={CONTRACT_STATUS_TONE[contract.status]}>{CONTRACT_STATUS_LABELS[contract.status]}</Badge> : null}
          </div>
          <RowActions
            onView={() => setNotice({ tone: "info", text: "Você já está vendo os detalhes desta garantia." })}
            onEdit={() => setNotice({ tone: "info", text: "Edição de garantias ainda não implementada nesta versão." })}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>

        {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Detalhes da garantia">
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Tipo</dt><dd className={styles.typeCell}><Icon name={GUARANTEE_TYPE_ICON[guarantee.guaranteeType]} size={16} /> {GUARANTEE_TYPE_LABELS[guarantee.guaranteeType]}</dd></div>
                <div className={styles.detailRow}><dt>Fiador</dt><dd>{guarantor?.legalName || "—"}</dd></div>
                <div className={styles.detailRow}><dt>Valor</dt><dd className={styles.amount}>{guarantee.value != null ? formatBRL(guarantee.value) : "—"}</dd></div>
                <div className={styles.detailRow}><dt>Início de vigência</dt><dd>{guarantee.startsAt ? formatDate(guarantee.startsAt) : "—"}</dd></div>
                <div className={styles.detailRow}><dt>Fim de vigência</dt><dd>{guarantee.endsAt ? formatDate(guarantee.endsAt) : "—"}</dd></div>
                <div className={styles.detailRow}><dt>Versão de bloqueio (lock_version)</dt><dd>{guarantee.lockVersion}</dd></div>
                <div className={styles.detailRow}><dt>ID</dt><dd className={styles.mono}>{guarantee.id}</dd></div>
              </dl>
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card title="Contrato vinculado">
              {contract ? (
                <div className={styles.linkRow} onClick={() => router.push(`/painel/contratos/lista/${contract.id}`)}>
                  <div className={styles.linkInfo}>
                    <span className={styles.linkTitle}>{contract.contractNumber}</span>
                    <span className={styles.linkSub}>{formatBRL(contract.totalValue)}</span>
                  </div>
                  <Icon name="chevronRight" size={16} />
                </div>
              ) : (
                <p className={styles.emptyText}>Sem contrato vinculado.</p>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir garantia"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir a garantia <strong>{GUARANTEE_TYPE_LABELS[guarantee.guaranteeType]}</strong> do contrato <strong>{contract?.contractNumber || "—"}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
