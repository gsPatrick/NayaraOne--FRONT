"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import { createInsurancePolicy } from "@/lib/api/procurement";
import { listContracts } from "@/lib/api/legal";
import { listProperties } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";

export default function NovaApolicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  // BUG REAL CORRIGIDO (auditoria contratual, 2026-10-07): o formulário deixava criar uma
  // apólice inteiramente vazia (nenhum campo era obrigatório no front, e o backend aceita
  // coverageSummary ausente) — o usuário conseguia gerar registros "fantasma" sem nenhuma
  // informação de cobertura, sem nenhum aviso. coverageSummary agora é obrigatório no front.
  const [form, setForm] = useState({ coverageSummary: "", propertyId: "", contractId: "", partyPersonId: "", partyRole: "INSURED" });
  const [properties, setProperties] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listProperties(), listContracts(), listPeople()])
      .then(([props, contrs, ppl]) => {
        setProperties(props || []);
        setContracts(contrs || []);
        setPeople(ppl || []);
      })
      .catch((err) => setActionError(err?.message || "Não foi possível carregar os dados de apoio."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!form.coverageSummary.trim()) {
      setActionError('O campo "Resumo da cobertura" é obrigatório.');
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      const policy = await createInsurancePolicy({
        coverageSummary: form.coverageSummary.trim(),
        propertyId: form.propertyId || undefined,
        contractId: form.contractId || undefined,
        parties: form.partyPersonId ? [{ personId: form.partyPersonId, partyRole: form.partyRole }] : undefined,
      });
      router.push(`/painel/compras/seguros/${policy.id}`);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a apólice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Nova apólice de seguro" backHref="/painel/compras/seguros">
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <Card title="Dados da apólice" subtitle="A apólice é criada como rascunho. Depois, use &quot;Cotar&quot; pra consultar a seguradora e &quot;Emitir&quot; pra confirmar.">
        <FormField label="Resumo da cobertura desejada" required>
          <Input
            value={form.coverageSummary}
            onChange={(e) => setForm((p) => ({ ...p, coverageSummary: e.target.value }))}
            placeholder="Ex.: Seguro-fiança locatícia — apartamento Rua X"
          />
        </FormField>
        <FormField label="Imóvel vinculado (opcional)">
          <Select value={form.propertyId} onChange={(e) => setForm((p) => ({ ...p, propertyId: e.target.value }))} disabled={loading}>
            <option value="">Nenhum</option>
            {properties.map((pr) => (
              <option key={pr.id} value={pr.id}>{pr.title || pr.internalCode || pr.id}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Contrato de locação vinculado (opcional)">
          <Select value={form.contractId} onChange={(e) => setForm((p) => ({ ...p, contractId: e.target.value }))} disabled={loading}>
            <option value="">Nenhum</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>{c.code || c.id}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Segurado / beneficiário (opcional)">
          <Select value={form.partyPersonId} onChange={(e) => setForm((p) => ({ ...p, partyPersonId: e.target.value }))} disabled={loading}>
            <option value="">Nenhum</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.legalName || p.name || p.id}</option>
            ))}
          </Select>
        </FormField>
        {form.partyPersonId ? (
          <FormField label="Papel do segurado/beneficiário">
            <Select value={form.partyRole} onChange={(e) => setForm((p) => ({ ...p, partyRole: e.target.value }))}>
              <option value="INSURED">Segurado</option>
              <option value="BENEFICIARY">Beneficiário</option>
            </Select>
          </FormField>
        ) : null}
      </Card>

      <StickyActionBar>
        <Button variant="secondary" onClick={() => router.push("/painel/compras/seguros")}>Cancelar</Button>
        <Button onClick={handleCreate} loading={saving}>Criar apólice</Button>
      </StickyActionBar>
    </AppShell>
  );
}
