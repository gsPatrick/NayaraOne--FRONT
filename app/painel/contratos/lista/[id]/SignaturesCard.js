"use client";

// Assinaturas da versão vigente (Caderno §8). Com o contrato em assinatura, a via assinada de cada parte pode ser
// registrada manualmente (arquivo da empresa + quem coletou = o usuário logado).
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import { recordManualSignature, uploadFile } from "@/lib/api/legal";
import { PARTY_ROLE_LABELS, SIGNATURE_STATUS_LABELS, SIGNATURE_STATUS_TONE, SIGNATURE_METHOD_LABELS } from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function SignaturesCard({ contract, latestVersion, signatures, parties, personOf, onChanged, onNotice }) {
  const [target, setTarget] = useState(null); // parte
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signedIds = new Set(signatures.filter((s) => s.status === "SIGNED").map((s) => s.personId));
  const pending = contract.status === "SIGNING" && latestVersion ? parties.filter((p) => !signedIds.has(p.personId)) : [];
  const nameOf = (personId) => personOf(personId)?.legalName || "Signatário";

  async function handleRecord() {
    if (!file || !target) return;
    setError("");
    setBusy(true);
    try {
      const uploaded = await uploadFile(file);
      await recordManualSignature(latestVersion.id, { personId: target.personId, evidenceFileId: uploaded.id });
      setTarget(null);
      onNotice({ tone: "success", text: `Assinatura de ${nameOf(target.personId)} registrada com a via assinada.` });
      await onChanged();
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível registrar a assinatura."));
    } finally {
      setBusy(false);
    }
  }

  // Pedido eletrônico cancelado/substituído (ex.: trocado pela assinatura manual) não conta como signatário pendente.
  const live = signatures.filter((s) => !["CANCELLED", "SUPERSEDED"].includes(s.status));
  const subtitle = latestVersion
    ? live.length > 0
      ? `${live.filter((s) => s.status === "SIGNED").length} de ${live.length} assinaram — versão ${latestVersion.versionNumber}`
      : `Referentes à versão ${latestVersion.versionNumber}`
    : "Sem versão de documento gerada";

  return (
    <Card title="Assinaturas" subtitle={subtitle}>
      {signatures.length === 0 ? (
        <EmptyState icon="signature" title="Sem assinaturas" description="Nenhuma assinatura registrada para a versão vigente." />
      ) : (
        signatures.map((sig) => {
          const party = parties.find((p) => p.personId === sig.personId);
          const label = personOf(sig.personId)?.legalName || (party ? PARTY_ROLE_LABELS[party.partyRole] : null) || "Signatário";
          return (
            <div key={sig.id} className={styles.signatureRow}>
              <Avatar name={label} size="sm" />
              <div className={styles.signatureInfo}>
                <span className={styles.signatureName}>{label}</span>
                <span className={styles.signatureMeta}>
                  {sig.signedAt ? `Assinada em ${formatDateTime(sig.signedAt)}` : "Aguardando assinatura"}
                  {sig.signatureMethod ? ` · ${SIGNATURE_METHOD_LABELS[sig.signatureMethod] || "Outro método"}` : ""}
                </span>
              </div>
              <Badge tone={SIGNATURE_STATUS_TONE[sig.status] || "neutral"}>{SIGNATURE_STATUS_LABELS[sig.status] || "Em andamento"}</Badge>
            </div>
          );
        })
      )}

      {pending.length > 0 ? (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <p className={styles.partyRole}>Via assinada recebida em papel ou por fora do provedor? Registre por signatário:</p>
          {pending.map((p) => (
            <div key={p.id} className={styles.partyRow}>
              <div className={styles.partyInfo}>
                <span className={styles.partyName}>{nameOf(p.personId)}</span>
                <span className={styles.partyRole}>{PARTY_ROLE_LABELS[p.partyRole] || "Parte"}</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => { setError(""); setFile(null); setTarget(p); }} data-testid={`manual-signature-${p.personId}`}>
                <Icon name="signature" size={14} /> Registrar assinatura manual
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title="Registrar assinatura manual"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)} disabled={busy}>Voltar</Button>
            <Button onClick={handleRecord} loading={busy} disabled={!file || busy} data-testid="manual-signature-confirm">Registrar assinatura</Button>
          </>
        }
      >
        {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
        <p className={styles.partyRole}>
          Signatário: <strong>{target ? nameOf(target.personId) : ""}</strong>. Você fica registrado como quem coletou a assinatura da versão {latestVersion?.versionNumber}.
        </p>
        <div className={styles.formGrid}>
          <FormField label="Via assinada" htmlFor="f-manual-sig-file" required helper="Arquivo digitalizado da via assinada por esta pessoa.">
            <input id="f-manual-sig-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </FormField>
        </div>
      </Modal>
    </Card>
  );
}
