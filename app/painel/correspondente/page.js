"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import { listFinancingCases, createFinancingCase } from "@/lib/api/correspondent";
import { listProperties } from "@/lib/api/properties";
import { formatDateTime } from "@/lib/format";

const STATUS_LABELS = { DRAFT: "Rascunho" };
const STATUS_TONE = { DRAFT: "neutral" };

const PROVIDER_LABELS = {
  sandbox: "Sandbox (simulação)",
  manual: "Manual (sem banco real integrado)",
};

const EMPTY_FORM = {
  propertyId: "",
  providerCode: "sandbox",
  principalName: "",
  principalPersonId: "",
  coApplicantName: "",
  coApplicantPersonId: "",
  includeCoApplicant: false,
};

export default function CorrespondentePage() {
  const router = useRouter();
  const [cases, setCases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listFinancingCases(), listProperties()])
      .then(([c, p]) => {
        setCases(c || []);
        setProperties(p || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os casos de financiamento."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setActionError("");
    setCreateOpen(true);
  }

  const isValid = Boolean(form.principalPersonId) && (!form.includeCoApplicant || Boolean(form.coApplicantPersonId));

  async function handleCreate() {
    if (!isValid) return;
    setSaving(true);
    setActionError("");
    try {
      const applicants = [{ personId: form.principalPersonId, role: "PRINCIPAL" }];
      if (form.includeCoApplicant && form.coApplicantPersonId) {
        applicants.push({ personId: form.coApplicantPersonId, role: "CO_APPLICANT" });
      }
      await createFinancingCase({
        propertyId: form.propertyId || null,
        providerCode: form.providerCode,
        applicants,
      });
      setCreateOpen(false);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o caso de financiamento.");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: "status",
      label: "Status",
      width: "14%",
      render: (row) => <Badge tone={STATUS_TONE[row.status] || "neutral"}>{STATUS_LABELS[row.status] || row.status}</Badge>,
    },
    {
      key: "principal",
      label: "Proponente principal",
      width: "26%",
      render: (row) => {
        const principal = (row.applicants || []).find((a) => a.role === "PRINCIPAL");
        return principal?.person?.legalName || "—";
      },
    },
    {
      key: "coApplicants",
      label: "Co-proponentes",
      width: "20%",
      render: (row) => {
        const others = (row.applicants || []).filter((a) => a.role !== "PRINCIPAL");
        return others.length ? others.map((a) => a.person?.legalName).filter(Boolean).join(", ") : "—";
      },
    },
    {
      key: "property",
      label: "Imóvel",
      width: "18%",
      render: (row) => (row.property ? `${row.property.internalCode ? `${row.property.internalCode} — ` : ""}${row.property.title || ""}` : "—"),
    },
    {
      key: "provider",
      label: "Provider",
      width: "12%",
      render: (row) => PROVIDER_LABELS[row.providerCode] || row.providerCode,
    },
    { key: "created", label: "Criado em", width: "8%", render: (row) => formatDateTime(row.created_at || row.createdAt) },
    {
      key: "actions",
      label: "",
      width: "12%",
      render: (row) => (
        <Button size="sm" variant="secondary" onClick={() => router.push(`/painel/correspondente/${row.id}`)}>Ver</Button>
      ),
    },
  ];

  return (
    <AppShell title="Financiamentos" backHref="/painel">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar os casos de financiamento">{loadError}</Alert> : null}
      {actionError ? (
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <Card title="Casos de financiamento" subtitle="Correspondente bancário — proponentes vinculados ao cadastro real de contatos.">
        <Table columns={columns} rows={loading ? [] : cases} loading={loading} emptyMessage="Nenhum caso de financiamento registrado." />
      </Card>

      <StickyActionBar>
        <Button onClick={openCreateModal}>
          <Icon name="plus" size={18} /> Novo caso de financiamento
        </Button>
      </StickyActionBar>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo caso de financiamento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!isValid}>Criar</Button>
          </>
        }
      >
        <FormField label="Imóvel (opcional)" htmlFor="fc-property">
          <Select id="fc-property" value={form.propertyId} onChange={(e) => setForm((p) => ({ ...p, propertyId: e.target.value }))}>
            <option value="">Sem imóvel vinculado ainda</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>{prop.internalCode ? `${prop.internalCode} — ` : ""}{prop.name}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Provider" htmlFor="fc-provider" helper="Sandbox simula um banco fictício; nenhum banco real está integrado ainda nesta fase.">
          <Select id="fc-provider" value={form.providerCode} onChange={(e) => setForm((p) => ({ ...p, providerCode: e.target.value }))}>
            <option value="sandbox">{PROVIDER_LABELS.sandbox}</option>
            <option value="manual">{PROVIDER_LABELS.manual}</option>
          </Select>
        </FormField>

        <FormField label="Proponente principal" required>
          <PersonPicker
            id="fc-principal"
            value={form.principalName}
            personId={form.principalPersonId}
            placeholder="Buscar contato pelo nome..."
            onSelect={({ name, personId }) => setForm((p) => ({ ...p, principalName: name, principalPersonId: personId || "" }))}
          />
        </FormField>

        {!form.includeCoApplicant ? (
          <Button variant="secondary" size="sm" onClick={() => setForm((p) => ({ ...p, includeCoApplicant: true }))}>
            + Adicionar co-proponente
          </Button>
        ) : (
          <FormField label="Co-proponente" required>
            <PersonPicker
              id="fc-co-applicant"
              value={form.coApplicantName}
              personId={form.coApplicantPersonId}
              placeholder="Buscar contato pelo nome..."
              onSelect={({ name, personId }) => setForm((p) => ({ ...p, coApplicantName: name, coApplicantPersonId: personId || "" }))}
            />
            <Button
              variant="secondary"
              size="sm"
              style={{ marginTop: 8 }}
              onClick={() => setForm((p) => ({ ...p, includeCoApplicant: false, coApplicantName: "", coApplicantPersonId: "" }))}
            >
              Remover co-proponente
            </Button>
          </FormField>
        )}
      </Modal>
    </AppShell>
  );
}
