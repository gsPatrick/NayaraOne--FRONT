"use client";

// Checklist de documentos (Caderno §7 / Guia §5): vem da regra de checklist da empresa (Motor de Regras) e do cadastro
// das partes e do imóvel; cada exigência bloqueia a partir da sua etapa. Fail closed na API.
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import { generateContractRequirements, satisfyRequirement, waiveRequirement, uploadFile } from "@/lib/api/legal";
import { REQUIREMENT_STATUS_LABELS, REQUIREMENT_STATUS_TONE, REQUIREMENT_STAGE_LABELS } from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatDate, humanizeText } from "@/lib/format";
import styles from "./page.module.css";

export default function RequirementsCard({ contractId, requirements, onRequirements, onNotice, onError }) {
  const [generating, setGenerating] = useState(false);
  const [modal, setModal] = useState(null); // { requirement, mode: "satisfy" | "waive" }
  const [file, setFile] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    onError("");
    try {
      onRequirements((await generateContractRequirements(contractId)) || []);
      onNotice({ tone: "info", text: "Checklist gerado pela regra de documentos da empresa." });
    } catch (err) {
      onError(legalErrorMessage(err, "Não foi possível gerar o checklist."));
    } finally {
      setGenerating(false);
    }
  }

  function open(requirement, mode) {
    setModal({ requirement, mode });
    setFile(null);
    setReason("");
    setError("");
  }

  async function handleResolve() {
    if (!modal) return;
    const { requirement, mode } = modal;
    if (mode === "satisfy" ? !file : !reason.trim()) return;
    setError("");
    setBusy(true);
    try {
      let updated;
      if (mode === "satisfy") {
        const uploaded = await uploadFile(file);
        updated = await satisfyRequirement(requirement.id, { satisfiedByFileId: uploaded.id });
      } else {
        updated = await waiveRequirement(requirement.id, reason.trim());
      }
      onRequirements((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setModal(null);
      onNotice({ tone: "info", text: mode === "satisfy" ? "Documento anexado: exigência atendida." : "Exigência dispensada, com o motivo registrado." });
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível atualizar a exigência."));
    } finally {
      setBusy(false);
    }
  }

  const waive = modal?.mode === "waive";
  return (
    <Card
      title="Checklist de documentos"
      subtitle="Gerado pela regra de documentos da empresa e pelo cadastro das partes e do imóvel (a procuração aparece quando uma parte tem procurador). Cada exigência bloqueia a partir da sua etapa."
      actions={requirements.length === 0 ? <Button size="sm" variant="secondary" loading={generating} onClick={handleGenerate}>Gerar checklist</Button> : null}
    >
      {requirements.length === 0 ? (
        <EmptyState icon="document" title="Checklist ainda não gerado" description="O checklist é gerado ao enviar o contrato para documentos, ou agora pelo botão." />
      ) : (
        requirements.map((r) => (
          <div key={r.id} className={styles.partyRow} data-testid="requirement-row">
            <div className={styles.partyInfo}>
              <span className={styles.partyName}>{humanizeText(r.description)}</span>
              <span className={styles.partyRole}>
                {REQUIREMENT_STAGE_LABELS[r.requiredStage || "LEGAL_REVIEW"] || "Antes da análise jurídica"}
                {" · "}
                {r.status === "WAIVED" ? `Dispensada — motivo: ${r.waivedReason || "sem motivo registrado"}` : r.status === "SATISFIED" ? `Documento anexado${r.satisfiedAt ? ` em ${formatDate(r.satisfiedAt)}` : ""}` : "Aguardando documento"}
              </span>
            </div>
            <Badge tone={REQUIREMENT_STATUS_TONE[r.status] || "neutral"}>{REQUIREMENT_STATUS_LABELS[r.status] || "Pendente"}</Badge>
            {r.status === "PENDING" ? (
              <div style={{ display: "flex", gap: 6 }}>
                <Button size="sm" variant="secondary" onClick={() => open(r, "satisfy")} data-testid="requirement-attach">Anexar</Button>
                <Button size="sm" variant="ghost" onClick={() => open(r, "waive")}>Dispensar</Button>
              </div>
            ) : null}
          </div>
        ))
      )}

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={waive ? "Dispensar exigência" : "Anexar documento"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={busy}>Voltar</Button>
            <Button onClick={handleResolve} loading={busy} disabled={busy || (waive ? !reason.trim() : !file)} data-testid="requirement-confirm">
              {waive ? "Dispensar" : "Anexar"}
            </Button>
          </>
        }
      >
        {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
        <p className={styles.partyRole}>{modal ? humanizeText(modal.requirement.description) : ""}</p>
        {waive ? (
          <div className={styles.formGrid}>
            <Alert tone="info">A dispensa fica registrada com o seu nome.</Alert>
            <FormField label="Motivo" htmlFor="f-req-reason" required>
              <Input id="f-req-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: inquilino isento por norma municipal." />
            </FormField>
          </div>
        ) : (
          <div className={styles.formGrid}>
            <FormField label="Documento" htmlFor="f-req-file" required helper="Arquivo que comprova esta exigência.">
              <input id="f-req-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </FormField>
          </div>
        )}
      </Modal>
    </Card>
  );
}
