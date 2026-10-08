"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import {
  listInsurancePolicies, getInsurancePolicy, createInsurancePolicy,
  quoteInsurancePolicy, issueInsurancePolicy, openInsuranceClaim, submitInsuranceClaim,
  attachInsurancePolicyDocument, listInsurancePolicyDocuments,
  listInsurancePolicyInstallments, payInsurancePolicyInstallment,
} from "@/lib/api/procurement";
import { uploadFile, listContracts } from "@/lib/api/legal";
import { listProperties } from "@/lib/api/properties";
import { listFinancialEntries } from "@/lib/api/finance";
import { listPeople } from "@/lib/api/people";
import { formatDateTime, formatBRL, toNumber } from "@/lib/format";

const POLICY_STATUS_LABELS = { DRAFT: "Rascunho", QUOTED: "Cotada", ISSUED: "Emitida", ACTIVE: "Ativa", EXPIRED: "Expirada", CANCELED: "Cancelada" };
const POLICY_STATUS_TONE = { DRAFT: "neutral", QUOTED: "info", ISSUED: "info", ACTIVE: "success", EXPIRED: "warning", CANCELED: "danger" };
const CLAIM_ELIGIBLE_STATUSES = ["ACTIVE", "ISSUED"];

// GAP REAL CORRIGIDO (auditoria contrato Marco 7, 2026-10-07 — vigência da apólice): a API agora
// bloqueia sinistro novo em apólice vencida (INSURANCE_POLICY_EXPIRED) e um job marca a apólice
// como EXPIRED. Entre o vencimento e a próxima execução do job o status gravado ainda pode ser
// ACTIVE — a API devolve `isExpired` derivado da data, e o front usa isso (com fallback local
// pela data, fuso São Paulo, mesmo critério da API: expiryDate é o último dia coberto) pra já
// mostrar "Expirada" e esconder o formulário de sinistro novo.
function todaySaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function isPolicyExpired(policy) {
  if (!policy) return false;
  if (policy.status === "EXPIRED" || policy.isExpired === true) return true;
  return Boolean(policy.expiryDate) && String(policy.expiryDate).slice(0, 10) < todaySaoPaulo();
}
function displayPolicyStatus(policy) {
  return CLAIM_ELIGIBLE_STATUSES.includes(policy.status) && isPolicyExpired(policy) ? "EXPIRED" : policy.status;
}
function PolicyStatusBadge({ policy }) {
  const status = displayPolicyStatus(policy);
  return <Badge tone={POLICY_STATUS_TONE[status]}>{POLICY_STATUS_LABELS[status] || status}</Badge>;
}

const CLAIM_STATUS_LABELS = { OPEN: "Aberto", SUBMITTED: "Submetido", UNDER_REVIEW: "Em análise", APPROVED: "Aprovado", REJECTED: "Rejeitado", SETTLED: "Liquidado" };
const CLAIM_STATUS_TONE = { OPEN: "neutral", SUBMITTED: "info", UNDER_REVIEW: "warning", APPROVED: "success", REJECTED: "danger", SETTLED: "success" };

// Modais desta tela usam mais respiro que o padrão (size="lg" + gap maior entre campos) —
// o conteúdo de apólice (cobertura, vínculos, sinistros, parcelas, documentos) é denso o
// bastante pra ficar "grudado" com o espaçamento default do Modal/FormField.
const FORM_GAP_STYLE = { display: "flex", flexDirection: "column", gap: "var(--space-5)" };
const SECTION_STYLE = { marginTop: "var(--space-6)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--color-border)" };

