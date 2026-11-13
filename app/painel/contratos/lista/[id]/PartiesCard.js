"use client";

// Partes do contrato (Caderno §7): papel e, quando houver, o procurador que representa a parte — é esse cadastro que
// faz o checklist exigir procuração. Partes só entram enquanto o contrato está em rascunho ou aguardando documentos.
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import { addContractParty } from "@/lib/api/legal";
import { PARTY_ROLE_LABELS } from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import styles from "./page.module.css";

const EDITABLE = ["DRAFT", "DOCUMENTS_PENDING"];

export default function PartiesCard({ contract, parties, people, personOf, onChanged, onNotice }) {
  const [form, setForm] = useState({ personId: "", partyRole: "LANDLORD", representedByPersonId: "" });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const editable = EDITABLE.includes(contract.status);

  async function handleAdd() {
    if (!form.personId) return;
    setError("");
    setBusy(true);
    try {
      await addContractParty(contract.id, form);
      setForm({ personId: "", partyRole: "LANDLORD", representedByPersonId: "" });
      setOpen(false);
      onNotice({ tone: "success", text: "Parte incluída no contrato." });
      await onChanged();
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível incluir a parte."));
    } finally {
      setBusy(false);
    }
  }

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  return (
    <Card
      title="Partes do contrato"
      subtitle="Pessoas vinculadas, seus papéis e procuradores"
      actions={editable && !open ? <Button size="sm" variant="secondary" onClick={() => { setError(""); setOpen(true); }}><Icon name="plus" size={14} /> Adicionar parte</Button> : null}
    >
      {parties.length === 0 ? (
        <EmptyState icon="users" title="Sem partes" description="Nenhuma parte cadastrada." />
      ) : (
        parties.map((party) => {
          const person = personOf(party.personId);
          const proxy = party.representedByPersonId ? personOf(party.representedByPersonId) : null;
          return (
            <div key={party.id} className={styles.partyRow}>
              <Avatar name={person?.legalName || "?"} size="sm" />
              <div className={styles.partyInfo}>
                <span className={styles.partyName}>{person?.legalName || "Pessoa não encontrada"}</span>
                <span className={styles.partyRole}>
                  {PARTY_ROLE_LABELS[party.partyRole] || "Parte"}
                  {party.representedByPersonId ? ` · representada por ${proxy?.legalName || "procurador cadastrado"}` : ""}
                </span>
              </div>
            </div>
          );
        })
      )}

      {open ? (
        <div style={{ marginTop: 12 }}>
          {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
          <div className={styles.formGrid}>
            <FormField label="Pessoa" htmlFor="f-add-party-person" required>
              <Select id="f-add-party-person" value={form.personId} onChange={set("personId")}>
                <option value="">Selecione</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.legalName}</option>)}
              </Select>
            </FormField>
            <FormField label="Papel" htmlFor="f-add-party-role" required>
              <Select id="f-add-party-role" value={form.partyRole} onChange={set("partyRole")}>
                {Object.entries(PARTY_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </FormField>
            <FormField label="Representada por procurador" htmlFor="f-add-party-proxy" helper="Opcional — com procurador, o checklist passa a exigir a procuração.">
              <Select id="f-add-party-proxy" value={form.representedByPersonId} onChange={set("representedByPersonId")}>
                <option value="">Sem procurador</option>
                {people.filter((p) => p.id !== form.personId).map((p) => <option key={p.id} value={p.id}>{p.legalName}</option>)}
              </Select>
            </FormField>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Button size="sm" onClick={handleAdd} loading={busy} disabled={busy || !form.personId}>Incluir parte</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Voltar</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
