"use client";

import { useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { releaseKeyDelivery, uploadFile } from "@/lib/api/legal";
import { PARTY_ROLE_LABELS } from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { toNumber } from "@/lib/format";
import styles from "./page.module.css";

// Liberação das chaves (Caderno §10, Guia §11): quantidade/identificação, quem assina o termo, fotos (imagens) e a via
// do termo assinada pelo recebedor. A política de fotos e o texto do termo são do servidor; a tela não decide o que
// falta — manda o pedido e mostra a recusa da API em português (checklist, vistoria, garantia, via assinada).
export default function ReleaseKeysModal({ open, onClose, delivery, parties, personOf, recipientIsParty, form, onFormChange, termPreview, termPreviewError, onReleased, onRefused }) {
  const [photos, setPhotos] = useState([]);
  const [termFile, setTermFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deliveredTo = personOf(delivery.deliveredToPersonId);
  const keysCount = toNumber(form.keysCount);
  const countOk = Number.isInteger(keysCount) && keysCount > 0;

  async function handleRelease() {
    setError("");
    setBusy(true);
    try {
      const photosFileIds = [];
      for (const file of photos) {
        const uploaded = await uploadFile(file);
        photosFileIds.push(uploaded.id);
      }
      const termEvidence = termFile ? await uploadFile(termFile) : null;
      const updated = await releaseKeyDelivery(delivery.id, {
        keysCount,
        keysIdentification: form.keysIdentification.trim() || undefined,
        termSignedByPersonId: form.termSignedByPersonId || delivery.deliveredToPersonId,
        termEvidenceFileId: termEvidence ? termEvidence.id : undefined,
        photosFileIds,
      });
      setPhotos([]);
      setTermFile(null);
      onReleased(updated);
    } catch (err) {
      const message = legalErrorMessage(err, "Erro ao liberar chaves.");
      setError(message);
      onRefused(message);
    } finally {
      setBusy(false);
    }
  }

  const signers = [...new Map(parties.filter((p) => p.personId !== delivery.deliveredToPersonId).map((p) => [p.personId, p])).values()];

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Liberar chaves"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={handleRelease} loading={busy} disabled={busy || !countOk}>Liberar chaves</Button>
        </>
      }
    >
      {error ? <div data-testid="key-release-refusal"><Alert tone="danger" title="Entrega recusada">{error}</Alert></div> : null}
      <FormField label="Quantidade de chaves/controles" htmlFor="f-kd-count" required error={form.keysCount && !countOk ? "Informe um número inteiro maior que zero." : undefined}>
        <DecimalInput id="f-kd-count" value={form.keysCount} onChange={(e) => onFormChange({ keysCount: e.target.value })} placeholder="Ex.: 3" />
      </FormField>
      <FormField label="Identificação" htmlFor="f-kd-ident">
        <Input id="f-kd-ident" value={form.keysIdentification} onChange={(e) => onFormChange({ keysIdentification: e.target.value })} placeholder="Ex.: 2 chaves da porta, 1 controle do portão" />
      </FormField>
      <FormField label="Quem assina o termo" htmlFor="f-kd-signer" required helper="Somente partes do contrato. O texto do termo é gerado pelo sistema (prévia abaixo).">
        <Select id="f-kd-signer" value={form.termSignedByPersonId} onChange={(e) => onFormChange({ termSignedByPersonId: e.target.value })}>
          {recipientIsParty ? <option value="">{deliveredTo?.legalName ? `${deliveredTo.legalName} (recebedor)` : "Recebedor das chaves"}</option> : <option value="">Selecione uma parte do contrato</option>}
          {signers.map((p) => (
            <option key={p.personId} value={p.personId}>{personOf(p.personId)?.legalName || "Pessoa"} — {PARTY_ROLE_LABELS[p.partyRole] || "Parte"}</option>
          ))}
        </Select>
      </FormField>
      <FormField
        label="Via do termo assinada pelo recebedor"
        htmlFor="f-kd-term-evidence"
        required
        helper="Imprima o termo da prévia, colete a assinatura e anexe a via assinada (PDF ou foto). Sem ela a entrega é recusada."
      >
        <input id="f-kd-term-evidence" type="file" accept="application/pdf,image/*" onChange={(e) => setTermFile(e.target.files?.[0] || null)} />
      </FormField>
      <FormField label="Fotos da entrega" htmlFor="f-kd-photos" helper="Somente imagens. Obrigatórias quando a política do sistema exigir (imóvel usado, entrega de venda).">
        <input id="f-kd-photos" type="file" accept="image/*" multiple onChange={(e) => setPhotos(Array.from(e.target.files || []).filter((f) => !f.type || f.type.startsWith("image/")))} />
      </FormField>
      {termPreview?.photosRequired ? <p className={styles.mono}>Esta entrega exige fotos.</p> : null}
      <FormField label="Prévia do termo" htmlFor="f-kd-term">
        {termPreview?.termText
          ? <pre id="f-kd-term" className={styles.mono} style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>{termPreview.termText}</pre>
          : <p>{termPreviewError || "Gerando prévia…"}</p>}
      </FormField>
    </Modal>
  );
}
