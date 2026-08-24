"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { listContracts, listInspections, createKeyDelivery } from "@/lib/api/legal";
import { listPeople } from "@/lib/api/people";
import styles from "./page.module.css";

export default function NovaEntregaChavesPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contractId: "",
    inspectionId: "",
    deliveredToPersonId: "",
    notes: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listContracts(), listInspections(), listPeople()])
      .then(([contractsRes, inspectionsRes, peopleRes]) => {
        if (cancelled) return;
        setContracts(contractsRes || []);
        setInspections(inspectionsRes || []);
        setPeople(peopleRes || []);
        setForm((prev) => ({
          ...prev,
          contractId: prev.contractId || contractsRes?.[0]?.id || "",
          deliveredToPersonId: prev.deliveredToPersonId || peopleRes?.[0]?.id || "",
        }));
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar dados."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const isValid = form.contractId && form.deliveredToPersonId;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const delivery = await createKeyDelivery({
        contractId: form.contractId,
        inspectionId: form.inspectionId || undefined,
        deliveredToPersonId: form.deliveredToPersonId,
        notes: form.notes || undefined,
      });
      router.push(`/painel/contratos/entrega-chaves/${delivery.id}`);
    } catch (err) {
      setActionError(err.message || "Erro ao criar entrega de chaves.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Nova entrega de chaves" backHref="/painel/contratos/entrega-chaves">
        <SkeletonDetail sections={1} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Nova entrega de chaves" backHref="/painel/contratos/entrega-chaves">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Alert tone="info" title="Trava de liberação">
          A liberação efetiva das chaves só é permitida quando o contrato estiver assinado (SIGNED) ou ativo (ACTIVE) e, se houver vistoria de entrada vinculada, ela precisa estar concluída.
        </Alert>

        <Card title="Dados da entrega">
          <div className={styles.formGrid}>
            <FormField label="Contrato" htmlFor="f-contract" required>
              <Select id="f-contract" value={form.contractId} onChange={update("contractId")}>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>{c.contractNumber}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Vistoria vinculada" htmlFor="f-inspection" helper="Opcional — vistoria de entrada (CHECK_IN)">
              <Select id="f-inspection" value={form.inspectionId} onChange={update("inspectionId")}>
                <option value="">Nenhuma</option>
                {inspections.map((i) => (
                  <option key={i.id} value={i.id}>{i.id} — {i.inspectionType}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Entregue para" htmlFor="f-person" required>
              <Select id="f-person" value={form.deliveredToPersonId} onChange={update("deliveredToPersonId")}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.legalName}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Observações" htmlFor="f-notes" helper="Opcional">
            <textarea
              id="f-notes"
              className={styles.textarea}
              value={form.notes}
              onChange={update("notes")}
              placeholder="Ex: Entregues 2 jogos de chave + controle do portão."
              rows={4}
            />
          </FormField>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/contratos/entrega-chaves")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar entrega</Button>
        </div>
      </div>
    </AppShell>
  );
}
