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
import BankSelect from "@/components/molecules/BankSelect/BankSelect";
import { PEOPLE } from "@/lib/mock/people";
import styles from "./page.module.css";

export default function NovaContaBancariaPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    label: "",
    ownerPersonId: "",
    bankCode: "",
    agency: "",
    accountNumber: "",
    pixKey: "",
  });

  const isValid = form.label.trim() && ((form.bankCode && form.agency && form.accountNumber) || form.pixKey);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    // Mock: em produção chamaria POST /v1/finance/bank-accounts (bankAccounts.service.js) —
    // nasce sempre com status PENDING_COOLDOWN, nunca ACTIVE direto.
    window.setTimeout(() => router.push("/painel/financeiro/contas-bancarias"), 500);
  }

  return (
    <AppShell title="Nova conta bancária" backHref="/painel/financeiro/contas-bancarias">
      <div className={styles.wrap}>
        <Alert tone="warning" title="Resfriamento antifraude de 48h">
          Toda conta nova nasce com status "Em resfriamento" e só fica elegível para pagamentos após 48h — essa regra é aplicada automaticamente, sem exceção.
        </Alert>

        <Card title="Dados da conta">
          <div className={styles.formGrid}>
            <FormField label="Nome/identificação da conta" htmlFor="f-label" required>
              <Input id="f-label" value={form.label} onChange={update("label")} placeholder="Ex: Marina Costa — repasse" />
            </FormField>

            <FormField label="Proprietário vinculado" htmlFor="f-owner" helper="Deixe em branco para conta operacional da empresa">
              <Select id="f-owner" value={form.ownerPersonId} onChange={update("ownerPersonId")}>
                <option value="">Conta operacional (sem proprietário)</option>
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.id}>{p.legalName}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Banco" htmlFor="f-bank">
              <BankSelect value={form.bankCode} onChange={(code) => setForm((prev) => ({ ...prev, bankCode: code }))} />
            </FormField>

            <FormField label="Agência" htmlFor="f-agency">
              <Input id="f-agency" value={form.agency} onChange={update("agency")} placeholder="Ex: 0021" />
            </FormField>

            <FormField label="Conta" htmlFor="f-accnum">
              <Input id="f-accnum" value={form.accountNumber} onChange={update("accountNumber")} placeholder="Ex: 88213-4" />
            </FormField>

            <FormField label="Chave PIX" htmlFor="f-pix" helper="Alternativa a banco/agência/conta">
              <Input id="f-pix" value={form.pixKey} onChange={update("pixKey")} placeholder="Ex: nome@email.com" />
            </FormField>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/financeiro/contas-bancarias")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar conta</Button>
        </div>
      </div>
    </AppShell>
  );
}
