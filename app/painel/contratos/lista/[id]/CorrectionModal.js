"use client";

// Correção auditada de dados (AUD-004): só antes da aprovação. A partir de APPROVED a API recusa (409) valor, vigência,
// imóvel e número — a alteração é registrada por aditivo. Exige MFA recente (o host global pede o código).
import { useEffect, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { correctContractData } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { dateOnlyInputToIso, toNumber } from "@/lib/format";
import styles from "./page.module.css";

const dateInput = (iso) => (iso ? String(iso).slice(0, 10) : "");

export default function CorrectionModal({ open, onClose, contract, onCorrected }) {
  const [form, setForm] = useState({ totalValue: "", startsAt: "", endsAt: "", contractNumber: "", reason: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      totalValue: contract.totalValue != null ? String(contract.totalValue).replace(".", ",") : "",
      startsAt: dateInput(contract.startsAt),
      endsAt: dateInput(contract.endsAt),
      contractNumber: contract.contractNumber || "",
      reason: "",
    });
  }, [open, contract]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function changedFields() {
    const fields = {};
    const value = toNumber(form.totalValue);
    if (form.totalValue !== "" && !Number.isNaN(value) && value !== Number(contract.totalValue)) fields.totalValue = value;
    if (form.startsAt !== dateInput(contract.startsAt)) fields.startsAt = form.startsAt ? dateOnlyInputToIso(form.startsAt) : null;
    if (form.endsAt !== dateInput(contract.endsAt)) fields.endsAt = form.endsAt ? dateOnlyInputToIso(form.endsAt) : null;
    if (form.contractNumber.trim() && form.contractNumber.trim() !== (contract.contractNumber || "")) fields.contractNumber = form.contractNumber.trim();
    return fields;
  }

  async function handleSave() {
    const fields = changedFields();
    if (!Object.keys(fields).length) {
      setError("Nada mudou: altere ao menos um dado.");
      return;
    }
    if (!form.reason.trim()) {
      setError("Informe o motivo da correção — fica registrado na auditoria.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await correctContractData(contract.id, { fields, reason: form.reason.trim() });
      await onCorrected();
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível corrigir os dados do contrato."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Corrigir dados do contrato"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Voltar</Button>
          <Button onClick={handleSave} loading={busy} disabled={busy}>Salvar correção</Button>
        </>
      }
    >
      {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
      <p className={styles.partyRole}>Correção de dado gravado errado, antes da aprovação. Depois de aprovado, a mudança é feita por aditivo.</p>
      <div className={styles.formGrid}>
        <FormField label="Valor total (R$)" htmlFor="f-corr-value">
          <DecimalInput id="f-corr-value" value={form.totalValue} onChange={set("totalValue")} placeholder="0,00" />
        </FormField>
        <FormField label="Número do contrato" htmlFor="f-corr-number">
          <Input id="f-corr-number" value={form.contractNumber} onChange={set("contractNumber")} />
        </FormField>
        <FormField label="Início de vigência" htmlFor="f-corr-starts">
          <Input id="f-corr-starts" type="date" min="1900-01-01" max="2100-12-31" value={form.startsAt} onChange={set("startsAt")} />
        </FormField>
        <FormField label="Fim de vigência" htmlFor="f-corr-ends">
          <Input id="f-corr-ends" type="date" min="1900-01-01" max="2100-12-31" value={form.endsAt} onChange={set("endsAt")} />
        </FormField>
        <FormField label="Motivo" htmlFor="f-corr-reason" required>
          <Input id="f-corr-reason" value={form.reason} onChange={set("reason")} placeholder="Ex.: valor digitado errado no cadastro" />
        </FormField>
      </div>
    </Modal>
  );
}
