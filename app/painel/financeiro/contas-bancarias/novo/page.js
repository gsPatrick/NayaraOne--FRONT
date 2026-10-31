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
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import BankSelect from "@/components/molecules/BankSelect/BankSelect";
import { listPeople } from "@/lib/api/people";
import { createBankAccount } from "@/lib/api/finance";
import styles from "./page.module.css";

export default function NovaContaBancariaPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [form, setForm] = useState({
    ownerPersonId: "",
    bankCode: "",
    agency: "",
    accountNumber: "",
    pixKey: "",
  });

  // M9-D940: a lista de proprietários vem do padrão único de estados (carregando, erro com "tentar de novo", sem acesso, sem conexão).
  // Lista vazia é válida: a conta pode ser operacional, sem proprietário.
  const peopleQuery = useAsyncState(() => listPeople().then((pp) => pp || []), { key: "contas-bancarias-novo:pessoas", isEmpty: () => false });
  const people = peopleQuery.data || [];

  const isValid = (form.bankCode && form.agency && form.accountNumber) || form.pixKey;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    setActionError("");
    try {
      await createBankAccount({
        ownerPersonId: form.ownerPersonId || undefined,
        bankCode: form.bankCode || undefined,
        agency: form.agency || undefined,
        accountNumber: form.accountNumber || undefined,
        pixKey: form.pixKey || undefined,
      });
      router.push("/painel/financeiro/contas-bancarias");
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a conta bancária.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Nova conta bancária" backHref="/painel/financeiro/contas-bancarias">
      <div className={styles.wrap}>
        <Alert tone="warning" title="Resfriamento antifraude de 48h">
          Toda conta nova nasce com status “Em resfriamento” e só fica elegível para pagamentos após 48h — essa regra é aplicada automaticamente, sem exceção.
        </Alert>

        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <AsyncState result={peopleQuery} loadingLabel="Carregando proprietários...">
          <Card title="Dados da conta">
            <div className={styles.formGrid}>
              <FormField label="Proprietário vinculado" htmlFor="f-owner" helper="Deixe em branco para conta operacional da empresa">
                <Select id="f-owner" value={form.ownerPersonId} onChange={update("ownerPersonId")}>
                  <option value="">Conta operacional (sem proprietário)</option>
                  {people.map((p) => (
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
        </AsyncState>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/financeiro/contas-bancarias")}>Cancelar</Button>
          <Button requires="finance:bankAccounts" onClick={handleSubmit} loading={submitting} disabled={!isValid || peopleQuery.status !== "CONTENT"}>Criar conta</Button>
        </div>
      </div>
    </AppShell>
  );
}
