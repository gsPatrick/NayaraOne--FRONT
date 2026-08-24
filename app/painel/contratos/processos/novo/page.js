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
import { CONTRACTS, CASE_TYPE_LABELS } from "@/lib/mock/legal";
import { PROPERTIES } from "@/lib/mock/properties";
import { USERS } from "@/lib/mock/users";
import styles from "./page.module.css";

export default function NovoProcessoPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    caseNumber: "",
    caseType: "CONSULTATIVE",
    contractId: "",
    propertyId: "",
    responsibleUserId: USERS[0]?.id || "",
    summary: "",
  });

  const isValid = form.caseNumber.trim() && form.caseType && form.summary.trim();

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    // Mock: em produção isto chamaria POST /v1/legal/cases (legalCases.service.js)
    window.setTimeout(() => router.push("/painel/contratos/processos"), 500);
  }

  return (
    <AppShell title="Novo processo" backHref="/painel/contratos/processos">
      <div className={styles.wrap}>
        <Alert tone="info" title="Contencioso, consultivo ou cobrança">
          Vincule o processo a um contrato e/ou imóvel quando aplicável — ambos são opcionais.
        </Alert>

        <Card title="Dados do processo">
          <div className={styles.formGrid}>
            <FormField label="Número do processo" htmlFor="f-number" required>
              <Input id="f-number" value={form.caseNumber} onChange={update("caseNumber")} placeholder="Ex: PROC-2026-030" />
            </FormField>

            <FormField label="Tipo de processo" htmlFor="f-type" required>
              <Select id="f-type" value={form.caseType} onChange={update("caseType")}>
                {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Contrato" htmlFor="f-contract" helper="Opcional">
              <Select id="f-contract" value={form.contractId} onChange={update("contractId")}>
                <option value="">Nenhum</option>
                {CONTRACTS.map((c) => (
                  <option key={c.id} value={c.id}>{c.contractNumber}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Imóvel" htmlFor="f-property" helper="Opcional">
              <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                <option value="">Nenhum</option>
                {PROPERTIES.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Responsável" htmlFor="f-responsible">
              <Select id="f-responsible" value={form.responsibleUserId} onChange={update("responsibleUserId")}>
                {USERS.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Resumo" htmlFor="f-summary" required>
            <textarea
              id="f-summary"
              className={styles.textarea}
              value={form.summary}
              onChange={update("summary")}
              placeholder="Descreva o objeto do processo..."
              rows={4}
            />
          </FormField>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/contratos/processos")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar processo</Button>
        </div>
      </div>
    </AppShell>
  );
}
