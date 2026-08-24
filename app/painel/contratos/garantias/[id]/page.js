"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import { listPeople } from "@/lib/api/people";
import { getGuarantee, getContract, updateGuarantee, deleteGuarantee } from "@/lib/api/legal";
import {
  GUARANTEE_TYPE_LABELS,
  GUARANTEE_TYPE_ICON,
  GUARANTEE_STATUS_LABELS,
  GUARANTEE_STATUS_TONE,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
} from "@/lib/mock/legal";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

const STATUS_OPTIONS = ["ACTIVE", "EXPIRED", "CANCELLED"];

export default function GarantiaDetailPage({ params }) {
  const router = useRouter();
  const [guarantee, setGuarantee] = useState(null);
  const [contract, setContract] = useState(null);
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
    Promise.all([getGuarantee(params.id), listPeople()])
      .then(async ([guaranteeRes, peopleRes]) => {
        if (cancelled) return;
        setGuarantee(guaranteeRes);
        setPeople(peopleRes || []);
        if (guaranteeRes?.contractId) {
          try {
            const c = await getContract(guaranteeRes.contractId);
            if (!cancelled) setContract(c);
          } catch {
            // Contrato pode não existir mais — segue sem vínculo.
          }
        }
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar garantia."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  function personOf(id) {
    return people.find((p) => p.id === id) || null;
  }

  if (loading) {
    return (
      <AppShell title="Garantia" backHref="/painel/contratos/garantias">
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="Garantia" backHref="/painel/contratos/garantias">
        <Alert tone="danger">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!guarantee) return notFound();

  const guarantor = guarantee.guarantorPersonId ? personOf(guarantee.guarantorPersonId) : null;

  async function handleStatusChange(status) {
    setActionError("");
    setBusy(true);
    try {
      const updated = await updateGuarantee(guarantee.id, { status });
      setGuarantee(updated);
      setNotice({ tone: "success", text: `Status atualizado para "${GUARANTEE_STATUS_LABELS[status] || status}".` });
    } catch (err) {
      setActionError(err.message || "Erro ao atualizar status da garantia.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setDeleteOpen(false);
    setActionError("");
    try {
      await deleteGuarantee(guarantee.id);
      router.push("/painel/contratos/garantias");
    } catch (err) {
      setActionError(err.message || "Erro ao excluir garantia.");
    }
  }

  return (
    <AppShell title={GUARANTEE_TYPE_LABELS[guarantee.guaranteeType] || guarantee.guaranteeType} backHref="/painel/contratos/garantias">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={GUARANTEE_STATUS_TONE[guarantee.status] || "neutral"}>{GUARANTEE_STATUS_LABELS[guarantee.status] || guarantee.status}</Badge>
            {contract ? <Badge tone={CONTRACT_STATUS_TONE[contract.status]}>{CONTRACT_STATUS_LABELS[contract.status]}</Badge> : null}
          </div>
          <div className={styles.actions}>
            <Select value={guarantee.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={busy}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{GUARANTEE_STATUS_LABELS[s] || s}</option>
              ))}
            </Select>
            <RowActions
              onView={() => setNotice({ tone: "info", text: "Você já está vendo os detalhes desta garantia." })}
              onDelete={() => setDeleteOpen(true)}
            />
          </div>
        </div>

        {actionError ? <Alert tone="danger" className={styles.notice}>{actionError}</Alert> : null}
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
