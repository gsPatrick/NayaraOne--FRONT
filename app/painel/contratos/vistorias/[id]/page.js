"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { reportLookupProblem, lookupFallback } from "@/lib/asyncState/lookup";
import { UI_STATE } from "@/lib/asyncState/states";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { nullOn404 } from "@/lib/asyncState/notFound";
import { getProperty } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import {
  getInspection,
  getContract,
  listInspectionItems,
  listInspections,
  completeInspection,
  compareInspections,
  listInspectionSignatures,
  listInspectionItemMedia,
  generateInspectionReport,
  getInspectionReportBlob,
} from "@/lib/api/legal";
import {
  INSPECTION_TYPE_LABELS,
  INSPECTION_TYPE_TONE,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONE,
  INSPECTION_COUNTERPART,
  normalizeInspectionType,
} from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatDate, formatDateTime, formatContractLabel } from "@/lib/format";
import InspectionItemsCard from "./InspectionItemsCard";
import InspectionSignaturesCard from "./InspectionSignaturesCard";
import InspectionComparisonCard from "./InspectionComparisonCard";
import { findCounterpart } from "./inspectionCounterpart";
import styles from "./page.module.css";

const isEntrySide = (inspection) => normalizeInspectionType(inspection.inspectionType) === "ENTRY";

