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
import Input from "@/components/atoms/Input/Input";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import { listFinancingCases, createFinancingCase, getNayStalledCases, listPendingDuplicates, getCorrespondentParameters } from "@/lib/api/correspondent";
import { listProperties } from "@/lib/api/properties";
import { listOpportunities, stageLabelPt } from "@/lib/api/crm";
import { formatDateTime } from "@/lib/format";
import { hasPermission } from "@/lib/rbac/permissions";
import { STATUS_LABELS, STATUS_TONE, PROVIDER_LABELS, PURPOSE_LABELS, PRODUCT_LABELS, financingStatusLabel, providerLabel, productLabel, statusLabel, brl } from "./_labels";

const EMPTY_FORM = {
  product: "FINANCIAMENTO_IMOBILIARIO",
  propertyId: "",
  providerCode: "",
  opportunityId: "",
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
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [stalled, setStalled] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [auxWarnings, setAuxWarnings] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [visibleCount, setVisibleCount] = useState(25);

  // Só a lista de casos é essencial; imóveis, oportunidades, alertas e parâmetros são complementos:
  // se um deles falhar, a tela continua e avisa o que ficou de fora.
  function load() {
    setLoading(true);
    setLoadError("");
    const warnings = [];
    Promise.allSettled([
      listFinancingCases(),
      listProperties(),
      listOpportunities(),
      getCorrespondentParameters(),
      getNayStalledCases(),
      listPendingDuplicates(),
    ]).then(([c, p, o, par, st, du]) => {
      if (c.status === "rejected") {
        setLoadError(c.reason?.message || "Não foi possível carregar os casos de financiamento.");
      } else {
        setCases(c.value || []);
      }
      if (p.status === "fulfilled") setProperties(p.value || []);
      else { setProperties([]); warnings.push("a lista de imóveis"); }
      if (o.status === "fulfilled") {
        setOpportunities((o.value || []).map((opp) => ({
          id: opp.id,
          label: `${stageLabelPt(opp.stage)}${opp.expectedValue ? ` · ${brl(opp.expectedValue)}` : ""}${opp.nextAction ? ` · ${opp.nextAction}` : ""}${opp.createdAt ? ` · criada em ${formatDateTime(opp.createdAt)}` : ""}`,
        })));
      } else { setOpportunities([]); warnings.push("as oportunidades do CRM"); }
      if (par.status === "fulfilled") setEligibility(par.value?.eligibility?.action || null);
      else { setEligibility(null); warnings.push("os parâmetros de elegibilidade (todas as opções aparecem no formulário)"); }
      if (st.status === "fulfilled") setStalled(st.value);
      else { setStalled(null); warnings.push("o alerta de casos parados"); }
      if (du.status === "fulfilled") setDuplicates(du.value || []);
      else { setDuplicates([]); warnings.push("o alerta de possíveis duplicatas"); }
      setAuxWarnings(warnings);
    }).finally(() => setLoading(false));
  }
  useEffect(() => { load(); setCanCreate(hasPermission("correspondent:create")); }, []);

  // Opções do formulário respeitam Parâmetros (providers, produtos e finalidades habilitados).
  const allowedProducts = Object.keys(PRODUCT_LABELS).filter((v) => !eligibility?.allowedProducts || eligibility.allowedProducts.includes(v));
  const allowedPurposes = Object.keys(PURPOSE_LABELS).filter((v) => !eligibility?.allowedPurposes || eligibility.allowedPurposes.includes(v));
  const allowedProviders = Object.keys(PROVIDER_LABELS).filter((v) => !eligibility?.allowedProviders || eligibility.allowedProviders.includes(v));

  function closeCreateModal() {
    if (saving) return;
    setCreateOpen(false);
    setActionError("");
  }

  function openCreateModal() {
    setForm({
      ...EMPTY_FORM,
      product: allowedProducts.includes(EMPTY_FORM.product) ? EMPTY_FORM.product : (allowedProducts[0] || ""),
      purpose: allowedPurposes.includes(EMPTY_FORM.purpose) ? EMPTY_FORM.purpose : (allowedPurposes[0] || ""),
    });
    setActionError("");
    setCreateOpen(true);
  }

  const samePerson = form.includeCoApplicant && form.coApplicantPersonId && form.coApplicantPersonId === form.principalPersonId;
  const isValid = Boolean(form.principalPersonId) && Boolean(form.product) && Boolean(form.purpose) && !samePerson && (!form.includeCoApplicant || Boolean(form.coApplicantPersonId));

  async function handleCreate() {
    if (!isValid || saving) return;
    setSaving(true);
    setActionError("");
    try {
      const applicants = [{ personId: form.principalPersonId, role: "PRINCIPAL" }];
      if (form.includeCoApplicant && form.coApplicantPersonId) {
        applicants.push({ personId: form.coApplicantPersonId, role: "CO_APPLICANT" });
      }
      const created = await createFinancingCase({
        propertyId: form.propertyId || null,
        providerCode: form.providerCode || undefined,
        opportunityId: form.opportunityId || undefined,
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

  const needle = search.trim().toLowerCase();
  const filtered = cases.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false;
    if (!needle) return true;
    const text = [
      ...(row.applicants || []).map((a) => a.person?.legalName),
      row.property?.internalCode,
      row.property?.title,
      row.property?.name,
    ].filter(Boolean).join(" ").toLowerCase();
    return text.includes(needle);
  });

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
      render: (row) => (row.property ? [row.property.internalCode, row.property.title || row.property.name].filter(Boolean).join(" · ") || "Imóvel sem título" : "Sem imóvel vinculado"),
    },
    {
      key: "product",
      label: "Produto",
      width: "220px",
      render: (row) => productLabel(row.product),
    },
    {
      key: "provider",
      label: "Provider",
      width: "220px",
      render: (row) => providerLabel(row.providerCode),
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
      {loadError ? (
        <>
          <Alert tone="danger" title="Não foi possível carregar os casos de financiamento">{loadError}</Alert>
          <div style={{ margin: "8px 0" }}><Button variant="secondary" onClick={load}>Tentar de novo</Button></div>
        </>
      ) : null}
      {auxWarnings.length > 0 ? (
        <Alert tone="warning" title="Parte das informações não carregou">
          Não foi possível carregar {auxWarnings.join("; ")}. A lista de casos continua disponível.
        </Alert>
      ) : null}
      {auxWarnings.length > 0 ? <div style={{ margin: "8px 0" }}><Button variant="secondary" size="sm" onClick={load}>Tentar de novo</Button></div> : null}

      {stalled && stalled.cases?.length > 0 ? (
        <Card title={`${stalled.cases.length} caso(s) sem atividade há mais de ${stalled.thresholdDays} dia(s)`} subtitle="Sinalização automática de acompanhamento: não decide nem altera nenhum caso. Abra o caso para agir.">
          <Table
            columns={[
              { key: "status", label: "Situação", render: (row) => statusLabel(row.status) },
              { key: "idleDays", label: "Parado há", render: (row) => `${row.idleDays} dia(s)` },
              { key: "reason", label: "Motivo", render: (row) => row.reason || "Sem atividade recente" },
              { key: "actions", label: "", render: (row) => <Button variant="secondary" size="sm" onClick={() => router.push(`/painel/correspondente/${row.financingCaseId}`)}>Abrir caso</Button> },
            ]}
            rows={stalled.cases}
          />
        </Card>
      ) : null}

      {duplicates.length > 0 ? (
        <Card title="Possíveis duplicatas para revisar" subtitle="Casos criados com o mesmo proponente e imóvel de outro caso dentro da janela definida em Parâmetros. Abra o caso para decidir.">
          <Table
            columns={[
              { key: "principal", label: "Proponente", render: (row) => (row.applicants || []).map((a) => a.person?.legalName).filter(Boolean).join(", ") || "Sem proponente" },
              { key: "status", label: "Situação", render: (row) => statusLabel(row.status) },
              { key: "created", label: "Criado em", render: (row) => formatDateTime(row.createdAt || row.created_at) },
              { key: "original", label: "Caso original", render: (row) => (row.originalCase ? `${statusLabel(row.originalCase.status)}, criado em ${formatDateTime(row.originalCase.createdAt || row.originalCase.created_at)}` : "Caso original indisponível") },
              { key: "actions", label: "", render: (row) => <Button variant="secondary" size="sm" onClick={() => router.push(`/painel/correspondente/${row.id}`)}>{canCreate ? "Revisar" : "Abrir"}</Button> },
            ]}
            rows={duplicates}
          />
        </Card>
      ) : null}

      <Card title="Casos de financiamento" subtitle="Correspondente bancário — proponentes vinculados ao cadastro real de contatos.">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ minWidth: 220 }}>
            <FormField label="Situação" htmlFor="fc-filter-status">
              <Select id="fc-filter-status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setVisibleCount(25); }}>
                <option value="">Todas as situações</option>
                {Object.entries(STATUS_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </Select>
            </FormField>
          </div>
          <div style={{ minWidth: 260, flex: 1 }}>
            <FormField label="Buscar por proponente ou imóvel" htmlFor="fc-filter-search">
              <Input id="fc-filter-search" value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(25); }} placeholder="Nome, código ou título do imóvel" />
            </FormField>
          </div>
        </div>
        <Table columns={columns} minWidth="1636px" rows={loading ? [] : filtered.slice(0, visibleCount)} loading={loading} emptyMessage={cases.length ? "Nenhum caso encontrado com este filtro." : "Nenhum caso de financiamento registrado."} />
        {!loading && filtered.length > visibleCount ? (
          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setVisibleCount((n) => n + 25)}>
              Mostrar mais ({filtered.length - visibleCount} restantes)
            </Button>
          </div>
        ) : null}
      </Card>

      {canCreate ? (
        <StickyActionBar>
          <Button onClick={openCreateModal}>
            <Icon name="plus" size={18} /> Novo caso de financiamento
          </Button>
        </StickyActionBar>
      ) : null}

      <Modal
        open={createOpen}
        onClose={closeCreateModal}
        title="Novo caso de financiamento"
        footer={
          <>
            <Button variant="secondary" onClick={closeCreateModal} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!isValid || saving}>Criar</Button>
          </>
        }
      >
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
        {samePerson ? <Alert tone="warning">O co-proponente precisa ser uma pessoa diferente do proponente principal.</Alert> : null}
        <FormField label="Imóvel (opcional)" htmlFor="fc-property">
          <Select id="fc-property" value={form.propertyId} onChange={(e) => setForm((p) => ({ ...p, propertyId: e.target.value }))}>
            <option value="">Sem imóvel vinculado ainda</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>{[prop.internalCode, prop.name || prop.title].filter(Boolean).join(" · ") || "Imóvel sem título"}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Oportunidade do CRM (opcional)" htmlFor="fc-opportunity" helper="Vincula o caso à oportunidade: o andamento do financiamento aparece na linha do tempo dela.">
          <Select id="fc-opportunity" value={form.opportunityId} onChange={(e) => setForm((p) => ({ ...p, opportunityId: e.target.value }))}>
            <option value="">Sem oportunidade vinculada</option>
            {opportunities.map((opp) => (
              <option key={opp.id} value={opp.id}>{opp.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Produto" htmlFor="fc-product">
          <Select id="fc-product" value={form.product} onChange={(e) => setForm((p) => ({ ...p, product: e.target.value }))}>
            {allowedProducts.map((value) => (
              <option key={value} value={value}>{PRODUCT_LABELS[value]}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Finalidade" htmlFor="fc-purpose">
          <Select id="fc-purpose" value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}>
            {allowedPurposes.map((value) => (
              <option key={value} value={value}>{PURPOSE_LABELS[value]}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Provider" htmlFor="fc-provider" helper="Sandbox simula um banco fictício; nenhum banco real está integrado ainda nesta fase.">
          <Select id="fc-provider" value={form.providerCode} onChange={(e) => setForm((p) => ({ ...p, providerCode: e.target.value }))}>
            <option value="">Padrão da empresa (Configurações)</option>
            {allowedProviders.map((value) => (
              <option key={value} value={value}>{PROVIDER_LABELS[value]}</option>
            ))}
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
