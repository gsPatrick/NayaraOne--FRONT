"use client";

// Detalhe da garantia (Caderno M5 §9): dados do tipo, o que falta para ativar (com "Completar dados"), trilha da caução
// no Financeiro e substituição sem perder histórico (a antiga fica Liberada e ligada à nova).
import { useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { UI_STATE } from "@/lib/asyncState/states";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { nullOn404 } from "@/lib/asyncState/notFound";
import { lookupFallback } from "@/lib/asyncState/lookup";
import Modal from "@/components/organisms/Modal/Modal";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import { getGuarantee, getContract, updateGuarantee, deleteGuarantee, listGuarantees } from "@/lib/api/legal";
import {
  GUARANTEE_TYPE_LABELS, GUARANTEE_STATUSES, GUARANTEE_STATUS_LABELS, GUARANTEE_STATUS_TONE, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_TONE, normalizeGuaranteeType,
} from "@/lib/labels/juridico";
import { formatBRL, formatContractLabel } from "@/lib/format";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { activatable } from "@/lib/a11y/keyboard";
import GuaranteeDataCard from "./GuaranteeDataCard";
import CompleteGuaranteeCard from "./CompleteGuaranteeCard";
import { useGuaranteeSupport } from "../useGuaranteeSupport";
import styles from "./page.module.css";

export default function GarantiaDetailPage({ params }) {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const support = useGuaranteeSupport();

  // M9-D940: carregando, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  const loadQuery = useAsyncState(async () => {
    const guarantee = await getGuarantee(params.id).catch(nullOn404);
    if (!guarantee) return { guarantee: null };
    const [contract, siblings] = await Promise.all([
      getContract(guarantee.contractId).catch(lookupFallback("o contrato da garantia", null)),
      listGuarantees({ contractId: guarantee.contractId }).catch(lookupFallback("as outras garantias do contrato")),
    ]);
    return { guarantee, contract, siblings: siblings || [] };
  }, { deps: [params.id], isEmpty: () => false });

  if (loadQuery.status !== UI_STATE.CONTENT) {
    return (
      <AppShell title="Garantia" backHref="/painel/contratos/garantias">
        <AsyncState result={loadQuery} loadingLabel="Carregando garantia..." />
      </AppShell>
    );
  }

  const { guarantee, contract, siblings } = loadQuery.data || {};
  if (!guarantee) return notFound();
  const type = normalizeGuaranteeType(guarantee.guaranteeType);
  const personName = (id) => (id ? support.people.find((p) => p.id === id)?.legalName || "Pessoa cadastrada" : "");
  const replacedBy = guarantee.replacedByGuaranteeId ? siblings.find((g) => g.id === guarantee.replacedByGuaranteeId) : null;
  const replaces = siblings.find((g) => g.replacedByGuaranteeId === guarantee.id) || null;
  const canReplace = !guarantee.replacedByGuaranteeId && ["PENDING", "ACTIVE"].includes(guarantee.status);

  async function handleStatusChange(status) {
    setActionError("");
    setBusy(true);
    try {
      await updateGuarantee(guarantee.id, { status });
      setNotice({ tone: "success", text: `Situação atualizada para "${GUARANTEE_STATUS_LABELS[status]}".` });
      loadQuery.reload();
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao atualizar a situação da garantia."));
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
      setActionError(legalErrorMessage(err, "Erro ao excluir garantia."));
    }
  }

  const statusOptions = GUARANTEE_STATUSES.includes(guarantee.status) ? GUARANTEE_STATUSES : [guarantee.status, ...GUARANTEE_STATUSES];
  return (
    <AppShell title={GUARANTEE_TYPE_LABELS[type] || "Garantia"} backHref="/painel/contratos/garantias">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={GUARANTEE_STATUS_TONE[guarantee.status] || "neutral"}>{GUARANTEE_STATUS_LABELS[guarantee.status] || "Situação desconhecida"}</Badge>
            {contract ? <Badge tone={CONTRACT_STATUS_TONE[contract.status]}>{CONTRACT_STATUS_LABELS[contract.status]}</Badge> : null}
          </div>
          <div className={styles.actions}>
            <Select aria-label="Situação da garantia" value={guarantee.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={busy || Boolean(guarantee.replacedByGuaranteeId)}>
              {statusOptions.map((s) => (
                <option key={s} value={s} disabled={!GUARANTEE_STATUSES.includes(s)}>{GUARANTEE_STATUS_LABELS[s] || "Situação desconhecida"}</option>
              ))}
            </Select>
            {canReplace ? (
              <Button variant="secondary" href={`/painel/contratos/garantias/novo?substituir=${guarantee.id}`}><Icon name="swapHorizontal" size={16} /> Substituir garantia</Button>
            ) : null}
            <Button variant="ghost" onClick={() => setDeleteOpen(true)}><Icon name="trash" size={16} /> Excluir</Button>
          </div>
        </div>

        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}
        {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}
        {replacedBy || guarantee.replacedByGuaranteeId ? (
          <Alert tone="info" className={styles.notice}>
            Esta garantia foi substituída{replacedBy ? ` por ${GUARANTEE_TYPE_LABELS[normalizeGuaranteeType(replacedBy.guaranteeType)]}` : ""}; o histórico continua aqui.{" "}
            <Button size="sm" variant="ghost" href={`/painel/contratos/garantias/${guarantee.replacedByGuaranteeId}`}>Ver garantia nova</Button>
          </Alert>
        ) : null}
        {replaces ? (
          <Alert tone="info" className={styles.notice}>
            Esta garantia substituiu a anterior ({GUARANTEE_TYPE_LABELS[normalizeGuaranteeType(replaces.guaranteeType)]}).{" "}
            <Button size="sm" variant="ghost" href={`/painel/contratos/garantias/${replaces.id}`}>Ver garantia anterior</Button>
          </Alert>
        ) : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <CompleteGuaranteeCard
              guarantee={guarantee}
              support={support}
              onSaved={(text) => { setNotice({ tone: "success", text }); loadQuery.reload(); }}
            />
            <GuaranteeDataCard guarantee={guarantee} personName={personName} onViewFile={setViewerFile} />
          </div>

          <div className={styles.sideCol}>
            <Card title="Contrato vinculado">
              {contract ? (
                <div className={styles.linkRow} {...activatable(() => router.push(`/painel/contratos/lista/${contract.id}`))}>
                  <div className={styles.linkInfo}>
                    <span className={styles.linkTitle}>{formatContractLabel(contract)}</span>
                    <span className={styles.linkSub}>{formatBRL(contract.totalValue)}</span>
                  </div>
                  <Icon name="chevronRight" size={16} />
                </div>
              ) : (
                <EmptyState icon="document" title="Sem contrato vinculado" description="Nenhum contrato vinculado a esta garantia." />
              )}
            </Card>
          </div>
        </div>
      </div>

      <FileViewerModal open={Boolean(viewerFile)} onClose={() => setViewerFile(null)} file={viewerFile} fileId={viewerFile?.id} />

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
        <p>Tem certeza que deseja excluir a garantia <strong>{GUARANTEE_TYPE_LABELS[type]}</strong> do contrato <strong>{contract ? formatContractLabel(contract) : "não encontrado"}</strong>? Para trocar de garantia sem perder o histórico, use &quot;Substituir garantia&quot;.</p>
      </Modal>
    </AppShell>
  );
}
