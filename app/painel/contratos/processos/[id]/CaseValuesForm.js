"use client";

// Valores do processo (Caderno M5 §14 "Não confundir estimativa processual com recebível confirmado"): a estimativa
// e o valor confirmado (acordo/condenação) são campos separados do processo (PATCH /legal/cases/:id). Depois que o
// confirmado vira recebível no Financeiro, a API recusa alterá-lo (LEGAL_CASE_RECEIVABLE_LOCKED).
import { useState } from "react";
import Button from "@/components/atoms/Button/Button";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import FormField from "@/components/molecules/FormField/FormField";
import { updateLegalCase } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { toNumber } from "@/lib/format";
import styles from "./page.module.css";

const asInput = (v) => (v === null || v === undefined || v === "" ? "" : String(v).replace(".", ","));

export default function CaseValuesForm({ legalCase, locked, onSaved, onError }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ estimatedAmount: asInput(legalCase.estimatedAmount), confirmedAmount: asInput(legalCase.confirmedAmount) });
  const [busy, setBusy] = useState(false);

  const parsed = (v) => (v === "" ? null : toNumber(v));
  const invalid = [form.estimatedAmount, form.confirmedAmount].some((v) => v !== "" && (Number.isNaN(toNumber(v)) || toNumber(v) < 0));

  async function handleSave() {
    if (invalid) return;
    setBusy(true);
    onError("");
    try {
      const payload = { estimatedAmount: parsed(form.estimatedAmount) };
      if (!locked) payload.confirmedAmount = parsed(form.confirmedAmount);
      const updated = await updateLegalCase(legalCase.id, payload);
      setOpen(false);
      onSaved(updated);
    } catch (err) {
      onError(legalErrorMessage(err, "Não foi possível atualizar os valores do processo."));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Atualizar valores</Button>;
  }
  return (
    <div className={styles.newDeadline} data-testid="case-values-form">
      <div className={styles.formRow}>
        <FormField label="Valor estimado (R$)" htmlFor="f-case-estimated" helper="Estimativa processual: nunca vira lançamento.">
          <DecimalInput id="f-case-estimated" value={form.estimatedAmount} onChange={(e) => setForm((p) => ({ ...p, estimatedAmount: e.target.value }))} placeholder="0,00" />
        </FormField>
        <FormField
          label="Valor confirmado (R$)"
          htmlFor="f-case-confirmed"
          helper={locked ? "Já virou recebível no Financeiro: não muda mais por aqui." : "Acordo homologado ou condenação: é o único valor que pode virar recebível."}
        >
          <DecimalInput id="f-case-confirmed" value={form.confirmedAmount} disabled={locked} onChange={(e) => setForm((p) => ({ ...p, confirmedAmount: e.target.value }))} placeholder="0,00" />
        </FormField>
      </div>
      <div className={styles.formActions}>
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} loading={busy} disabled={busy || invalid}>Gravar valores</Button>
      </div>
    </div>
  );
}
