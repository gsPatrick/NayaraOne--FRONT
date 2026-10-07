"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import {
  getInsurancePolicy, quoteInsurancePolicy, issueInsurancePolicy, openInsuranceClaim, submitInsuranceClaim,
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

export default function ApoliceDetailPage() {
  const { id } = useParams();

  const [policy, setPolicy] = useState(null);
  const [properties, setProperties] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [people, setPeople] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [installments, setInstallments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);
  const [claimForm, setClaimForm] = useState({ description: "", claimAmount: "" });
  const [payForm, setPayForm] = useState({});

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([
      getInsurancePolicy(id),
      listProperties(),
      listContracts(),
      listPeople(),
      listInsurancePolicyDocuments(id).catch(() => []),
      listInsurancePolicyInstallments(id).catch(() => []),
    ])
      .then(([p, props, contrs, ppl, docs, insts]) => {
        setPolicy(p);
        setProperties(props || []);
        setContracts(contrs || []);
        setPeople(ppl || []);
        setDocuments(docs || []);
        setInstallments(insts || []);
      })
      .catch((err) => {
        if (err?.status === 404 || err?.code === "INSURANCE_POLICY_NOT_FOUND") {
          setNotFoundFlag(true);
        } else {
          setLoadError(err?.message || "Não foi possível carregar a apólice.");
        }
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [id]);

  async function reloadPolicyAndInstallments() {
    const [p, insts] = await Promise.all([getInsurancePolicy(id), listInsurancePolicyInstallments(id).catch(() => [])]);
    setPolicy(p);
    setInstallments(insts || []);
  }

  async function handleQuote() {
    setBusy(true);
    setActionError("");
    try {
      await quoteInsurancePolicy(id, {});
      await load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível cotar a apólice.");
    } finally {
      setBusy(false);
    }
  }

  async function handleIssue() {
    setBusy(true);
    setActionError("");
    try {
      const today = new Date();
      const nextYear = new Date(today);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      await issueInsurancePolicy(id, {
        effectiveDate: today.toISOString().slice(0, 10),
        expiryDate: nextYear.toISOString().slice(0, 10),
      });
      await load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível emitir a apólice.");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenClaim() {
    if (!claimForm.description.trim()) {
      setActionError('O campo "Descrição" é obrigatório para abrir um sinistro.');
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      await openInsuranceClaim(id, {
        description: claimForm.description.trim(),
        claimAmount: claimForm.claimAmount ? toNumber(claimForm.claimAmount) : undefined,
      });
      setClaimForm({ description: "", claimAmount: "" });
      await load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível abrir o sinistro.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitClaim(claimId) {
    setBusyId(claimId);
    setActionError("");
    try {
      await submitInsuranceClaim(claimId);
      await load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível submeter o sinistro.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUploadDocument(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingDoc(true);
    setActionError("");
    try {
      const uploaded = await uploadFile(file);
      await attachInsurancePolicyDocument(id, uploaded.id);
      const docs = await listInsurancePolicyDocuments(id);
      setDocuments(docs || []);
    } catch (err) {
      setActionError(err?.message || "Não foi possível anexar o documento.");
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handlePayInstallment(installmentId) {
    const financialEntryId = (payForm[installmentId] || "").trim();
    if (!financialEntryId) return;
    setBusyId(installmentId);
    setActionError("");
    try {
      await payInsurancePolicyInstallment(installmentId, financialEntryId);
      await reloadPolicyAndInstallments();
      setPayForm((p) => ({ ...p, [installmentId]: "" }));
    } catch (err) {
      setActionError(err?.message || "Não foi possível dar baixa na parcela.");
    } finally {
      setBusyId(null);
    }
  }

  if (notFoundFlag) notFound();

  return (
    <AppShell title="Apólice de seguro" backHref="/painel/compras/seguros">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar a apólice">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      {loading ? (
        <SkeletonDetail />
      ) : policy ? (
        <>
          <Card title="Dados da apólice">
            <p>
              <Badge tone={POLICY_STATUS_TONE[policy.status]}>{POLICY_STATUS_LABELS[policy.status]}</Badge>
              {" — "}
              {policy.provider || "sandbox"}
              {policy.externalPolicyNumber ? ` — Nº ${policy.externalPolicyNumber}` : ""}
            </p>
            {policy.premiumAmount ? <p>Prêmio: {formatBRL(policy.premiumAmount)}</p> : null}
            {policy.coverageSummary ? <p>Cobertura: {policy.coverageSummary}</p> : null}
            {policy.propertyId ? <p>Imóvel vinculado: {properties.find((pr) => pr.id === policy.propertyId)?.title || policy.propertyId}</p> : null}
            {policy.contractId ? <p>Contrato vinculado: {contracts.find((c) => c.id === policy.contractId)?.code || policy.contractId}</p> : null}

            <div style={{ marginTop: 16 }}>
              <strong>Segurados / beneficiários</strong>
              {(policy.parties || []).length === 0 ? (
                <p style={{ color: "var(--color-ink-muted)" }}>Nenhum registrado.</p>
              ) : (
                <ul style={{ margin: "6px 0 0", paddingLeft: 0, listStyle: "none" }}>
                  {policy.parties.map((party) => (
                    <li key={party.id} style={{ padding: "4px 0" }}>
                      {party.partyRole === "INSURED" ? "Segurado" : party.partyRole === "BENEFICIARY" ? "Beneficiário" : party.partyRole}
                      {" — "}
                      {people.find((p) => p.id === party.personId)?.legalName || party.personId}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card title="Sinistros">
            {(policy.claims || []).length === 0 ? (
              <p style={{ color: "var(--color-ink-muted)" }}>Nenhum sinistro aberto.</p>
            ) : (
              policy.claims.map((claim) => (
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

            {["ACTIVE", "ISSUED"].includes(policy.status) ? (
              <div style={{ marginTop: 16 }}>
                <strong>Abrir novo sinistro</strong>
                <FormField label="Descrição" required>
                  <Input value={claimForm.description} onChange={(e) => setClaimForm((p) => ({ ...p, description: e.target.value }))} />
                </FormField>
                <FormField label="Valor do sinistro">
                  <DecimalInput value={claimForm.claimAmount} onChange={(e) => setClaimForm((p) => ({ ...p, claimAmount: e.target.value }))} />
                </FormField>
                <Button size="sm" onClick={handleOpenClaim} loading={busy}>Abrir sinistro</Button>
              </div>
            ) : null}
          </Card>

          <Card title="Parcelas do prêmio">
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
          </Card>

          <Card title="Documentos">
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
          </Card>

          <StickyActionBar>
            {policy.status === "DRAFT" ? <Button onClick={handleQuote} loading={busy}>Cotar</Button> : null}
            {["DRAFT", "QUOTED"].includes(policy.status) ? <Button onClick={handleIssue} loading={busy}>Emitir</Button> : null}
          </StickyActionBar>

          <FileViewerModal open={!!viewerFile} onClose={() => setViewerFile(null)} fileId={viewerFile?.id} />
        </>
      ) : null}
    </AppShell>
  );
}
