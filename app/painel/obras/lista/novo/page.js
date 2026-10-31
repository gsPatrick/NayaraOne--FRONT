"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { createProject } from "@/lib/api/construction";
import { listProperties } from "@/lib/api/properties";
import { listCostCenters } from "@/lib/api/finance";
import { apiFetch } from "@/lib/api/client";
import { dateOnlyInputToIso, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE, toNumber } from "@/lib/format";
import styles from "./page.module.css";

import { lookupFallback } from "@/lib/asyncState/lookup";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
export default function NovaObraPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [form, setForm] = useState({
    name: "",
    propertyId: "",
    responsibleUserId: "",
    costCenterId: "",
    budgetAmount: "",
    startsAt: "",
    endsAtPlanned: "",
  });

  // M9-D850: carregamento, erro, 403 e offline dos dados do formulário vêm do padrão único de estados.
  // Filtra apenas usuários ACTIVE no seletor de responsável. Centro de custo é opcional: sem finance:read a falha é registrada (lookupFallback) e o formulário abre.
  const formQuery = useAsyncState(
    async () => {
      const [properties, users, costCenters] = await Promise.all([listProperties(), apiFetch("/users?status=ACTIVE"), listCostCenters().catch(lookupFallback("os centros de custo"))]);
      return { properties: properties || [], users: users || [], costCenters: costCenters || [] };
    },
    { key: "obras-lista-novo", isEmpty: () => false }
  );
  const { properties = [], users = [], costCenters = [] } = formQuery.data || {};

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  const [dateErrors, setDateErrors] = useState({});
  function updateDate(field) {
    return (e) => {
      setDateErrors((prev) => ({ ...prev, [field]: isDateInputInvalid(e.target.validity) }));
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }
  function checkDate(field) {
    return (e) => setDateErrors((prev) => ({ ...prev, [field]: isDateInputInvalid(e.target.validity) }));
  }

  const isValid = form.name.trim().length > 0 && !dateErrors.startsAt && !dateErrors.endsAtPlanned;

  async function handleSubmit() {
    // BUG REAL CORRIGIDO (auditoria E2E ao vivo, Marco 6, Ciclo 8, 2026-10-06): duplo-clique
    // nativo disparava o handler 2x antes do React re-renderizar o `disabled` do botão, criando
    // 2 obras duplicadas — nenhum backend bloqueava, pois é um INSERT simples.
    if (submitting) return;
    if (!isValid) return;
    // FIX (auditoria E2E de browser, ciclo 7, 02/10/2026): "Orçamento (R$)" é opcional, então só
    // a checagem de string vazia deixava passar "," sozinho (toNumber(",") = NaN) sem avisar —
    // o backend descarta com segurança (JSON.stringify(NaN) vira null), mas o usuário não sabia
    // que o valor digitado foi ignorado.
    if (form.budgetAmount && Number.isNaN(toNumber(form.budgetAmount))) {
      setActionError('"Orçamento (R$)" não é um número válido.');
      return;
    }
    setActionError("");
    setSubmitting(true);
    try {
      const newProject = await createProject({
        propertyId: form.propertyId || undefined,
        name: form.name.trim(),
        responsibleUserId: form.responsibleUserId || undefined,
        costCenterId: form.costCenterId || undefined,
        budgetAmount: form.budgetAmount ? toNumber(form.budgetAmount) : undefined,
        startsAt: dateOnlyInputToIso(form.startsAt),
        endsAtPlanned: dateOnlyInputToIso(form.endsAtPlanned),
      });
      router.push(`/painel/obras/lista/${newProject.id}`);
    } catch (err) {
      setActionError(err?.message || "Erro ao criar obra.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Nova obra" backHref="/painel/obras/lista">
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <AsyncState result={formQuery}>
          {() => (
        <Card title="Dados da obra">
          <div className={styles.formGrid}>
            <div className={styles.span2}>
              <FormField label="Nome da obra" htmlFor="f-name" required>
                <Input id="f-name" value={form.name} onChange={update("name")} placeholder="Ex: Edifício Aurora — Reforma estrutural" />
              </FormField>
            </div>

            <FormField label="Imóvel vinculado" htmlFor="f-property" helper="Opcional">
              <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                <option value="">Nenhum</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Responsável" htmlFor="f-responsible" helper="Opcional">
              <Select id="f-responsible" value={form.responsibleUserId} onChange={update("responsibleUserId")}>
                <option value="">Nenhum</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Centro de custo" htmlFor="f-cost-center" helper="Opcional — usado no relatório de margem por obra">
              <Select id="f-cost-center" value={form.costCenterId} onChange={update("costCenterId")}>
                <option value="">Nenhum</option>
                {costCenters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Orçamento (R$)" htmlFor="f-budget" helper="Opcional">
              <DecimalInput id="f-budget" value={form.budgetAmount} onChange={update("budgetAmount")} placeholder="0,00" />
            </FormField>

            <FormField
              label="Data de início"
              htmlFor="f-starts"
              helper={dateErrors.startsAt ? undefined : "Opcional"}
              error={dateErrors.startsAt ? DATE_INPUT_ERROR_MESSAGE : undefined}
            >
              <Input
                id="f-starts"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                error={dateErrors.startsAt}
                value={form.startsAt}
                onChange={updateDate("startsAt")}
                onBlur={checkDate("startsAt")}
              />
            </FormField>

            <FormField
              label="Previsão de término"
              htmlFor="f-ends"
              helper={dateErrors.endsAtPlanned ? undefined : "Opcional"}
              error={dateErrors.endsAtPlanned ? DATE_INPUT_ERROR_MESSAGE : undefined}
            >
              <Input
                id="f-ends"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                error={dateErrors.endsAtPlanned}
                value={form.endsAtPlanned}
                onChange={updateDate("endsAtPlanned")}
                onBlur={checkDate("endsAtPlanned")}
              />
            </FormField>
          </div>
        </Card>
          )}
        </AsyncState>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/obras/lista")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid || !formQuery.data}>Criar obra</Button>
        </div>
      </div>
    </AppShell>
  );
}
