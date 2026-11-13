"use client";

import { useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import { cancelKeyDelivery } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";

// Cancelar entrega pendente (lease.keys.deliver): nada é apagado, o motivo vai para a auditoria.
export default function CancelDeliveryModal({ open, onClose, deliveryId, onCancelled }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    setError("");
    setBusy(true);
    try {
      const updated = await cancelKeyDelivery(deliveryId, reason.trim());
      setReason("");
      onCancelled(updated);
    } catch (err) {
      setError(legalErrorMessage(err, "Erro ao cancelar a entrega de chaves."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Cancelar entrega de chaves"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Voltar</Button>
          <Button variant="danger" onClick={handleCancel} loading={busy} disabled={busy || reason.trim().length < 5}>Cancelar entrega</Button>
        </>
      }
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <p>A entrega fica registrada como cancelada (nada é apagado). Informe o motivo — ele vai para a auditoria.</p>
      <FormField label="Motivo" htmlFor="f-kd-cancel-reason" required helper="Mínimo de 5 caracteres.">
        <Input id="f-kd-cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: recebedor não é parte do contrato" />
      </FormField>
    </Modal>
  );
}
