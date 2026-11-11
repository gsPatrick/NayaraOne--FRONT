"use client";

// Garantia Pendente (Caderno M5 §9): mostra o que falta (`missingForActivation` do GET) e permite completar pelo
// PATCH /legal/guarantees/:id com os campos do tipo. Completo, a garantia é ativada na mesma gravação.
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Alert from "@/components/molecules/Alert/Alert";
import Button from "@/components/atoms/Button/Button";
import { updateGuarantee, uploadFile } from "@/lib/api/legal";
import { GUARANTEE_FIELD_LABELS, normalizeGuaranteeType } from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import GuaranteeTypeFields from "../GuaranteeTypeFields";
import { emptyGuaranteeForm, missingForType, installmentsProblem, buildGuaranteePayload, depositOriginCandidates } from "../guaranteeForm";
import styles from "./page.module.css";

export default function CompleteGuaranteeCard({ guarantee, support, onSaved }) {
  const type = normalizeGuaranteeType(guarantee.guaranteeType);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyGuaranteeForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const missing = guarantee.missingForActivation || [];
  const stillMissing = missingForType(type, form, guarantee);
  const problem = installmentsProblem(form);

  if (missing.length === 0) return null;

  async function handleSave() {
    if (problem) return;
    setBusy(true);
    setError("");
    try {
      const payload = await buildGuaranteePayload(type, form, uploadFile);
      if (stillMissing.length === 0 && guarantee.status === "PENDING") payload.status = "ACTIVE";
      await updateGuarantee(guarantee.id, payload);
      setForm(emptyGuaranteeForm());
      setOpen(false);
      onSaved(stillMissing.length === 0 ? "Dados completos: garantia ativada." : "Dados gravados. A garantia continua pendente até completar o restante.");
    } catch (err) {
      setError(legalErrorMessage(err, "Erro ao gravar os dados da garantia."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Faltam dados para ativar"
      subtitle="Enquanto faltar dado obrigatório do tipo, a garantia não vale como garantia ativa (ativação do contrato e entrega de chaves)"
      actions={open ? null : <Button size="sm" onClick={() => setOpen(true)}>Completar dados</Button>}
    >
      <ul className={styles.missingList} data-testid="guarantee-missing">
        {missing.map((k) => <li key={k}>{GUARANTEE_FIELD_LABELS[k] || "Dado do tipo de garantia"}</li>)}
      </ul>
      {open ? (
        <div className={styles.completeForm}>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <GuaranteeTypeFields
            type={type}
            form={form}
            onChange={setForm}
            current={guarantee}
            support={{ people: support.people, depositEntries: depositOriginCandidates(support.entries, guarantee.contractId), otherFlows: support.otherFlows }}
          />
          {problem ? <Alert tone="danger">{problem}</Alert> : null}
          <Alert tone={stillMissing.length ? "warning" : "success"}>
            {stillMissing.length
              ? `Ainda vai faltar: ${stillMissing.map((k) => GUARANTEE_FIELD_LABELS[k] || "dado do tipo").join(", ")}.`
              : "Com estes dados a garantia fica completa e é ativada."}
          </Alert>
          <div className={styles.completeActions}>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={handleSave} loading={busy} disabled={busy || Boolean(problem)}>Gravar dados</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
