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
import NatureBadge from "@/components/molecules/NatureBadge/NatureBadge";
import { BANK_ACCOUNTS, COST_CENTERS, RESULT_CENTERS, ENTRY_NATURE_LABELS } from "@/lib/mock/finance";
import styles from "./page.module.css";

export default function NovoLancamentoPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    entryType: "DEBIT",
    nature: "PAYABLE",
    bankAccountId: BANK_ACCOUNTS[0]?.id || "",
    costCenterId: "",
    resultCenterId: "",
    dueAt: "",
    idempotencyKey: "",
  });

  const isValid = form.description.trim() && Number(form.amount) > 0 && form.bankAccountId;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    // Mock: em produção isto chamaria POST /v1/finance/entries (financialEntries.service.js)
    window.setTimeout(() => router.push("/painel/financeiro/lancamentos"), 500);
  }

  return (
    <AppShell title="Novo lançamento" backHref="/painel/financeiro/lancamentos">
      <div className={styles.wrap}>
        <Alert tone="info" title="Ledger imutável (FIN-003/FIN-010)">
          Após criado, um lançamento nunca é editado em valor — correções sempre geram um lançamento de estorno.
        </Alert>

        <Card title="Dados do lançamento">
          <div className={styles.formGrid}>
            <FormField label="Descrição" htmlFor="f-desc" required>
              <Input id="f-desc" value={form.description} onChange={update("description")} placeholder="Ex: Aluguel — Edifício Aurora Apto 302" />
            </FormField>

            <FormField label="Valor (R$)" htmlFor="f-amount" required>
              <Input id="f-amount" type="number" min="0" step="0.01" value={form.amount} onChange={update("amount")} placeholder="0,00" />
            </FormField>

            <FormField label="Natureza" htmlFor="f-nature">
              <div className={styles.natureRow}>
                <Select id="f-nature" value={form.nature} onChange={update("nature")}>
                  {Object.entries(ENTRY_NATURE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
                <NatureBadge nature={form.nature} />
              </div>
            </FormField>

            <FormField label="Tipo de lançamento" htmlFor="f-type">
              <Select id="f-type" value={form.entryType} onChange={update("entryType")}>
                <option value="DEBIT">Débito</option>
                <option value="CREDIT">Crédito</option>
              </Select>
            </FormField>

            <FormField label="Conta bancária" htmlFor="f-account" required>
              <Select id="f-account" value={form.bankAccountId} onChange={update("bankAccountId")}>
                {BANK_ACCOUNTS.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Vencimento" htmlFor="f-due">
              <Input id="f-due" type="date" value={form.dueAt} onChange={update("dueAt")} />
            </FormField>

            <FormField label="Centro de custo" htmlFor="f-cc" helper="Opcional">
              <Select id="f-cc" value={form.costCenterId} onChange={update("costCenterId")}>
                <option value="">Nenhum</option>
                {COST_CENTERS.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Centro de resultado" htmlFor="f-rc" helper="Opcional">
              <Select id="f-rc" value={form.resultCenterId} onChange={update("resultCenterId")}>
                <option value="">Nenhum</option>
                {RESULT_CENTERS.map((r) => (
                  <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Chave de idempotência" htmlFor="f-idem" helper="Opcional — evita duplicidade se reenviado">
              <Input id="f-idem" value={form.idempotencyKey} onChange={update("idempotencyKey")} placeholder="Ex: aluguel-prop-1-ago" />
            </FormField>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/financeiro/lancamentos")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar lançamento</Button>
        </div>
      </div>
    </AppShell>
  );
}
