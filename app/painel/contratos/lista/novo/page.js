"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Icon from "@/components/atoms/Icon/Icon";
import { PROPERTIES } from "@/lib/mock/properties";
import { PEOPLE } from "@/lib/mock/people";
import { CONTRACT_TYPE_LABELS, PARTY_ROLE_LABELS } from "@/lib/mock/legal";
import styles from "./page.module.css";

export default function NovoContratoPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contractType: "LEASE",
    propertyId: PROPERTIES[0]?.id || "",
    totalValue: "",
    startsAt: "",
    endsAt: "",
  });
  const [parties, setParties] = useState([]);
  const [newParty, setNewParty] = useState({ personId: PEOPLE[0]?.id || "", partyRole: "LANDLORD" });

  const isValid = form.propertyId && Number(form.totalValue) > 0 && parties.length > 0;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function addParty() {
    const person = PEOPLE.find((p) => p.id === newParty.personId);
    if (!person) return;
    setParties((prev) => [...prev, { id: `tmp-${Date.now()}`, personId: newParty.personId, partyRole: newParty.partyRole }]);
  }

  function removeParty(id) {
    setParties((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    // Mock: em produção isto chamaria POST /v1/legal/contracts (contracts.service.js)
    window.setTimeout(() => router.push("/painel/contratos/lista"), 500);
  }

  return (
    <AppShell title="Novo contrato" backHref="/painel/contratos/lista">
      <div className={styles.wrap}>
        <Alert tone="info" title="Máquina de estados">
          O contrato nasce em DRAFT e avança etapa por etapa (Documentos pendentes → Análise jurídica → Aprovado → Em assinatura → Assinado → Ativo) — a transição é feita na página de detalhe.
        </Alert>

        <Card title="Dados do contrato">
          <div className={styles.formGrid}>
            <FormField label="Tipo de contrato" htmlFor="f-type">
              <Select id="f-type" value={form.contractType} onChange={update("contractType")}>
                {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Imóvel" htmlFor="f-property" required>
              <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                {PROPERTIES.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Valor total (R$)" htmlFor="f-value" required>
              <Input id="f-value" type="number" min="0" step="0.01" value={form.totalValue} onChange={update("totalValue")} placeholder="0,00" />
            </FormField>

            <FormField label="Início de vigência" htmlFor="f-starts" helper="Opcional">
              <Input id="f-starts" type="date" value={form.startsAt} onChange={update("startsAt")} />
            </FormField>

            <FormField label="Fim de vigência" htmlFor="f-ends" helper="Opcional — relevante para locação">
              <Input id="f-ends" type="date" value={form.endsAt} onChange={update("endsAt")} />
            </FormField>
          </div>
        </Card>

        <Card title="Partes do contrato" subtitle="Adicione ao menos uma parte (ex: locador e locatário, ou comprador e vendedor)">
          <div className={styles.partiesList}>
            {parties.length === 0 ? (
              <p className={styles.emptyText}>Nenhuma parte adicionada ainda.</p>
            ) : (
              parties.map((party) => {
                const person = PEOPLE.find((p) => p.id === party.personId);
                return (
                  <div key={party.id} className={styles.partyRow}>
                    <div className={styles.partyInfo}>
                      <span className={styles.partyName}>{person?.legalName || "—"}</span>
                      <span className={styles.partyRole}>{PARTY_ROLE_LABELS[party.partyRole]}</span>
                    </div>
                    <button type="button" className={styles.removeBtn} onClick={() => removeParty(party.id)} aria-label="Remover parte">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.addPartyRow}>
            <FormField label="Pessoa" htmlFor="f-party-person">
              <Select id="f-party-person" value={newParty.personId} onChange={(e) => setNewParty((prev) => ({ ...prev, personId: e.target.value }))}>
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.id}>{p.legalName}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Papel" htmlFor="f-party-role">
              <Select id="f-party-role" value={newParty.partyRole} onChange={(e) => setNewParty((prev) => ({ ...prev, partyRole: e.target.value }))}>
                {Object.entries(PARTY_ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>
            <Button variant="secondary" onClick={addParty}>
              <Icon name="plus" size={16} /> Adicionar
            </Button>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/contratos/lista")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar contrato</Button>
        </div>
      </div>
    </AppShell>
  );
}
