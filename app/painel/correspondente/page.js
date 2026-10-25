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
import { listFinancingCases, createFinancingCase, getNayStalledCases, listPendingDuplicates } from "@/lib/api/correspondent";
import { listProperties } from "@/lib/api/properties";
import { formatDateTime } from "@/lib/format";

const STATUS_LABELS = {
  DRAFT: "Rascunho",
  DOCUMENTS_PENDING: "Aguardando documentos",
  READY_TO_SUBMIT: "Pronto para enviar",
  SUBMITTED: "Enviado ao provider",
  UNDER_ANALYSIS: "Em análise",
  PENDING_CUSTOMER: "Aguardando documentos do cliente",
  PENDING_PROPERTY: "Aguardando dados do imóvel",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CONTRACTING: "Em contratação",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};

function financingStatusLabel(row) {
  if (row?.providerCode === "manual" && row?.status === "SUBMITTED") return "Aguardando ação manual no banco";
  return STATUS_LABELS[row?.status] || row?.status;
}
const STATUS_TONE = {
  DRAFT: "neutral",
  DOCUMENTS_PENDING: "warning",
  READY_TO_SUBMIT: "info",
  SUBMITTED: "info",
  UNDER_ANALYSIS: "info",
  PENDING_CUSTOMER: "warning",
  PENDING_PROPERTY: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CONTRACTING: "info",
  COMPLETED: "success",
  CANCELED: "danger",
};

const PROVIDER_LABELS = {
  sandbox: "Sandbox (simulação)",
  manual: "Manual (sem banco real integrado)",
};

const PURPOSE_LABELS = {
  RESIDENCIAL: "Residencial",
  COMERCIAL: "Comercial",
};

const PRODUCT_LABELS = {
  FINANCIAMENTO_IMOBILIARIO: "Financiamento imobiliário",
  REFINANCIAMENTO: "Refinanciamento",
  CREDITO_COM_GARANTIA: "Crédito com garantia de imóvel",
  CONSTRUCAO: "Financiamento de construção",
};

