"use client";

// Caminho operacional do prazo (Caderno M5 §15; pedido da cliente: criar, ATRIBUIR, REMARCAR e concluir):
//  - reatribuir: responsibleUserId (+ motivo) — a API recusa usuário de fora da empresa e prazo crítico sem responsável;
//  - remarcar: dueAt (data, e hora opcional, de Brasília) + motivo — sem motivo a API recusa (LEGAL_DEADLINE_CHANGE_REASON_REQUIRED);
//  - reabrir: status PENDING de um prazo concluído (só com aprovação jurídica).
// A tela não bloqueia o motivo da remarcação: quem decide é o servidor, e a recusa aparece em português.
import { useState } from "react";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import FormField from "@/components/molecules/FormField/FormField";
import { updateLegalDeadline } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import styles from "./page.module.css";

const TITLES = { reassign: "Reatribuir responsável", reschedule: "Remarcar vencimento", reopen: "Reabrir prazo" };
const CONFIRM = { reassign: "Confirmar reatribuição", reschedule: "Confirmar remarcação", reopen: "Confirmar reabertura" };

// Data/hora de São Paulo a partir do instante gravado (para pré-preencher a remarcação).
function saoPauloParts(iso) {
  if (!iso) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export default function DeadlineChangeForm({ deadline, mode, users, onDone, onCancel }) {
  const initial = saoPauloParts(deadline.dueAt);
  const [form, setForm] = useState({ responsibleUserId: deadline.responsibleUserId || "", date: initial.date, time: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const id = (name) => `f-dl-${name}-${deadline.id}`;

  const valid = mode === "reassign" ? Boolean(form.responsibleUserId) && form.responsibleUserId !== (deadline.responsibleUserId || "") : mode === "reschedule" ? Boolean(form.date) : true;

  async function handleSave() {
    if (!valid) return;
    setBusy(true);
    setError("");
    const reason = form.reason.trim();
    const payload = mode === "reassign"
      ? { responsibleUserId: form.responsibleUserId }
      : mode === "reschedule"
        ? { dueAt: form.time ? `${form.date}T${form.time}` : form.date }
        : { status: "PENDING" };
    if (reason) payload.changeReason = reason;
    try {
      const updated = await updateLegalDeadline(deadline.id, payload);
      onDone(updated, mode);
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível alterar o prazo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.newDeadline} data-testid={`deadline-${mode}-form`}>
      <strong className={styles.deadlineDesc}>{TITLES[mode]}</strong>
      {error ? <p className={styles.deadlineDue} role="alert" data-testid="deadline-change-refusal">Alteração recusada: {error}</p> : null}
      <div className={styles.formRow}>
        {mode === "reassign" ? (
          <FormField label="Novo responsável" htmlFor={id("responsible")} required helper="Usuário desta empresa; a tarefa do prazo passa para ele.">
            <Select id={id("responsible")} value={form.responsibleUserId} onChange={set("responsibleUserId")}>
              <option value="">Selecione</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </Select>
          </FormField>
        ) : null}
        {mode === "reschedule" ? (
          <>
            <FormField label="Novo vencimento" htmlFor={id("date")} required helper="Só a data: vence às 23:59 de Brasília.">
              <Input id={id("date")} type="date" min="1900-01-01" max="2100-12-31" value={form.date} onChange={set("date")} />
            </FormField>
            <FormField label="Hora (opcional)" htmlFor={id("time")} helper="Horário de Brasília.">
              <Input id={id("time")} type="time" value={form.time} onChange={set("time")} />
            </FormField>
          </>
        ) : null}
        <FormField
          label={mode === "reschedule" ? "Motivo da remarcação" : "Motivo"}
          htmlFor={id("reason")}
          required={mode === "reschedule"}
          helper={mode === "reschedule" ? "Obrigatório: fica no histórico do prazo." : "Opcional: fica no histórico do prazo."}
        >
          <Input id={id("reason")} value={form.reason} onChange={set("reason")} placeholder={mode === "reschedule" ? "Ex.: Prazo devolvido por decisão publicada" : "Ex.: Redistribuição da carteira"} />
        </FormField>
      </div>
      <div className={styles.formActions}>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Voltar</Button>
        <Button size="sm" onClick={handleSave} loading={busy} disabled={busy || !valid}>{CONFIRM[mode]}</Button>
      </div>
    </div>
  );
}
