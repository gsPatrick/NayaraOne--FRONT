"use client";

// Partes formais do processo (Caderno M5 §14): pessoa do cadastro + papel processual.
import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { listLegalCaseParties, addLegalCaseParty } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { CASE_PARTY_ROLE_LABELS } from "@/lib/labels/juridico";
import styles from "./page.module.css";

export default function CasePartiesCard({ legalCase, people, onChanged }) {
  const [parties, setParties] = useState([]);
  const [form, setForm] = useState({ personId: "", partyRole: "PLAINTIFF" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listLegalCaseParties(legalCase.id)
      .then((list) => alive && setParties(Array.isArray(list) ? list : []))
      .catch((err) => alive && setError(legalErrorMessage(err, "Não foi possível carregar as partes.")));
    return () => {
      alive = false;
    };
  }, [legalCase.id]);

  const personName = (id) => people.find((p) => p.id === id)?.legalName || "Pessoa sem acesso no cadastro";

  async function handleAdd() {
    if (!form.personId) return;
    setError("");
    setBusy(true);
    try {
      const created = await addLegalCaseParty(legalCase.id, form);
      setParties((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, personId: "" }));
      onChanged?.();
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível incluir a parte."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Partes do processo" subtitle="Autor, réu, testemunhas e terceiros interessados">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {parties.length === 0 ? (
        <EmptyState icon="users" title="Sem partes" description="Nenhuma parte formal registrada no processo." />
      ) : (
        parties.map((p) => (
          <div key={p.id} className={styles.deadlineRow}>
            <div className={styles.deadlineInfo}>
              <span className={styles.deadlineDesc}>{personName(p.personId)}</span>
            </div>
            <Badge tone="info">{CASE_PARTY_ROLE_LABELS[p.partyRole] || "Parte"}</Badge>
          </div>
        ))
      )}
      <div className={styles.formRow}>
        <FormField label="Pessoa" htmlFor="f-case-party-person">
          <Select id="f-case-party-person" value={form.personId} onChange={(e) => setForm((prev) => ({ ...prev, personId: e.target.value }))}>
            <option value="">Selecione</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.legalName}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Papel no processo" htmlFor="f-case-party-role">
          <Select id="f-case-party-role" value={form.partyRole} onChange={(e) => setForm((prev) => ({ ...prev, partyRole: e.target.value }))}>
            {Object.entries(CASE_PARTY_ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className={styles.formActions}>
        <Button size="sm" variant="secondary" onClick={handleAdd} loading={busy} disabled={busy || !form.personId}>Incluir parte</Button>
      </div>
    </Card>
  );
}
