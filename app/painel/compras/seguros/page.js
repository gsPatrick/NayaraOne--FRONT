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
import {
  listInsurancePolicies, getInsurancePolicy, createInsurancePolicy,
  quoteInsurancePolicy, issueInsurancePolicy, openInsuranceClaim, submitInsuranceClaim,
  attachInsurancePolicyDocument, listInsurancePolicyDocuments,
  listInsurancePolicyInstallments, payInsurancePolicyInstallment,
} from "@/lib/api/procurement";
import { uploadFile, listContracts } from "@/lib/api/legal";
import { listProperties } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import { formatDateTime, formatBRL, toNumber } from "@/lib/format";

const POLICY_STATUS_LABELS = { DRAFT: "Rascunho", QUOTED: "Cotada", ISSUED: "Emitida", ACTIVE: "Ativa", EXPIRED: "Expirada", CANCELED: "Cancelada" };
const POLICY_STATUS_TONE = { DRAFT: "neutral", QUOTED: "info", ISSUED: "info", ACTIVE: "success", EXPIRED: "warning", CANCELED: "danger" };

const CLAIM_STATUS_LABELS = { OPEN: "Aberto", SUBMITTED: "Submetido", UNDER_REVIEW: "Em análise", APPROVED: "Aprovado", REJECTED: "Rejeitado", SETTLED: "Liquidado" };
const CLAIM_STATUS_TONE = { OPEN: "neutral", SUBMITTED: "info", UNDER_REVIEW: "warning", APPROVED: "success", REJECTED: "danger", SETTLED: "success" };