export default function SegurosPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // BUG REAL CORRIGIDO (auditoria contratual, 2026-10-07): o formulário deixava criar uma
  // apólice inteiramente vazia (nenhum campo era obrigatório no front, e o backend aceita
  // coverageSummary ausente) — coverageSummary agora é obrigatório antes de salvar.
  const [form, setForm] = useState({ coverageSummary: "", propertyId: "", contractId: "", partyPersonId: "", partyRole: "INSURED" });
  const [properties, setProperties] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [people, setPeople] = useState([]);

  const [detailModal, setDetailModal] = useState(null); // { policy }
  const [claimForm, setClaimForm] = useState({ description: "", claimAmount: "" });
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [payForm, setPayForm] = useState({}); // { [installmentId]: financialEntryId }
  // GAP REAL CORRIGIDO (reauditoria externa Nayara, 2026-10-08): o campo pedia o UUID do
  // lançamento financeiro digitado à mão — sem busca nenhuma, impossível de usar na prática.
  // Lista os lançamentos SETTLED da empresa pra escolher por descrição/valor.
  const [settledEntries, setSettledEntries] = useState([]);

  useEffect(() => {
    listFinancialEntries({ status: "SETTLED" }).then(setSettledEntries).catch(() => {});
  }, []);

  async function loadDocuments(policyId) {
    try {
      const docs = await listInsurancePolicyDocuments(policyId);
      setDocuments(docs || []);
    } catch (err) {
      setActionError(err?.message || "Não foi possível carregar os documentos da apólice.");
    }
  }

  async function loadInstallments(policyId) {
    try {
      const data = await listInsurancePolicyInstallments(policyId);
      setInstallments(data || []);
    } catch (err) {
      setActionError(err?.message || "Não foi possível carregar as parcelas da apólice.");
    }
  }

  async function handlePayInstallment(installmentId) {
    const financialEntryId = (payForm[installmentId] || "").trim();
    if (!financialEntryId) return;
    setBusyId(installmentId);
    setActionError("");
    try {
      await payInsurancePolicyInstallment(installmentId, financialEntryId);
      await loadInstallments(detailModal.policy.id);
      setPayForm((p) => ({ ...p, [installmentId]: "" }));
    } catch (err) {
      setActionError(err?.message || "Não foi possível dar baixa na parcela.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUploadDocument(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !detailModal) return;
    setUploadingDoc(true);
    setActionError("");
    try {
      const uploaded = await uploadFile(file);
      await attachInsurancePolicyDocument(detailModal.policy.id, uploaded.id);
      await loadDocuments(detailModal.policy.id);
    } catch (err) {
      setActionError(err?.message || "Não foi possível anexar o documento.");
    } finally {
      setUploadingDoc(false);
    }
  }

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listInsurancePolicies(), listProperties(), listContracts(), listPeople()])
      .then(([data, props, contrs, ppl]) => {
        setPolicies(data || []);
        setProperties(props || []);
        setContracts(contrs || []);
        setPeople(ppl || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar as apólices."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.coverageSummary.trim()) {
      setActionError('O campo "Resumo da cobertura" é obrigatório.');
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      await createInsurancePolicy({
        coverageSummary: form.coverageSummary.trim(),
        propertyId: form.propertyId || undefined,
        contractId: form.contractId || undefined,
        parties: form.partyPersonId ? [{ personId: form.partyPersonId, partyRole: form.partyRole }] : undefined,
      });
      setCreateOpen(false);
      setForm({ coverageSummary: "", propertyId: "", contractId: "", partyPersonId: "", partyRole: "INSURED" });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a apólice.");
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(row) {
    setActionError("");
    try {
      const policy = await getInsurancePolicy(row.id);
      setDetailModal({ policy });
      loadDocuments(policy.id);
      loadInstallments(policy.id);
    } catch (err) {
      setActionError(err?.message || "Não foi possível abrir a apólice.");
    }
  }

  async function handleQuote(id) {
    const ok = await confirm({
      title: "Cotar esta apólice?",
      message: "Vai consultar a seguradora configurada em Configurações → Integrações pra obter um prêmio. Essa chamada é real, não um teste.",
      confirmLabel: "Cotar",
    });
    if (!ok) return;
    setBusyId(id);
    setActionError("");
    try {
      await quoteInsurancePolicy(id, {});
      const policy = await getInsurancePolicy(id);
      setDetailModal({ policy });
      loadDocuments(policy.id);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível cotar a apólice.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleIssue(id) {
    const ok = await confirm({
      title: "Emitir esta apólice?",
      message: "A apólice será emitida com vigência de 1 ano a partir de hoje e as parcelas do prêmio serão geradas. Esta ação não pode ser desfeita.",
      confirmLabel: "Emitir",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(id);
    setActionError("");
    try {
      const today = new Date();
      const nextYear = new Date(today);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      await issueInsurancePolicy(id, {
        effectiveDate: today.toISOString().slice(0, 10),
        expiryDate: nextYear.toISOString().slice(0, 10),
      });
      const policy = await getInsurancePolicy(id);
      setDetailModal({ policy });
      loadInstallments(policy.id);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível emitir a apólice.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpenClaim() {
    if (!detailModal) return;
    if (!claimForm.description.trim()) {
      setActionError('O campo "Descrição" é obrigatório para abrir um sinistro.');
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      await openInsuranceClaim(detailModal.policy.id, {
        description: claimForm.description || undefined,
        claimAmount: claimForm.claimAmount ? toNumber(claimForm.claimAmount) : undefined,
      });
      const policy = await getInsurancePolicy(detailModal.policy.id);
      setDetailModal({ policy });
      setClaimForm({ description: "", claimAmount: "" });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível abrir o sinistro.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitClaim(claimId) {
    setBusyId(claimId);
    setActionError("");
    try {
      await submitInsuranceClaim(claimId);
      const policy = await getInsurancePolicy(detailModal.policy.id);
      setDetailModal({ policy });
    } catch (err) {
      setActionError(err?.message || "Não foi possível submeter o sinistro.");
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: "status", label: "Status", width: "14%", render: (row) => <PolicyStatusBadge policy={row} /> },
    { key: "provider", label: "Seguradora", width: "16%", render: (row) => row.provider || "sandbox" },
    { key: "number", label: "Nº da apólice", width: "18%", render: (row) => row.externalPolicyNumber || "—" },
    { key: "premium", label: "Prêmio", width: "14%", render: (row) => (row.premiumAmount ? formatBRL(row.premiumAmount) : "—") },
    { key: "created", label: "Criada em", width: "18%", render: (row) => formatDateTime(row.created_at) },
    {
      key: "actions",
      label: "",
      width: "20%",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button size="sm" variant="secondary" onClick={() => openDetail(row)}>Ver</Button>
          {row.status === "DRAFT" ? (
            <Button size="sm" onClick={() => handleQuote(row.id)} loading={busyId === row.id}>Cotar</Button>
          ) : null}
          {["DRAFT", "QUOTED"].includes(row.status) ? (
            <Button size="sm" onClick={() => handleIssue(row.id)} loading={busyId === row.id}>Emitir</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Seguros" backHref="/painel/compras">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar as apólices">{loadError}</Alert> : null}
      {actionError ? (
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <Card title="Apólices de seguro" subtitle="Insurance Hub — cotação → emissão → sinistro → liquidação, integrado ao Financeiro.">
        <Table columns={columns} rows={loading ? [] : policies} loading={loading} emptyMessage="Nenhuma apólice registrada." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={18} /> Nova apólice
        </Button>
      </StickyActionBar>

      <Modal
        size="lg"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova apólice de seguro"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={saving}>Criar</Button>
          </>
        }
      >
        <div style={FORM_GAP_STYLE}>
          <FormField label="Resumo da cobertura desejada" required>
            <Input
              value={form.coverageSummary}
              onChange={(e) => setForm((p) => ({ ...p, coverageSummary: e.target.value }))}
              placeholder="Ex.: Seguro-fiança locatícia — apartamento Rua X"
            />
          </FormField>
          <FormField label="Imóvel vinculado (opcional)">
            <Select value={form.propertyId} onChange={(e) => setForm((p) => ({ ...p, propertyId: e.target.value }))}>
              <option value="">Nenhum</option>
              {properties.map((pr) => (
                <option key={pr.id} value={pr.id}>{pr.title || pr.internalCode || pr.id}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Contrato de locação vinculado (opcional)">
            <Select value={form.contractId} onChange={(e) => setForm((p) => ({ ...p, contractId: e.target.value }))}>
              <option value="">Nenhum</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>{c.code || c.id}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Segurado / beneficiário (opcional)">
            <Select value={form.partyPersonId} onChange={(e) => setForm((p) => ({ ...p, partyPersonId: e.target.value }))}>
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
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-body-sm)", margin: 0 }}>
            A apólice é criada como rascunho. Depois, use &quot;Cotar&quot; pra consultar a seguradora
            configurada em Configurações → Integrações, e &quot;Emitir&quot; pra confirmar.
          </p>
        </div>
      </Modal>

      <Modal
        size="lg"
        open={Boolean(detailModal)}
        onClose={() => { setDetailModal(null); setDocuments([]); setInstallments([]); }}
        title="Apólice"
        footer={<Button variant="secondary" onClick={() => setDetailModal(null)}>Fechar</Button>}
      >
        {detailModal ? (
          <div style={FORM_GAP_STYLE}>
            <div>
              <p style={{ margin: "0 0 8px" }}>
                <PolicyStatusBadge policy={detailModal.policy} />
                {" — "}
                {detailModal.policy.provider || "sandbox"}
                {detailModal.policy.externalPolicyNumber ? ` — Nº ${detailModal.policy.externalPolicyNumber}` : ""}
              </p>
              {detailModal.policy.premiumAmount ? <p style={{ margin: "0 0 4px" }}>Prêmio: {formatBRL(detailModal.policy.premiumAmount)}</p> : null}
              {detailModal.policy.effectiveDate ? <p style={{ margin: "0 0 4px" }}>Vigência: {detailModal.policy.effectiveDate} a {detailModal.policy.expiryDate || "—"}</p> : null}
              {detailModal.policy.coverageSummary ? <p style={{ margin: "0 0 4px" }}>Cobertura: {detailModal.policy.coverageSummary}</p> : null}
              {detailModal.policy.propertyId ? <p style={{ margin: "0 0 4px" }}>Imóvel vinculado: {properties.find((pr) => pr.id === detailModal.policy.propertyId)?.title || detailModal.policy.propertyId}</p> : null}
              {detailModal.policy.contractId ? <p style={{ margin: 0 }}>Contrato vinculado: {contracts.find((c) => c.id === detailModal.policy.contractId)?.code || detailModal.policy.contractId}</p> : null}
            </div>

            <div style={SECTION_STYLE}>
              <strong>Segurados / beneficiários</strong>
              {(detailModal.policy.parties || []).length === 0 ? (
                <p style={{ color: "var(--color-ink-muted)", margin: "8px 0 0" }}>Nenhum registrado.</p>
              ) : (
                <ul style={{ margin: "10px 0 0", paddingLeft: 0, listStyle: "none" }}>
                  {detailModal.policy.parties.map((party) => (
                    <li key={party.id} style={{ padding: "6px 0" }}>
                      {party.partyRole === "INSURED" ? "Segurado" : party.partyRole === "BENEFICIARY" ? "Beneficiário" : party.partyRole}
                      {" — "}
                      {people.find((p) => p.id === party.personId)?.legalName || party.personId}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={SECTION_STYLE}>
              <strong>Sinistros</strong>
              {(detailModal.policy.claims || []).length === 0 ? (
                <p style={{ color: "var(--color-ink-muted)", margin: "8px 0 0" }}>Nenhum sinistro aberto.</p>
              ) : (
                detailModal.policy.claims.map((claim) => (
                  <div key={claim.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <span>
                        <Badge tone={CLAIM_STATUS_TONE[claim.status]}>{CLAIM_STATUS_LABELS[claim.status]}</Badge>
                        {" "}{claim.description}
                      </span>
                      {claim.status === "OPEN" ? (
                        <Button size="sm" onClick={() => handleSubmitClaim(claim.id)} loading={busyId === claim.id}>Submeter</Button>
                      ) : null}
                    </div>
                    {claim.settledAmount ? <p style={{ margin: "8px 0 0" }}>Liquidado: {formatBRL(claim.settledAmount)}</p> : null}
                    {(claim.events || []).length > 0 ? (
                      <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--color-ink-muted)", fontSize: "var(--text-body-sm)" }}>
                        {claim.events.map((ev) => (
                          <li key={ev.id} style={{ padding: "2px 0" }}>{formatDateTime(ev.occurredAt)} — {ev.eventType}{ev.notes ? `: ${ev.notes}` : ""}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))
              )}

              {isPolicyExpired(detailModal.policy) ? (
                <div style={{ marginTop: "var(--space-5)" }}>
                  <Alert tone="warning" title="Vigência encerrada">
                    A vigência desta apólice terminou em {detailModal.policy.expiryDate || "—"} — não é possível abrir sinistro novo.
                    Sinistros abertos antes do vencimento continuam podendo ser submetidos e liquidados normalmente.
                  </Alert>
                </div>
              ) : CLAIM_ELIGIBLE_STATUSES.includes(detailModal.policy.status) ? (
                <div style={{ marginTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <strong>Abrir novo sinistro</strong>
                  <FormField label="Descrição" required>
                    <Input value={claimForm.description} onChange={(e) => setClaimForm((p) => ({ ...p, description: e.target.value }))} />
                  </FormField>
                  <FormField label="Valor do sinistro">
                    <DecimalInput value={claimForm.claimAmount} onChange={(e) => setClaimForm((p) => ({ ...p, claimAmount: e.target.value }))} />
                  </FormField>
                  <Button size="sm" onClick={handleOpenClaim} loading={saving} style={{ alignSelf: "flex-start" }}>Abrir sinistro</Button>
                </div>
              ) : null}
            </div>

            <div style={SECTION_STYLE}>
              <strong>Parcelas do prêmio</strong>
              {installments.length === 0 ? (
                <p style={{ color: "var(--color-ink-muted)", margin: "8px 0 0" }}>Nenhuma parcela gerada ainda (emita a apólice primeiro).</p>
              ) : (
                installments.map((inst) => (
                  <div key={inst.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--color-border)", gap: 12 }}>
                    <span>
                      {formatDateTime(inst.dueDate || inst.due_date)} — {formatBRL(inst.amount)}{" "}
                      <Badge tone={inst.status === "PAID" ? "success" : inst.status === "OVERDUE" ? "danger" : "neutral"}>
                        {inst.status === "PAID" ? "Paga" : inst.status === "OVERDUE" ? "Vencida" : "Pendente"}
                      </Badge>
                    </span>
                    {inst.status !== "PAID" ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Select
                          value={payForm[inst.id] || ""}
                          onChange={(e) => setPayForm((p) => ({ ...p, [inst.id]: e.target.value }))}
                          style={{ width: 320 }}
                        >
                          <option value="">Selecione o lançamento liquidado...</option>
                          {settledEntries.map((e) => (
                            <option key={e.id} value={e.id}>{e.description} — {formatBRL(e.amount)}</option>
                          ))}
                        </Select>
                        <Button size="sm" onClick={() => handlePayInstallment(inst.id)} loading={busyId === inst.id}>Dar baixa</Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div style={SECTION_STYLE}>
              <strong>Documentos</strong>
              {documents.length === 0 ? (
                <p style={{ color: "var(--color-ink-muted)", margin: "8px 0 0" }}>Nenhum documento anexado.</p>
              ) : (
                <ul style={{ margin: "10px 0 0", paddingLeft: 0, listStyle: "none" }}>
                  {documents.map((doc) => (
                    <li key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                      <span>
                        {doc.purpose === "QUOTE_DOCUMENT" ? "Documento da cotação" : "Anexo manual"}
                        {" — "}
                        {formatDateTime(doc.created_at)}
                      </span>
                      <Button size="sm" variant="secondary" onClick={() => setViewerFile({ id: doc.fileId })}>Ver</Button>
                    </li>
                  ))}
                </ul>
              )}
              <label htmlFor="f-insurance-doc" style={{ display: "inline-block", marginTop: "var(--space-4)" }}>
                <Button size="sm" variant="secondary" loading={uploadingDoc} onClick={() => document.getElementById("f-insurance-doc")?.click()}>
                  Anexar documento
                </Button>
              </label>
              <input id="f-insurance-doc" type="file" style={{ display: "none" }} onChange={handleUploadDocument} />
            </div>
          </div>
        ) : null}
      </Modal>

      <FileViewerModal open={!!viewerFile} onClose={() => setViewerFile(null)} fileId={viewerFile?.id} />
      <ConfirmDialog />
    </AppShell>
  );
}