export default function VistoriaDetailPage({ params }) {
  const [inspection, setInspection] = useState(null);
  const [property, setProperty] = useState(null);
  const [contract, setContract] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [counterpart, setCounterpart] = useState(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [mediaByItem, setMediaByItem] = useState({});
  const [viewerFile, setViewerFile] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);

  // M9-D940: carregando, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  const loadQuery = useAsyncState(() => {
    return Promise.all([getInspection(params.id), listInspectionItems(params.id), apiFetch("/users").catch(lookupFallback("os usuários"))])
      .catch(nullOn404) // 404 da API: o registro não existe, a tela chama notFound()
      .then(async (loaded) => {
        if (!loaded) {
          setInspection(null);
          return;
        }
        const [inspectionRes, itemsRes, usersRes] = loaded;
        setInspection(inspectionRes);
        setItems(Array.isArray(itemsRes) ? itemsRes : []);
        setUsers(Array.isArray(usersRes) ? usersRes : []);

        const mediaEntries = await Promise.all(
          (itemsRes || []).map((item) => listInspectionItemMedia(item.id).then((media) => [item.id, Array.isArray(media) ? media : []]).catch((error) => { reportLookupProblem("as mídias do item", error); return [item.id, []]; }))
        );
        setMediaByItem(Object.fromEntries(mediaEntries));

        if (inspectionRes?.propertyId) {
          setProperty(await getProperty(inspectionRes.propertyId).catch(lookupFallback("o imóvel da vistoria", null)));
        }
        if (inspectionRes?.contractId) {
          setContract(await getContract(inspectionRes.contractId).catch(lookupFallback("o contrato da vistoria", null)));
        }
        if (inspectionRes?.status === "COMPLETED") {
          const sigs = await listInspectionSignatures(inspectionRes.id).catch(lookupFallback("as assinaturas da vistoria"));
          setSignatures(Array.isArray(sigs) ? sigs : []);
        }
        if (INSPECTION_COUNTERPART[normalizeInspectionType(inspectionRes.inspectionType)]) {
          const filters = inspectionRes.contractId ? { contractId: inspectionRes.contractId } : { propertyId: inspectionRes.propertyId };
          let all = await listInspections(filters).catch((error) => { reportLookupProblem("as vistorias do contrato", error); return []; });
          if (inspectionRes.contractId && !findCounterpart(inspectionRes, all)) {
            all = await listInspections({ propertyId: inspectionRes.propertyId }).catch(lookupFallback("as vistorias do imóvel"));
          }
          setCounterpart(findCounterpart(inspectionRes, all));
        }
      })
      .then(() => true);
  }, { deps: [params.id], isEmpty: () => false });

  function userName(id) {
    return users.find((u) => u.id === id)?.name || "Usuário não identificado";
  }

  if (loadQuery.status !== UI_STATE.CONTENT) {
    return (
      <AppShell title="Vistoria" backHref="/painel/contratos/vistorias">
        <AsyncState result={loadQuery} loadingLabel="Carregando vistoria..." />
      </AppShell>
    );
  }

  if (!inspection) return notFound();

  const typeLabel = INSPECTION_TYPE_LABELS[inspection.inspectionType] || "Vistoria";
  // Entrada sempre à esquerda; vistoria final é comparada com a de entrada.
  const entry = counterpart ? (isEntrySide(inspection) ? inspection : counterpart) : null;
  const exit = counterpart ? (isEntrySide(inspection) ? counterpart : inspection) : null;

  // O7 (auditoria M45): concluir é irreversível — pede confirmação antes.
  async function handleComplete() {
    setConfirmCompleteOpen(false);
    setActionError("");
    setBusy(true);
    try {
      const updated = await completeInspection(inspection.id, inspection.lockVersion);
      setInspection(updated);
      const sigs = await listInspectionSignatures(updated.id).catch(lookupFallback("as assinaturas da vistoria"));
      setSignatures(Array.isArray(sigs) ? sigs : []);
    } catch (err) {
      setActionError(
        err?.code === "LEGAL_INSPECTION_VERSION_CONFLICT"
          ? "Esta vistoria foi alterada por outra pessoa enquanto você a revisava. Recarregue a página para ver a versão atual antes de concluir."
          : legalErrorMessage(err, "Erro ao concluir vistoria.")
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateReport() {
    setActionError("");
    setReportBusy(true);
    try {
      const result = await generateInspectionReport(inspection.id);
      setInspection((prev) => ({ ...prev, reportHash: result.reportHash, reportGeneratedAt: result.reportGeneratedAt }));
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao gerar relatório."));
    } finally {
      setReportBusy(false);
    }
  }

  async function handleDownloadReport() {
    setActionError("");
    setReportBusy(true);
    try {
      const blob = await getInspectionReportBlob(inspection.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vistoria-${formatDate(inspection.scheduledAt).replace(/\//g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao baixar relatório."));
    } finally {
      setReportBusy(false);
    }
  }

  async function handleToggleCompare() {
    if (comparison) {
      setComparison(null);
      return;
    }
    setActionError("");
    setBusy(true);
    try {
      setComparison(await compareInspections(entry.id, exit.id));
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao comparar vistorias."));
    } finally {
      setBusy(false);
    }
  }

  const counterpartLabel = counterpart ? (INSPECTION_TYPE_LABELS[counterpart.inspectionType] || "").toLowerCase() : "";

  return (
    <AppShell title={property?.name || "Vistoria"} backHref="/painel/contratos/vistorias">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={INSPECTION_TYPE_TONE[inspection.inspectionType]}>{typeLabel}</Badge>
            <Badge tone={INSPECTION_STATUS_TONE[inspection.status]}>{INSPECTION_STATUS_LABELS[inspection.status] || "Situação não identificada"}</Badge>
          </div>
          <div className={styles.actions}>
            {inspection.status === "SCHEDULED" ? (
              <Button onClick={() => setConfirmCompleteOpen(true)} disabled={busy}><Icon name="check" size={16} /> Concluir vistoria</Button>
            ) : null}
            {counterpart ? (
              <Button variant="secondary" onClick={handleToggleCompare} disabled={busy}>
                <Icon name="swapHorizontal" size={16} />
                {comparison ? "Ocultar comparação" : `Comparar com a vistoria de ${counterpartLabel}`}
              </Button>
            ) : null}
            {inspection.status === "COMPLETED" && !inspection.reportHash ? (
              <Button variant="secondary" onClick={handleGenerateReport} loading={reportBusy} disabled={reportBusy}>
                <Icon name="document" size={16} /> Gerar relatório
              </Button>
            ) : null}
            {inspection.status === "COMPLETED" && inspection.reportHash ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setViewerFile({ fileName: "relatorio-vistoria.pdf", mimeType: "application/pdf", blobLoader: () => getInspectionReportBlob(inspection.id) })}
                >
                  <Icon name="eye" size={16} /> Visualizar relatório
                </Button>
                <Button variant="secondary" onClick={handleDownloadReport} loading={reportBusy} disabled={reportBusy}>
                  <Icon name="arrowDownCircle" size={16} /> Baixar relatório
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}

        <Card title="Detalhes da vistoria">
          <dl className={styles.detailList}>
            <div className={styles.detailRow}><dt>Imóvel</dt><dd>{property?.name || "Imóvel não encontrado"}</dd></div>
            <div className={styles.detailRow}><dt>Contrato vinculado</dt><dd>{contract ? formatContractLabel(contract) : "Sem contrato vinculado"}</dd></div>
            <div className={styles.detailRow}><dt>Vistoriador</dt><dd>{inspection.inspectorUserId ? userName(inspection.inspectorUserId) : "Sem vistoriador definido"}</dd></div>
            <div className={styles.detailRow}><dt>Agendada para</dt><dd>{formatDate(inspection.scheduledAt)}</dd></div>
            <div className={styles.detailRow}><dt>Concluída em</dt><dd>{inspection.completedAt ? formatDateTime(inspection.completedAt) : "Ainda não concluída"}</dd></div>
            <div className={styles.detailRow}>
              <dt>Comparação</dt>
              <dd>{counterpart ? `Vistoria de ${counterpartLabel} de ${formatDate(counterpart.scheduledAt)} encontrada` : INSPECTION_COUNTERPART[normalizeInspectionType(inspection.inspectionType)] ? "Ainda não há vistoria correspondente para comparar" : "Vistoria intermediária não é comparada"}</dd>
            </div>
          </dl>
        </Card>

        <InspectionItemsCard
          items={items}
          mediaByItem={mediaByItem}
          onMediaChange={(itemId, list) => setMediaByItem((prev) => ({ ...prev, [itemId]: list }))}
          canAttach={signatures.length === 0}
          onView={setViewerFile}
        />

        {inspection.status === "COMPLETED" ? (
          <InspectionSignaturesCard inspectionId={inspection.id} signatures={signatures} onSignatures={setSignatures} />
        ) : null}

        {comparison && entry && exit ? (
          <InspectionComparisonCard entry={entry} exit={exit} comparison={comparison} onViewMedia={setViewerFile} />
        ) : null}
      </div>

      <FileViewerModal
        open={!!viewerFile}
        onClose={() => setViewerFile(null)}
        file={viewerFile}
        fileId={viewerFile?.id}
        blobLoader={viewerFile?.blobLoader}
      />
      <Modal
        open={confirmCompleteOpen}
        onClose={() => setConfirmCompleteOpen(false)}
        title="Concluir vistoria?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCompleteOpen(false)}>Voltar</Button>
            <Button onClick={handleComplete} disabled={busy}>Concluir vistoria</Button>
          </>
        }
      >
        <p>Depois de concluída, a vistoria segue para assinatura das partes; assinada, itens, fotos e observações ficam travados. Confirme que revisou tudo.</p>
      </Modal>
    </AppShell>
  );
}
