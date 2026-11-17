"use client";

// Risco do processo (Caderno M5:244): obrigatório e nunca apagado. A edição só troca por outro nível da lista; a tela nunca
// manda null (PATCH /legal/cases/:id; a API recusa apagar com LEGAL_CASE_RISK_REQUIRED).
import { useState } from "react";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import FormField from "@/components/molecules/FormField/FormField";
import { updateLegalCase } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { CASE_RISK_LABELS } from "@/lib/labels/juridico";
import { CASE_RISK_OPTIONS, isValidRisk } from "@/lib/legal/caseRequired";
import styles from "./page.module.css";

export default function CaseRiskForm({ legalCase, onSaved, onError }) {
  const [open, setOpen] = useState(false);
  const [riskLevel, setRiskLevel] = useState(isValidRisk(legalCase.riskLevel) ? legalCase.riskLevel : "");
  const [busy, setBusy] = useState(false);
  const invalid = !isValidRisk(riskLevel);

  async function handleSave() {
    if (invalid) return;
    setBusy(true);
    onError("");
    try {
      const updated = await updateLegalCase(legalCase.id, { riskLevel });
      setOpen(false);
      onSaved(updated);
    } catch (err) {
      onError(legalErrorMessage(err, "Não foi possível atualizar o risco do processo."));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Editar risco</Button>;
  }
  return (
    <div className={styles.newDeadline} data-testid="case-risk-form">
      <div className={styles.formRow}>
        <FormField label="Risco" htmlFor="f-case-risk" required error={invalid ? "Escolha o risco do processo." : undefined}>
          <Select id="f-case-risk" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
            <option value="" disabled>Selecionar…</option>
            {CASE_RISK_OPTIONS.map((k) => (
              <option key={k} value={k}>{CASE_RISK_LABELS[k]}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className={styles.formActions}>
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} loading={busy} disabled={busy || invalid}>Gravar risco</Button>
      </div>
    </div>
  );
}
