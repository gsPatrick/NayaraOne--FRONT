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
import { CONTRACTS, GUARANTEE_TYPE_LABELS } from "@/lib/mock/legal";
import { PEOPLE } from "@/lib/mock/people";
import styles from "./page.module.css";

export default function NovaGarantiaPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contractId: CONTRACTS[0]?.id || "",
    guaranteeType: "GUARANTOR",
    guarantorPersonId: PEOPLE[0]?.id || "",
    value: "",
    startsAt: "",
    endsAt: "",
  });

  const isGuarantor = form.guaranteeType === "GUARANTOR";
  const isValid = form.contractId && form.guaranteeType && (!isGuarantor || form.guarantorPersonId);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    // Mock: em produção isto chamaria POST /v1/legal/guarantees (guarantees.service.js)
    window.setTimeout(() => router.push("/painel/contratos/garantias"), 500);
  }

  return (
    <AppShell title="Nova garantia" backHref="/painel/contratos/garantias">
      <div className={styles.wrap}>
        <Alert tone="info" title="Fiador exige pessoa vinculada">
          Quando o tipo de garantia for "Fiador", é necessário indicar a pessoa que responde como fiadora do contrato.
        </Alert>

        <Card title="Dados da garantia">
          <div className={styles.formGrid}>
            <FormField label="Contrato" htmlFor="f-contract" required>
              <Select id="f-contract" value={form.contractId} onChange={update("contractId")}>
                {CONTRACTS.map((c) => (
                  <option key={c.id} value={c.id}>{c.contractNumber}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Tipo de garantia" htmlFor="f-type" required>
              <Select id="f-type" value={form.guaranteeType} onChange={update("guaranteeType")}>
                {Object.entries(GUARANTEE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>

            {isGuarantor ? (
              <FormField label="Fiador" htmlFor="f-guarantor" required helper="Pessoa que responde como fiadora">
                <Select id="f-guarantor" value={form.guarantorPersonId} onChange={update("guarantorPersonId")}>
                  {PEOPLE.map((p) => (
                    <option key={p.id} value={p.id}>{p.legalName}</option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <FormField label="Valor (R$)" htmlFor="f-value" helper="Opcional — relevante para seguro-fiança, caução e título de capitalização">
                <Input id="f-value" type="number" min="0" step="0.01" value={form.value} onChange={update("value")} placeholder="0,00" />
              </FormField>
            )}

            <FormField label="Início de vigência" htmlFor="f-starts" helper="Opcional">
              <Input id="f-starts" type="date" value={form.startsAt} onChange={update("startsAt")} />
            </FormField>

            <FormField label="Fim de vigência" htmlFor="f-ends" helper="Opcional">
              <Input id="f-ends" type="date" value={form.endsAt} onChange={update("endsAt")} />
            </FormField>

            {isGuarantor ? (
              <FormField label="Valor (R$)" htmlFor="f-value-2" helper="Opcional">
                <Input id="f-value-2" type="number" min="0" step="0.01" value={form.value} onChange={update("value")} placeholder="0,00" />
              </FormField>
            ) : null}
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/contratos/garantias")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar garantia</Button>
        </div>
      </div>
    </AppShell>
  );
}
