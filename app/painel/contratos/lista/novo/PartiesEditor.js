"use client";

// Partes do contrato em criação: pessoa, papel e procurador opcional (com procurador, o checklist exige procuração).
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import { PARTY_ROLE_LABELS } from "@/lib/labels/juridico";
import styles from "./page.module.css";

export default function PartiesEditor({ people, parties, onChange, subtitle }) {
  const [newParty, setNewParty] = useState({ personId: "", partyRole: "LANDLORD", representedByPersonId: "" });
  const personId = newParty.personId || people[0]?.id || "";
  const nameOf = (id) => people.find((p) => p.id === id)?.legalName || "Pessoa não encontrada";

  function addParty() {
    if (!personId) return;
    const representedByPersonId = newParty.representedByPersonId && newParty.representedByPersonId !== personId ? newParty.representedByPersonId : "";
    onChange([...parties, { id: `tmp-${Date.now()}`, personId, partyRole: newParty.partyRole, representedByPersonId }]);
    setNewParty((prev) => ({ ...prev, representedByPersonId: "" }));
  }

  return (
    <Card title="Partes do contrato" subtitle={subtitle}>
      <div className={styles.partiesList}>
        {parties.length === 0 ? (
          <p className={styles.emptyText}>Nenhuma parte adicionada ainda.</p>
        ) : (
          parties.map((party) => (
            <div key={party.id} className={styles.partyRow}>
              <div className={styles.partyInfo}>
                <span className={styles.partyName}>{nameOf(party.personId)}</span>
                <span className={styles.partyRole}>
                  {PARTY_ROLE_LABELS[party.partyRole] || "Parte"}
                  {party.representedByPersonId ? ` · representada por ${nameOf(party.representedByPersonId)}` : ""}
                </span>
              </div>
              <button type="button" className={styles.removeBtn} onClick={() => onChange(parties.filter((p) => p.id !== party.id))} aria-label="Remover parte">
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className={styles.addPartyRow}>
        <FormField label="Pessoa" htmlFor="f-party-person">
          <Select id="f-party-person" value={personId} onChange={(e) => setNewParty((prev) => ({ ...prev, personId: e.target.value }))}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.legalName}</option>)}
          </Select>
        </FormField>
        <FormField label="Papel" htmlFor="f-party-role">
          <Select id="f-party-role" value={newParty.partyRole} onChange={(e) => setNewParty((prev) => ({ ...prev, partyRole: e.target.value }))}>
            {Object.entries(PARTY_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormField>
        <FormField label="Procurador" htmlFor="f-party-proxy" helper="Opcional">
          <Select id="f-party-proxy" value={newParty.representedByPersonId} onChange={(e) => setNewParty((prev) => ({ ...prev, representedByPersonId: e.target.value }))}>
            <option value="">Sem procurador</option>
            {people.filter((p) => p.id !== personId).map((p) => <option key={p.id} value={p.id}>{p.legalName}</option>)}
          </Select>
        </FormField>
        <Button variant="secondary" onClick={addParty} data-testid="contract-add-party">
          <Icon name="plus" size={16} /> Adicionar
        </Button>
      </div>
    </Card>
  );
}