const EMPTY_FORM = {
  product: "FINANCIAMENTO_IMOBILIARIO",
  propertyId: "",
  providerCode: "sandbox",
  purpose: "RESIDENCIAL",
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
  const [stalled, setStalled] = useState(null);
  const [duplicates, setDuplicates] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [visibleCount, setVisibleCount] = useState(25);

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

  useEffect(() => {
    // NAY Correspondente: só sinaliza casos sem atividade recente, nunca decide ou altera nada —
    // falha silenciosa aqui é aceitável (é um aviso complementar, não dado essencial da tela).
    getNayStalledCases().then(setStalled).catch(() => setStalled(null));
    listPendingDuplicates().then((rows) => setDuplicates(rows || [])).catch(() => setDuplicates([]));
  }, []);

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
      const created = await createFinancingCase({
        propertyId: form.propertyId || null,
        providerCode: form.providerCode,
        purpose: form.purpose,
        product: form.product,
        applicants,
      });
      setCreateOpen(false);
      if (created?.id) {
        router.push(`/painel/correspondente/${created.id}`);
        return;
      }
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
      width: "240px",
      render: (row) => (
        <>
          <Badge tone={STATUS_TONE[row.status] || "neutral"}>{financingStatusLabel(row)}</Badge>
          {row.possibleDuplicateOfCaseId ? (
            <div style={{ marginTop: 4 }}>
              <Badge tone="warning">Possível duplicata</Badge>
            </div>
          ) : null}
        </>
      ),
    },
    {
      key: "principal",
      label: "Proponente principal",
      width: "220px",
      render: (row) => {
        const principal = (row.applicants || []).find((a) => a.role === "PRINCIPAL");
        return principal?.person?.legalName || "Sem pessoa vinculada";
      },
    },
    {
      key: "coApplicants",
      label: "Co-proponentes",
      width: "200px",
      render: (row) => {
        const others = (row.applicants || []).filter((a) => a.role !== "PRINCIPAL");
        return others.length ? others.map((a) => a.person?.legalName).filter(Boolean).join(", ") : "Sem co-proponentes";
      },
    },
    {
      key: "property",
      label: "Imóvel",
      width: "280px",
      render: (row) => (row.property ? `${row.property.internalCode ? `${row.property.internalCode} — ` : ""}${row.property.title || ""}` : "Sem imóvel vinculado"),
    },
    {
      key: "product",
      label: "Produto",
      width: "220px",
      render: (row) => PRODUCT_LABELS[row.product] || row.product,
    },
    {
      key: "provider",
      label: "Provider",
      width: "220px",
      render: (row) => PROVIDER_LABELS[row.providerCode] || row.providerCode,
    },
    { key: "created", label: "Criado em", width: "168px", render: (row) => formatDateTime(row.created_at || row.createdAt) },
    {
      key: "actions",
      label: "",
      width: "88px",
      sticky: true,
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

      {stalled && stalled.cases?.length > 0 ? (
        <Alert tone="warning" title={`${stalled.cases.length} caso(s) sem atividade há mais de ${stalled.thresholdDays} dia(s)`}>
          Sinalização automática de acompanhamento — não decide nem altera nenhum caso.
          {" "}
          {[...new Set(stalled.cases.map((c) => c.reason))].slice(0, 2).join(" ")}
        </Alert>
      ) : null}

      {duplicates.length > 0 ? (
        <Card title="Possíveis duplicatas para revisar" subtitle="Casos criados com o mesmo proponente e imóvel de outro caso nas últimas 24 horas. Abra o caso para decidir.">
          <Table
            columns={[
              { key: "principal", label: "Proponente", render: (row) => (row.applicants || []).map((a) => a.person?.legalName).filter(Boolean).join(", ") || "Sem proponente" },
              { key: "status", label: "Situação", render: (row) => STATUS_LABELS[row.status] || row.status },
              { key: "created", label: "Criado em", render: (row) => formatDateTime(row.createdAt || row.created_at) },
              { key: "original", label: "Caso original", render: (row) => (row.originalCase ? `${STATUS_LABELS[row.originalCase.status] || row.originalCase.status}, criado em ${formatDateTime(row.originalCase.createdAt || row.originalCase.created_at)}` : "Caso original indisponível") },
              { key: "actions", label: "", render: (row) => <Button variant="secondary" size="sm" onClick={() => router.push(`/painel/correspondente/${row.id}`)}>Revisar</Button> },
            ]}
            rows={duplicates}
          />
        </Card>
      ) : null}

      <Card title="Casos de financiamento" subtitle="Correspondente bancário — proponentes vinculados ao cadastro real de contatos.">
        <Table columns={columns} minWidth="1636px" rows={loading ? [] : cases.slice(0, visibleCount)} loading={loading} emptyMessage="Nenhum caso de financiamento registrado." />
        {!loading && cases.length > visibleCount ? (
          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setVisibleCount((n) => n + 25)}>
              Mostrar mais ({cases.length - visibleCount} restantes)
            </Button>
          </div>
        ) : null}
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

        <FormField label="Produto" htmlFor="fc-product">
          <Select id="fc-product" value={form.product} onChange={(e) => setForm((p) => ({ ...p, product: e.target.value }))}>
            {Object.entries(PRODUCT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Finalidade" htmlFor="fc-purpose">
          <Select id="fc-purpose" value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}>
            <option value="RESIDENCIAL">{PURPOSE_LABELS.RESIDENCIAL}</option>
            <option value="COMERCIAL">{PURPOSE_LABELS.COMERCIAL}</option>
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
            unlinkedHint="Selecione um contato já cadastrado. Texto livre não cria o caso."
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
              unlinkedHint="Selecione um contato já cadastrado. Texto livre não cria o caso."
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
