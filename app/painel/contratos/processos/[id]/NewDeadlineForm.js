"use client";

// Novo prazo jurídico (Caderno M5 §15; Guia §12): todo prazo nasce com origem verificável — o documento que o
// originou (intimação, publicação, decisão) é enviado e vira `sourceFileId` — e com responsável (do prazo ou do
// processo). Data só-dia vence às 23:59 de Brasília; com hora, vale a hora de Brasília. A tarefa nasce junto.
import { useState } from "react";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { createLegalDeadline, uploadFile } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { DEADLINE_CRITICALITY_LABELS } from "@/lib/labels/juridico";
import styles from "./page.module.css";

const EMPTY = { description: "", dueDate: "", dueTime: "", criticality: "MEDIUM", responsibleUserId: "", file: null };

export default function NewDeadlineForm({ legalCase, users, onCreated, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, responsibleUserId: legalCase.responsibleUserId || "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const needsResponsible = !legalCase.responsibleUserId;
  const valid = form.description.trim() && form.dueDate && form.file && (!needsResponsible || form.responsibleUserId);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit() {
    if (!valid) return;
    setError("");
    setBusy(true);
    try {
      const uploaded = await uploadFile(form.file);
      const created = await createLegalDeadline(legalCase.id, {
        description: form.description.trim(),
        dueAt: form.dueTime ? `${form.dueDate}T${form.dueTime}` : form.dueDate,
        criticality: form.criticality,
        responsibleUserId: form.responsibleUserId || undefined,
        sourceFileId: uploaded.id,
        sourceDocument: form.file.name,
      });
      setForm({ ...EMPTY, responsibleUserId: legalCase.responsibleUserId || "" });
      onCreated(created);
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível criar o prazo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.newDeadline} data-testid="new-deadline-form">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <FormField label="Descrição do prazo" htmlFor="f-deadline-desc" required>
        <Input id="f-deadline-desc" value={form.description} onChange={set("description")} placeholder="Ex.: Contestação" />
      </FormField>
      <div className={styles.formRow}>
        <FormField label="Vencimento" htmlFor="f-deadline-date" required helper="Só a data: vence às 23:59 (horário de Brasília).">
          <Input id="f-deadline-date" type="date" min="1900-01-01" max="2100-12-31" value={form.dueDate} onChange={set("dueDate")} />
        </FormField>
        <FormField label="Hora (opcional)" htmlFor="f-deadline-time" helper="Horário de Brasília.">
          <Input id="f-deadline-time" type="time" value={form.dueTime} onChange={set("dueTime")} />
        </FormField>
      </div>
      <div className={styles.formRow}>
        <FormField label="Criticidade" htmlFor="f-deadline-criticality" required>
          <Select id="f-deadline-criticality" value={form.criticality} onChange={set("criticality")}>
            {Object.entries(DEADLINE_CRITICALITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Responsável"
          htmlFor="f-deadline-responsible"
          required={needsResponsible}
          helper={needsResponsible ? "O processo não tem responsável: escolha quem responde pelo prazo." : "Vazio = responsável do processo."}
        >
          <Select id="f-deadline-responsible" value={form.responsibleUserId} onChange={set("responsibleUserId")}>
            <option value="">{needsResponsible ? "Selecione" : "Responsável do processo"}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField
        label="Documento de origem"
        htmlFor="f-deadline-source"
        required
        helper="Intimação, publicação ou decisão que originou o prazo — todo prazo precisa de origem verificável."
      >
        <input id="f-deadline-source" type="file" onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} />
      </FormField>
      <div className={styles.formActions}>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button size="sm" onClick={handleSubmit} loading={busy} disabled={!valid || busy}>Criar prazo</Button>
      </div>
    </div>
  );
}
