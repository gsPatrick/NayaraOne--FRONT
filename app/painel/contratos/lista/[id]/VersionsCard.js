"use client";

// Versões do documento (Guia §4/§6): imutáveis, cada uma com hash; a aprovação é POR versão (rascunho -> aprovada) e uma
// versão criada depois da aprovação nasce em rascunho e exige nova aprovação.
import { useState } from "react";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import { fetchFileContent } from "@/lib/api/files";
import { createContractVersion, getContractVersionPdfBlob, approveContractVersion, uploadFile } from "@/lib/api/legal";
import { CONTRACT_VERSION_STATUS_LABELS, CONTRACT_VERSION_STATUS_TONE, CONTRACT_TERMS_LOCKED_STATUSES } from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatDate, formatDateTime, formatContractLabel } from "@/lib/format";
import styles from "./page.module.css";

function triggerBlobDownload(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function VersionsCard({ contract, versions, userName, onChanged, onNotice, onError }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [modalError, setModalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [cardError, setCardError] = useState("");

  const latest = versions[versions.length - 1] || null;
  const canApprove = ["LEGAL_REVIEW", "APPROVED"].includes(contract.status);
  const afterApproval = CONTRACT_TERMS_LOCKED_STATUSES.includes(contract.status);

  async function handleCreate() {
    if (!file) return;
    setModalError("");
    setBusy(true);
    try {
      const versionNumber = versions.length + 1;
      const uploaded = await uploadFile(file);
      await createContractVersion(contract.id, { content: `Versão ${versionNumber} do contrato ${formatContractLabel(contract)}`, documentFileId: uploaded.id });
      setModalOpen(false);
      onNotice({ tone: "info", text: `Versão ${versionNumber} criada em rascunho${afterApproval ? " — precisa de nova aprovação antes de ir para assinatura" : ""}.` });
      await onChanged();
    } catch (err) {
      setModalError(legalErrorMessage(err, "Não foi possível criar a versão."));
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove(version) {
    const ok = await confirm({
      title: `Aprovar a versão ${version.versionNumber}?`,
      message: "O sistema confere o hash do arquivo guardado e registra você como aprovador.",
      confirmLabel: "Aprovar versão",
    });
    if (!ok) return;
    onError("");
    setBusy(true);
    try {
      await approveContractVersion(version.id);
      onNotice({ tone: "success", text: `Versão ${version.versionNumber} aprovada.` });
      await onChanged();
    } catch (err) {
      onError(legalErrorMessage(err, "Não foi possível aprovar a versão."));
    } finally {
      setBusy(false);
    }
  }

  async function handlePdf(version) {
    if (loadingId) return;
    setCardError("");
    setLoadingId(`pdf-${version.id}`);
    try {
      const blob = await getContractVersionPdfBlob(contract.id, version.id);
      window.open(window.URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
    } catch (err) {
      setCardError(legalErrorMessage(err, "Não foi possível gerar o PDF desta versão."));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleSigned(version) {
    if (loadingId) return;
    setCardError("");
    setLoadingId(`signed-${version.id}`);
    try {
      const { blob, meta } = await fetchFileContent(version.signedDocumentFileId);
      triggerBlobDownload(blob, meta.fileName || `contrato-assinado-v${version.versionNumber}.pdf`);
    } catch (err) {
      setCardError(legalErrorMessage(err, "Não foi possível baixar o documento assinado."));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Card
      title="Versões do documento"
      subtitle="Imutáveis — cada alteração cria uma versão nova, que precisa ser aprovada antes de ir para assinatura"
      actions={<Button size="sm" variant="secondary" onClick={() => { setModalError(""); setFile(null); setModalOpen(true); }} disabled={busy} data-testid="contract-new-version"><Icon name="document" size={16} /> Nova versão</Button>}
    >
      {cardError ? <Alert tone="danger" className={styles.notice}>{cardError}</Alert> : null}
      {versions.length === 0 ? (
        <EmptyState icon="document" title="Sem versões" description="Nenhuma versão do documento ainda." />
      ) : (
        [...versions].reverse().map((version) => {
          const status = version.status || "DRAFT";
          const isLatest = latest && version.id === latest.id;
          return (
            <div key={version.id} className={styles.versionRow} data-testid={`contract-version-${version.versionNumber}`}>
              <div className={styles.versionInfo}>
                <span className={styles.versionTitle}>
                  Versão {version.versionNumber}
                  <Badge tone={CONTRACT_VERSION_STATUS_TONE[status] || "neutral"}>{CONTRACT_VERSION_STATUS_LABELS[status] || "Rascunho"}</Badge>
                  {isLatest ? <Badge tone="info">Vigente</Badge> : null}
                  {version.signedDocumentFileId ? <Badge tone="success">Via assinada</Badge> : null}
                </span>
                <span className={styles.versionTemplate}>{version.template?.name ? `Modelo: ${version.template.name}` : "Documento enviado (sem modelo)"}</span>
                {version.approvedAt ? (
                  <span className={styles.versionTemplate}>Aprovada por {userName(version.approvedBy)} em {formatDateTime(version.approvedAt)}</span>
                ) : null}
                <span className={styles.versionHash} title={version.contentHash ? `Hash de integridade (SHA-256): ${version.contentHash}` : undefined}>
                  hash de integridade: {version.contentHash ? `${version.contentHash.slice(0, 12)}…` : "não calculado"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {isLatest && status === "DRAFT" && canApprove ? (
                  <Button size="sm" onClick={() => handleApprove(version)} disabled={busy} data-testid="version-approve">
                    <Icon name="check" size={14} /> Aprovar versão
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => handlePdf(version)} loading={loadingId === `pdf-${version.id}`} disabled={Boolean(loadingId)}>
                  <Icon name="eye" size={14} /> Visualizar/Baixar PDF
                </Button>
                {version.signedDocumentFileId ? (
                  <Button size="sm" variant="primary" onClick={() => handleSigned(version)} loading={loadingId === `signed-${version.id}`} disabled={Boolean(loadingId)}>
                    <Icon name="arrowDownCircle" size={14} /> Baixar documento assinado
                  </Button>
                ) : null}
                <span className={styles.versionDate}>{formatDate(version.effectiveFrom || version.createdAt)}</span>
              </div>
            </div>
          );
        })
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova versão do documento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={busy}>Voltar</Button>
            <Button onClick={handleCreate} loading={busy} disabled={!file || busy} data-testid="contract-new-version-confirm">Criar versão</Button>
          </>
        }
      >
        {modalError ? <Alert tone="danger" className={styles.notice}>{modalError}</Alert> : null}
        {afterApproval ? (
          <Alert tone="warning" className={styles.notice}>
            O contrato já foi aprovado: a versão nova nasce em rascunho e exige nova aprovação antes de ir para assinatura.
          </Alert>
        ) : null}
        <div className={styles.formGrid}>
          <FormField label="Documento" htmlFor="f-ver-file" required helper="Arquivo do documento desta versão do contrato (PDF recomendado).">
            <input id="f-ver-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </FormField>
        </div>
      </Modal>
      <ConfirmDialog />
    </Card>
  );
}
