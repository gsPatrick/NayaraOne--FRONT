"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { listContracts, createLegalCase } from "@/lib/api/legal";
import { listProperties } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import { CASE_TYPE_LABELS } from "@/lib/mock/legal";
import styles from "./page.module.css";

export default function NovoProcessoPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    caseNumber: "",
    caseType: "CONSULTATIVE",
    contractId: "",
    propertyId: "",
    responsibleUserId: "",
    summary: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listContracts(), listProperties(), apiFetch("/users")])
      .then(([contractsRes, propertiesRes, usersRes]) => {
        if (cancelled) return;
        setContracts(contractsRes || []);
        setProperties(propertiesRes || []);
        setUsers(usersRes || []);
        setForm((prev) => ({ ...prev, responsibleUserId: prev.responsibleUserId || usersRes?.[0]?.id || "" }));
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar dados."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const isValid = form.caseNumber.trim() && form.caseType && form.summary.trim();

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const legalCase = await createLegalCase({
        caseNumber: form.caseNumber,
        caseType: form.caseType,
        contractId: form.contractId || undefined,
        propertyId: form.propertyId || undefined,
        responsibleUserId: form.responsibleUserId || undefined,
        summary: form.summary,
      });
      router.push(`/painel/contratos/processos/${legalCase.id}`);
    } catch (err) {
      setActionError(err.message || "Erro ao criar processo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Novo processo" backHref="/painel/contratos/processos">
        <SkeletonDetail sections={1} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Novo processo" backHref="/painel/contratos/processos">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

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
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>{c.contractNumber}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Imóvel" htmlFor="f-property" helper="Opcional">
              <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                <option value="">Nenhum</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Responsável" htmlFor="f-responsible">
              <Select id="f-responsible" value={form.responsibleUserId} onChange={update("responsibleUserId")}>
                {users.map((u) => (
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
