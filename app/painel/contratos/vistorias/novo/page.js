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
import Icon from "@/components/atoms/Icon/Icon";
import Badge from "@/components/atoms/Badge/Badge";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { listProperties } from "@/lib/api/properties";
import { listContracts, createInspection, addInspectionItem } from "@/lib/api/legal";
import { INSPECTION_TYPE_LABELS, CONDITION_LABELS, CONDITION_TONE } from "@/lib/mock/legal";
import styles from "./page.module.css";

export default function NovaVistoriaPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    contractId: "",
    inspectionType: "CHECK_IN",
    scheduledAt: "",
  });
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ itemName: "", condition: "GOOD", notes: "" });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listProperties(), listContracts()])
      .then(([propertiesRes, contractsRes]) => {
        if (cancelled) return;
        setProperties(propertiesRes || []);
        setContracts(contractsRes || []);
        setForm((prev) => ({ ...prev, propertyId: prev.propertyId || propertiesRes?.[0]?.id || "" }));
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar dados."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const isValid = form.propertyId && form.inspectionType && form.scheduledAt;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function addItem() {
    if (!newItem.itemName.trim()) return;
    setItems((prev) => [...prev, { id: `tmp-${Date.now()}`, ...newItem }]);
    setNewItem({ itemName: "", condition: "GOOD", notes: "" });
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const inspection = await createInspection({
        propertyId: form.propertyId,
        contractId: form.contractId || undefined,
        inspectionType: form.inspectionType,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });
      for (const item of items) {
        await addInspectionItem(inspection.id, { itemName: item.itemName, condition: item.condition, notes: item.notes || undefined });
      }
      router.push(`/painel/contratos/vistorias/${inspection.id}`);
    } catch (err) {
      setActionError(err.message || "Erro ao criar vistoria.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Nova vistoria" backHref="/painel/contratos/vistorias">
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Nova vistoria" backHref="/painel/contratos/vistorias">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Alert tone="info" title="Itens da vistoria">
          Adicione os itens vistoriados (opcional na criação) — eles ficam registrados na página de detalhe, junto ao laudo comparativo entrada/saída.
        </Alert>

        <Card title="Dados da vistoria">
          <div className={styles.formGrid}>
            <FormField label="Imóvel" htmlFor="f-property" required>
              <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
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

            <FormField label="Tipo de vistoria" htmlFor="f-type" required>
              <Select id="f-type" value={form.inspectionType} onChange={update("inspectionType")}>
                {Object.entries(INSPECTION_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Data e hora agendada" htmlFor="f-scheduled" required>
              <Input id="f-scheduled" type="datetime-local" value={form.scheduledAt} onChange={update("scheduledAt")} />
            </FormField>
          </div>
        </Card>

        <Card title="Itens da vistoria" subtitle="Adicione os itens que serão vistoriados">
          <div className={styles.itemsList}>
            {items.length === 0 ? (
              <p className={styles.emptyText}>Nenhum item adicionado ainda.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.itemName}</span>
                    {item.notes ? <span className={styles.itemNotes}>{item.notes}</span> : null}
                  </div>
                  <Badge tone={CONDITION_TONE[item.condition]}>{CONDITION_LABELS[item.condition]}</Badge>
                  <button type="button" className={styles.removeBtn} onClick={() => removeItem(item.id)} aria-label="Remover item">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className={styles.addItemRow}>
            <FormField label="Item" htmlFor="f-item-name">
              <Input id="f-item-name" value={newItem.itemName} onChange={(e) => setNewItem((prev) => ({ ...prev, itemName: e.target.value }))} placeholder="Ex: Pintura — sala" />
            </FormField>
            <FormField label="Condição" htmlFor="f-item-condition">
              <Select id="f-item-condition" value={newItem.condition} onChange={(e) => setNewItem((prev) => ({ ...prev, condition: e.target.value }))}>
                {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Observações" htmlFor="f-item-notes" helper="Opcional">
              <Input id="f-item-notes" value={newItem.notes} onChange={(e) => setNewItem((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Ex: Sem marcas ou manchas" />
            </FormField>
            <Button variant="secondary" onClick={addItem}>
              <Icon name="plus" size={16} /> Adicionar item
            </Button>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/contratos/vistorias")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar vistoria</Button>
        </div>
      </div>
    </AppShell>
  );
}