export default function SegurosPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 50, 2026-10-05): o backend já aceita
  // propertyId/contractId/parties na criação da apólice (seguro-fiança ligado a um imóvel/
  // contrato de locação, e segurados/beneficiários como entidade própria do Caderno), mas o
  // formulário nunca enviava nenhum desses campos.
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
    setSaving(true);
    setActionError("");
    try {
      await createInsurancePolicy({
        coverageSummary: form.coverageSummary || undefined,
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
    // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 45, 2026-10-05): "description" é
    // obrigatório no backend, mas o front enviava o clique sem validar antes — o usuário só
    // descobria o campo vazio depois do round-trip ao servidor.
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
    { key: "status", label: "Status", width: "14%", render: (row) => <Badge tone={POLICY_STATUS_TONE[row.status]}>{POLICY_STATUS_LABELS[row.status]}</Badge> },
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
        <FormField label="Resumo da cobertura desejada">
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
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-body-sm)" }}>
          A apólice é criada como rascunho. Depois, use &quot;Cotar&quot; pra consultar a seguradora
          configurada em Configurações → Integrações, e &quot;Emitir&quot; pra confirmar.
        </p>
      </Modal>

      <Modal
        open={Boolean(detailModal)}
        onClose={() => { setDetailModal(null); setDocuments([]); setInstallments([]); }}
        title="Apólice"
        footer={<Button variant="secondary" onClick={() => setDetailModal(null)}>Fechar</Button>}
      >
        {detailModal ? (
          <>
            <p>
              <Badge tone={POLICY_STATUS_TONE[detailModal.policy.status]}>{POLICY_STATUS_LABELS[detailModal.policy.status]}</Badge>
              {" — "}
              {detailModal.policy.provider || "sandbox"}
              {detailModal.policy.externalPolicyNumber ? ` — Nº ${detailModal.policy.externalPolicyNumber}` : ""}
            </p>
            {detailModal.policy.premiumAmount ? <p>Prêmio: {formatBRL(detailModal.policy.premiumAmount)}</p> : null}
            {detailModal.policy.coverageSummary ? <p>Cobertura: {detailModal.policy.coverageSummary}</p> : null}
            {detailModal.policy.propertyId ? <p>Imóvel vinculado: {properties.find((pr) => pr.id === detailModal.policy.propertyId)?.title || detailModal.policy.propertyId}</p> : null}
            {detailModal.policy.contractId ? <p>Contrato vinculado: {contracts.find((c) => c.id === detailModal.policy.contractId)?.code || detailModal.policy.contractId}</p> : null}

            <div style={{ marginTop: 16 }}>
              <strong>Segurados / beneficiários</strong>
              {(detailModal.policy.parties || []).length === 0 ? (
                <p style={{ color: "var(--color-ink-muted)" }}>Nenhum registrado.</p>
              ) : (
                <ul style={{ margin: "6px 0 0", paddingLeft: 0, listStyle: "none" }}>
                  {detailModal.policy.parties.map((party) => (
                    <li key={party.id} style={{ padding: "4px 0" }}>
                      {party.partyRole === "INSURED" ? "Segurado" : party.partyRole === "BENEFICIARY" ? "Beneficiário" : party.partyRole}
                      {" — "}
                      {people.find((p) => p.id === party.personId)?.legalName || party.personId}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <strong>Sinistros</strong>
              {(detailModal.policy.claims || []).length === 0 ? (
                <p style={{ color: "var(--color-ink-muted)" }}>Nenhum sinistro aberto.</p>
              ) : (
                detailModal.policy.claims.map((claim) => (
                  <div key={claim.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        <Badge tone={CLAIM_STATUS_TONE[claim.status]}>{CLAIM_STATUS_LABELS[claim.status]}</Badge>
                        {" "}{claim.description}
                      </span>
                      {claim.status === "OPEN" ? (
                        <Button size="sm" onClick={() => handleSubmitClaim(claim.id)} loading={busyId === claim.id}>Submeter</Button>
                      ) : null}
                    </div>
                    {claim.settledAmount ? <p style={{ margin: "4px 0 0" }}>Liquidado: {formatBRL(claim.settledAmount)}</p> : null}
                    {(claim.events || []).length > 0 ? (
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "var(--color-ink-muted)", fontSize: "var(--text-body-sm)" }}>
                        {claim.events.map((ev) => (
                          <li key={ev.id}>{formatDateTime(ev.occurredAt)} — {ev.eventType}{ev.notes ? `: ${ev.notes}` : ""}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <strong>Parcelas do prêmio</strong>
              {installments.length === 0 ? (
                <p style={{ color: "var(--color-ink-muted)" }}>Nenhuma parcela gerada ainda (emita a apólice primeiro).</p>
              ) : (
                installments.map((inst) => (
                  <div key={inst.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--color-border)", gap: 8 }}>
                    <span>
                      {formatDateTime(inst.dueDate || inst.due_date)} — {formatBRL(inst.amount)}{" "}
                      <Badge tone={inst.status === "PAID" ? "success" : inst.status === "OVERDUE" ? "danger" : "neutral"}>
                        {inst.status === "PAID" ? "Paga" : inst.status === "OVERDUE" ? "Vencida" : "Pendente"}
                      </Badge>
                    </span>
                    {inst.status !== "PAID" ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Input
                          placeholder="ID do lançamento financeiro"
                          value={payForm[inst.id] || ""}
                          onChange={(e) => setPayForm((p) => ({ ...p, [inst.id]: e.target.value }))}
                          style={{ width: 220 }}
                        />
                        <Button size="sm" onClick={() => handlePayInstallment(inst.id)} loading={busyId === inst.id}>Dar baixa</Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <strong>Documentos</strong>
              {documents.length === 0 ? (
                <p style={{ color: "var(--color-ink-muted)" }}>Nenhum documento anexado.</p>
              ) : (
                <ul style={{ margin: "6px 0 0", paddingLeft: 0, listStyle: "none" }}>
                  {documents.map((doc) => (
                    <li key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--color-border)" }}>
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
              <label htmlFor="f-insurance-doc" style={{ display: "inline-block", marginTop: 8 }}>
                <Button size="sm" variant="secondary" loading={uploadingDoc} onClick={() => document.getElementById("f-insurance-doc")?.click()}>
                  Anexar documento
                </Button>
              </label>
              <input id="f-insurance-doc" type="file" style={{ display: "none" }} onChange={handleUploadDocument} />
            </div>

            {["ACTIVE", "ISSUED"].includes(detailModal.policy.status) ? (
              <div style={{ marginTop: 16 }}>
                <strong>Abrir novo sinistro</strong>
                <FormField label="Descrição">
                  <Input value={claimForm.description} onChange={(e) => setClaimForm((p) => ({ ...p, description: e.target.value }))} />
                </FormField>
                <FormField label="Valor do sinistro">
                  <DecimalInput value={claimForm.claimAmount} onChange={(e) => setClaimForm((p) => ({ ...p, claimAmount: e.target.value }))} />
                </FormField>
                <Button size="sm" onClick={handleOpenClaim} loading={saving}>Abrir sinistro</Button>
              </div>
            ) : null}
          </>
        ) : null}
      </Modal>

      <FileViewerModal open={!!viewerFile} onClose={() => setViewerFile(null)} fileId={viewerFile?.id} />
    </AppShell>
  );
}
