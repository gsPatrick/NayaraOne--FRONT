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
import { listPeople } from "@/lib/api/people";
import { listContracts, createGuarantee } from "@/lib/api/legal";
import { GUARANTEE_TYPE_LABELS } from "@/lib/mock/legal";
import styles from "./page.module.css";

export default function NovaGarantiaPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contractId: "",
    guaranteeType: "GUARANTOR",
    guarantorPersonId: "",
    value: "",
    startsAt: "",
    endsAt: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listContracts(), listPeople()])
      .then(([contractsRes, peopleRes]) => {
        if (cancelled) return;
        setContracts(contractsRes || []);
        setPeople(peopleRes || []);
        setForm((prev) => ({
          ...prev,
          contractId: prev.contractId || contractsRes?.[0]?.id || "",
          guarantorPersonId: prev.guarantorPersonId || peopleRes?.[0]?.id || "",
        }));
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar dados."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const isGuarantor = form.guaranteeType === "GUARANTOR";
  const isValid = form.contractId && form.guaranteeType && (!isGuarantor || form.guarantorPersonId);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      await createGuarantee(form.contractId, {
        guaranteeType: form.guaranteeType,
        guarantorPersonId: isGuarantor ? form.guarantorPersonId : undefined,
        value: form.value ? Number(form.value) : undefined,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
      });
      router.push("/painel/contratos/garantias");
    } catch (err) {
      setActionError(err.message || "Erro ao criar garantia.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Nova garantia" backHref="/painel/contratos/garantias">
        <SkeletonDetail sections={1} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Nova garantia" backHref="/painel/contratos/garantias">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Alert tone="info" title="Fiador exige pessoa vinculada">
          Quando o tipo de garantia for "Fiador", é necessário indicar a pessoa que responde como fiadora do contrato.
        </Alert>

        <Card title="Dados da garantia">
          <div className={styles.formGrid}>
            <FormField label="Contrato" htmlFor="f-contract" required>
              <Select id="f-contract" value={form.contractId} onChange={update("contractId")}>
                {contracts.map((c) => (
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
                  {people.map((p) => (
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
