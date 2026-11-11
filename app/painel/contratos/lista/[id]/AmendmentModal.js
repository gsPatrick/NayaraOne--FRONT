"use client";

// Novo aditivo (Caderno §13): motivo, versão base, vigência, alterações e cláusulas alteradas. Nasce em rascunho e fica
// assinado pela assinatura de cada signatário (registrada no card de aditivos).
import { useEffect, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import { createContractAmendment, listClauses, uploadFile } from "@/lib/api/legal";
import { CONTRACT_VERSION_STATUS_LABELS } from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { lookupFallback } from "@/lib/asyncState/lookup";
import styles from "./page.module.css";

const FIELD_OPTIONS = { totalValue: "Valor total", startsAt: "Início da vigência", endsAt: "Fim da vigência", propertyId: "Imóvel", OTHER: "Outro" };
const emptyChange = () => ({ field: "totalValue", customField: "", oldValue: "", newValue: "" });
const emptyClause = () => ({ code: "", change: "" });

export default function AmendmentModal({ open, onClose, contract, versions, onCreated }) {
  const [form, setForm] = useState({ reason: "", baseContractVersionId: "", effectiveFrom: "", effectiveUntil: "" });
  const [changes, setChanges] = useState([emptyChange()]);
  const [clauses, setClauses] = useState([]);
  const [library, setLibrary] = useState([]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = contract.approvedVersionId || (versions[versions.length - 1] || {}).id || "";
    setForm({ reason: "", baseContractVersionId: base, effectiveFrom: new Date().toISOString().slice(0, 10), effectiveUntil: "" });
    setChanges([emptyChange()]);
    setClauses([]);
    setFile(null);
    setError("");
    listClauses().catch(lookupFallback("a biblioteca de cláusulas")).then((list) => setLibrary(Array.isArray(list) ? list : []));
  }, [open, contract.approvedVersionId, versions]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const editRow = (setter, idx, field) => (e) => setter((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: e.target.value } : row)));

  const filledChanges = changes
    .map((c) => ({ field: c.field === "OTHER" ? c.customField.trim() : c.field, oldValue: c.oldValue.trim() || null, newValue: c.newValue.trim() || null }))
    .filter((c) => c.field && (c.oldValue || c.newValue));
  const filledClauses = clauses.filter((c) => c.code).map((c) => ({ code: c.code, change: c.change.trim() || null }));
  const valid = form.reason.trim() && form.baseContractVersionId && form.effectiveFrom && (filledChanges.length > 0 || filledClauses.length > 0)
    && (!form.effectiveUntil || form.effectiveUntil >= form.effectiveFrom);

  async function handleCreate() {
    if (!valid) return;
    setError("");
    setBusy(true);
    try {
      let documentFileId;
      if (file) documentFileId = (await uploadFile(file)).id;
      // A API exige ao menos uma alteração: só com cláusulas, cada cláusula alterada vira a alteração registrada.
      const payloadChanges = filledChanges.length
        ? filledChanges
        : filledClauses.map((c) => ({ field: `Cláusula ${c.code}`, oldValue: null, newValue: c.change }));
      const created = await createContractAmendment(contract.id, {
        reason: form.reason.trim(),
        changes: payloadChanges,
        changedClauses: filledClauses,
        baseContractVersionId: form.baseContractVersionId,
        effectiveFrom: form.effectiveFrom,
        effectiveUntil: form.effectiveUntil || undefined,
        documentFileId,
      });
      await onCreated(created);
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível criar o aditivo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Novo aditivo de contrato"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Voltar</Button>
          <Button onClick={handleCreate} loading={busy} disabled={!valid || busy} data-testid="amendment-create">Criar aditivo</Button>
        </>
      }
    >
      {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
      <p className={styles.partyRole}>O aditivo nasce em rascunho e fica assinado quando cada signatário assinar.</p>
      <div className={styles.formGrid}>
        <FormField label="Motivo do aditivo" htmlFor="f-am-reason" required>
          <Input id="f-am-reason" value={form.reason} onChange={set("reason")} placeholder="Ex.: Reajuste de valor por acordo entre as partes" />
        </FormField>
        <FormField label="Versão base do contrato" htmlFor="f-am-base" required>
          <Select id="f-am-base" value={form.baseContractVersionId} onChange={set("baseContractVersionId")}>
            <option value="">Selecione</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>Versão {v.versionNumber} ({CONTRACT_VERSION_STATUS_LABELS[v.status || "DRAFT"] || "Rascunho"})</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Vigência — início" htmlFor="f-am-from" required>
          <Input id="f-am-from" type="date" min="1900-01-01" max="2100-12-31" value={form.effectiveFrom} onChange={set("effectiveFrom")} />
        </FormField>
        <FormField label="Vigência — fim" htmlFor="f-am-until" helper="Opcional" error={form.effectiveUntil && form.effectiveUntil < form.effectiveFrom ? "O fim não pode ser antes do início." : undefined}>
          <Input id="f-am-until" type="date" min="1900-01-01" max="2100-12-31" value={form.effectiveUntil} onChange={set("effectiveUntil")} />
        </FormField>
      </div>

      <p className={styles.partyName} style={{ marginTop: 16 }}>Alterações</p>
      {changes.map((c, idx) => (
        <div key={idx} className={styles.formGrid}>
          <FormField label="Campo alterado" htmlFor={`f-am-field-${idx}`}>
            <Select id={`f-am-field-${idx}`} value={c.field} onChange={editRow(setChanges, idx, "field")}>
              {Object.entries(FIELD_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormField>
          {c.field === "OTHER" ? (
            <FormField label="Qual campo" htmlFor={`f-am-custom-${idx}`}>
              <Input id={`f-am-custom-${idx}`} value={c.customField} onChange={editRow(setChanges, idx, "customField")} placeholder="Ex.: Dia de vencimento" />
            </FormField>
          ) : null}
          <FormField label="Valor anterior" htmlFor={`f-am-old-${idx}`}>
            <Input id={`f-am-old-${idx}`} value={c.oldValue} onChange={editRow(setChanges, idx, "oldValue")} />
          </FormField>
          <FormField label="Novo valor" htmlFor={`f-am-new-${idx}`}>
            <Input id={`f-am-new-${idx}`} value={c.newValue} onChange={editRow(setChanges, idx, "newValue")} />
          </FormField>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => setChanges((prev) => [...prev, emptyChange()])}><Icon name="plus" size={14} /> Outra alteração</Button>

      <p className={styles.partyName} style={{ marginTop: 16 }}>Cláusulas alteradas</p>
      {clauses.map((c, idx) => (
        <div key={idx} className={styles.formGrid}>
          <FormField label="Cláusula" htmlFor={`f-am-clause-${idx}`}>
            <Select id={`f-am-clause-${idx}`} value={c.code} onChange={editRow(setClauses, idx, "code")}>
              <option value="">Selecione</option>
              {[...new Map(library.map((cl) => [cl.code, cl])).values()].map((cl) => <option key={cl.code} value={cl.code}>{cl.title}</option>)}
            </Select>
          </FormField>
          <FormField label="O que muda" htmlFor={`f-am-clause-change-${idx}`}>
            <Input id={`f-am-clause-change-${idx}`} value={c.change} onChange={editRow(setClauses, idx, "change")} placeholder="Ex.: novo índice de reajuste" />
          </FormField>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => setClauses((prev) => [...prev, emptyClause()])} data-testid="amendment-add-clause"><Icon name="plus" size={14} /> Incluir cláusula alterada</Button>

      <div className={styles.formGrid} style={{ marginTop: 16 }}>
        <FormField label="Documento do aditivo" htmlFor="f-am-file" helper="Opcional — a via assinada de cada signatário é registrada depois.">
          <input id="f-am-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </FormField>
      </div>
    </Modal>
  );
}
