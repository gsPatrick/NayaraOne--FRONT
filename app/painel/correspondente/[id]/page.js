"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Input from "@/components/atoms/Input/Input";
import Modal from "@/components/organisms/Modal/Modal";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import {
  getFinancingCase,
  listCaseRequirements,
  createCaseRequirement,
  uploadCaseDocument,
  validateCaseRequirement,
  listSimulations,
  createSimulation,
  listSubmissions,
  submitFinancingCase,
  acknowledgeUnknownSubmission,
  getFinancingCaseStatus,
  listAppraisals,
  createAppraisal,
  listCommissionEntitlements,
  getCorrespondentParameters,
  createCommissionEntitlement,
  confirmCommissionEntitlement,
  receiveCommissionEntitlement,
  chargebackCommissionEntitlement,
  requestInvoice,
} from "@/lib/api/correspondent";
import { uploadFile } from "@/lib/api/legal";
import NaySummary from "@/components/organisms/NaySummary/NaySummary";
import FinancingCaseWorkflow from "@/components/organisms/FinancingCaseWorkflow/FinancingCaseWorkflow";
import { formatDateTime, formatBRL, formatPercent, toNumber } from "@/lib/format";

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
  if ((row?.providerCode || row?.provider_code) === "manual" && row?.status === "SUBMITTED") {
    return "Aguardando ação manual no banco";
  }
  return STATUS_LABELS[row?.status] || row?.status;
}

function submissionStatusLabel(sub) {
  const raw = sub?.responseSnapshot || sub?.response_snapshot;
  if (raw?.status === "PENDING_MANUAL_ACTION") return "Aguardando ação manual";
  return SUBMISSION_STATUS_LABELS[sub?.status] || sub?.status;
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

const SUBMISSION_STATUS_LABELS = { PENDING: "Enviando…", SUBMITTED: "Enviado", UNKNOWN: "Status indeterminado", FAILED: "Falhou", CANCELED: "Cancelado" };
const SUBMISSION_STATUS_TONE = { PENDING: "neutral", SUBMITTED: "success", UNKNOWN: "warning", FAILED: "danger", CANCELED: "neutral" };

const PROVIDER_LABELS = {
  sandbox: "Sandbox (simulação, sem envio real a nenhum banco)",
  manual: "Manual (corretor conduz o caso com o banco por fora do sistema)",
};
const PROVIDER_SHORT_LABELS = { sandbox: "Sandbox", manual: "Manual" };
const PURPOSE_LABELS = { RESIDENCIAL: "Residencial", COMERCIAL: "Comercial" };
const PRODUCT_LABELS = {
  FINANCIAMENTO_IMOBILIARIO: "Financiamento imobiliário",
  REFINANCIAMENTO: "Refinanciamento",
  CREDITO_COM_GARANTIA: "Crédito com garantia de imóvel",
  CONSTRUCAO: "Financiamento de construção",
};
const TRIGGER_EVENT_LABELS = {
  CONTRATO_ASSINADO: "Contrato assinado",
  RECURSO_LIBERADO: "Recurso liberado pelo banco",
  REGISTRO_MANUAL: "Registro manual",
};

const COMMISSION_STATUS_LABELS = {
  EXPECTED: "Prevista",
  CONFIRMED: "Confirmada",
  RECEIVABLE: "A receber (lançamento criado)",
  RECEIVED: "Recebida",
  ADJUSTED: "Estornada/ajustada",
};
const COMMISSION_STATUS_TONE = {
  EXPECTED: "neutral",
  CONFIRMED: "info",
  RECEIVABLE: "info",
  RECEIVED: "success",
  ADJUSTED: "danger",
};

const APPLICANT_ROLE_LABELS = { PRINCIPAL: "Proponente principal", CO_APPLICANT: "Co-proponente" };

const DOCUMENT_TYPE_LABELS = {
  RG_CPF: "RG/CPF",
  COMPROVANTE_RENDA: "Comprovante de renda",
  COMPROVANTE_RESIDENCIA: "Comprovante de residência",
  MATRICULA_IMOVEL: "Matrícula do imóvel",
  CERTIDAO_ESTADO_CIVIL: "Certidão de estado civil",
  IPTU: "IPTU",
  OUTRO: "Outro",
};

const REQUIREMENT_STATUS_LABELS = {
  PENDING: "Pendente",
  SUBMITTED: "Enviado",
  VALIDATED: "Validado",
  REJECTED: "Rejeitado",
  EXPIRED: "Expirado",
};
const REQUIREMENT_STATUS_TONE = { PENDING: "warning", SUBMITTED: "info", VALIDATED: "success", REJECTED: "danger", EXPIRED: "neutral" };

export default function FinancingCaseDetailPage() {
  const { id } = useParams();
  const [financingCase, setFinancingCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [requirements, setRequirements] = useState([]);
  const [requirementsLoading, setRequirementsLoading] = useState(true);
  const [requirementsError, setRequirementsError] = useState("");
  const [newRequirementType, setNewRequirementType] = useState("RG_CPF");
  const [addingRequirement, setAddingRequirement] = useState(false);
  const [actionError, setActionError] = useState("");
  const [uploadingRequirementId, setUploadingRequirementId] = useState(null);
  const [validatingRequirementId, setValidatingRequirementId] = useState(null);
  const [submitConsent, setSubmitConsent] = useState(false);

  const [simulations, setSimulations] = useState([]);
  const [simulationsLoading, setSimulationsLoading] = useState(true);
  const [simulationsError, setSimulationsError] = useState("");
  const [simAmount, setSimAmount] = useState("");
  const [simTermMonths, setSimTermMonths] = useState("360");
  const [creatingSimulation, setCreatingSimulation] = useState(false);
  const [simulationFormError, setSimulationFormError] = useState("");

  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionsError, setSubmissionsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  const [statusHistory, setStatusHistory] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);

  const [appraisals, setAppraisals] = useState([]);
  const [appraisalsLoading, setAppraisalsLoading] = useState(true);
  const [appraisalsError, setAppraisalsError] = useState("");
  const [requestingAppraisal, setRequestingAppraisal] = useState(false);
  const [appraisalFormError, setAppraisalFormError] = useState("");

  const [commissions, setCommissions] = useState([]);
  const [commissionsLoading, setCommissionsLoading] = useState(true);
  const [commissionsError, setCommissionsError] = useState("");
  const [commissionBaseAmount, setCommissionBaseAmount] = useState("");
  const [commissionTrigger, setCommissionTrigger] = useState("");
  const [triggerOptions, setTriggerOptions] = useState([]);
  const [creatingCommission, setCreatingCommission] = useState(false);
  const [commissionFormError, setCommissionFormError] = useState("");
  const [commissionNotice, setCommissionNotice] = useState("");
  const [confirmingCommissionId, setConfirmingCommissionId] = useState(null);
  const [chargebackCommissionId, setChargebackCommissionId] = useState(null);
  const [invoicingCommissionId, setInvoicingCommissionId] = useState(null);
  const [receivingCommissionId, setReceivingCommissionId] = useState(null);
  const [confirmTargetId, setConfirmTargetId] = useState(null);
  const [confirmExternalId, setConfirmExternalId] = useState("");
  const [chargebackTargetId, setChargebackTargetId] = useState(null);
  const [chargebackReason, setChargebackReason] = useState("");

  function loadCommissions() {
    setCommissionsLoading(true);
    setCommissionsError("");
    listCommissionEntitlements(id)
      .then(setCommissions)
      .catch((err) => setCommissionsError(err?.message || "Não foi possível carregar as comissões deste caso."))
      .finally(() => setCommissionsLoading(false));
  }

  function loadAppraisals() {
    setAppraisalsLoading(true);
    setAppraisalsError("");
    listAppraisals(id)
      .then(setAppraisals)
      .catch((err) => setAppraisalsError(err?.message || "Não foi possível carregar as avaliações deste caso."))
      .finally(() => setAppraisalsLoading(false));
  }

  function loadSubmissions() {
    setSubmissionsLoading(true);
    setSubmissionsError("");
    listSubmissions(id)
      .then(setSubmissions)
      .catch((err) => setSubmissionsError(err?.message || "Não foi possível carregar o histórico de envios."))
      .finally(() => setSubmissionsLoading(false));
  }

  function loadStatus() {
    setStatusLoading(true);
    getFinancingCaseStatus(id)
      .then((data) => setStatusHistory(data.history || []))
      .catch(() => setStatusHistory([]))
      .finally(() => setStatusLoading(false));
  }

  function loadSimulations() {
    setSimulationsLoading(true);
    setSimulationsError("");
    listSimulations(id)
      .then(setSimulations)
      .catch((err) => setSimulationsError(err?.message || "Não foi possível carregar as simulações deste caso."))
      .finally(() => setSimulationsLoading(false));
  }

  function loadRequirements() {
    setRequirementsLoading(true);
    setRequirementsError("");
    listCaseRequirements(id)
      .then(setRequirements)
      .catch((err) => setRequirementsError(err?.message || "Não foi possível carregar o checklist de documentos."))
      .finally(() => setRequirementsLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    getFinancingCase(id)
      .then(setFinancingCase)
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar o caso de financiamento."))
      .finally(() => setLoading(false));
    loadRequirements();
    loadSimulations();
    loadSubmissions();
    loadStatus();
    loadAppraisals();
    loadCommissions();
    getCorrespondentParameters()
      .then((p) => {
        const allowed = p?.commission?.action?.allowedTriggerEvents || [];
        setTriggerOptions(allowed);
        setCommissionTrigger(p?.commission?.action?.defaultTriggerEvent || allowed[0] || "");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function refreshCase() {
    getFinancingCase(id).then(setFinancingCase).catch(() => {});
  }

  async function handleSubmitToProvider() {
    setSubmitError("");
    if (!submitConsent) {
      setSubmitError("Marque a autorização do cliente antes de enviar.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFinancingCase(id, { consent: true });
      loadSubmissions();
      loadStatus();
      refreshCase();
      let ticks = 0;
      const timer = setInterval(() => {
        ticks += 1;
        loadSubmissions();
        loadStatus();
        refreshCase();
        if (ticks >= 5) clearInterval(timer);
      }, 3000);
    } catch (err) {
      setSubmitError(err?.message || (financingCase?.providerCode === "manual" ? "Não foi possível registrar o caso para ação manual." : "Não foi possível enviar o caso ao provider."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcknowledgeUnknown(submissionId) {
    setAcknowledgingId(submissionId);
    setSubmitError("");
    try {
      await acknowledgeUnknownSubmission(id, submissionId);
      loadSubmissions();
    } catch (err) {
      setSubmitError(err?.message || "Não foi possível confirmar a consulta de status.");
    } finally {
      setAcknowledgingId(null);
    }
  }

  async function handleCreateSimulation() {
    setSimulationFormError("");
    const amount = toNumber(simAmount);
    const termMonths = Number(simTermMonths);
    if (!amount || amount <= 0) {
      setSimulationFormError("Informe o valor financiado, maior que zero.");
      return;
    }
    if (!termMonths || termMonths <= 0 || !Number.isInteger(termMonths)) {
      setSimulationFormError("Informe o prazo em meses, um número inteiro maior que zero.");
      return;
    }
    setCreatingSimulation(true);
    try {
      await createSimulation(id, { amount, termMonths });
      setSimAmount("");
      loadSimulations();
    } catch (err) {
      setSimulationFormError(err?.message || "Não foi possível criar a simulação.");
    } finally {
      setCreatingSimulation(false);
    }
  }

  async function handleRequestAppraisal() {
    setAppraisalFormError("");
    setRequestingAppraisal(true);
    try {
      const latest = [...simulations].sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))[0];
      const referenceValue = latest ? toNumber(latest.amount) : undefined;
      await createAppraisal(id, referenceValue ? { referenceValue } : {});
      loadAppraisals();
      let ticks = 0;
      const timer = setInterval(() => {
        ticks += 1;
        loadAppraisals();
        if (ticks >= 4) clearInterval(timer);
      }, 3000);
    } catch (err) {
      setAppraisalFormError(err?.message || "Não foi possível solicitar a avaliação.");
    } finally {
      setRequestingAppraisal(false);
    }
  }

  async function handleCreateCommission() {
    setCommissionFormError("");
    const informado = String(commissionBaseAmount || "").trim() !== "";
    const baseAmount = informado ? toNumber(commissionBaseAmount) : undefined;
    if (informado && (!baseAmount || baseAmount <= 0)) {
      setCommissionFormError("Informe um valor-base maior que zero ou deixe vazio para usar o valor aprovado da proposta vigente.");
      return;
    }
    setCreatingCommission(true);
    try {
      await createCommissionEntitlement(id, { baseAmount, triggerEvent: commissionTrigger });
      setCommissionBaseAmount("");
      loadCommissions();
    } catch (err) {
      setCommissionFormError(err?.message || "Não foi possível registrar o direito à comissão.");
    } finally {
      setCreatingCommission(false);
    }
  }

  async function handleConfirmCommission() {
    if (!confirmExternalId.trim() || !confirmTargetId) return;
    setConfirmingCommissionId(confirmTargetId);
    setCommissionFormError("");
    try {
      await confirmCommissionEntitlement(id, confirmTargetId, { externalConfirmationId: confirmExternalId.trim() });
      setConfirmTargetId(null);
      setConfirmExternalId("");
      loadCommissions();
    } catch (err) {
      setCommissionFormError(err?.message || "Não foi possível confirmar esta comissão.");
    } finally {
      setConfirmingCommissionId(null);
    }
  }

  async function handleReceiveCommission(entitlementId) {
    setReceivingCommissionId(entitlementId);
    setCommissionFormError("");
    try {
      await receiveCommissionEntitlement(id, entitlementId);
      loadCommissions();
    } catch (err) {
      setCommissionFormError(err?.message || "Não foi possível registrar o recebimento desta comissão.");
    } finally {
      setReceivingCommissionId(null);
    }
  }

  async function handleChargebackCommission() {
    if (!chargebackReason.trim() || !chargebackTargetId) return;
    setChargebackCommissionId(chargebackTargetId);
    setCommissionFormError("");
    try {
      await chargebackCommissionEntitlement(id, chargebackTargetId, { reason: chargebackReason.trim() });
      setChargebackTargetId(null);
      setChargebackReason("");
      loadCommissions();
    } catch (err) {
      setCommissionFormError(err?.message || "Não foi possível estornar esta comissão.");
    } finally {
      setChargebackCommissionId(null);
    }
  }

  async function handleRequestInvoiceForCommission(entitlement) {
    setInvoicingCommissionId(entitlement.id);
    setCommissionFormError("");
    try {
      await requestInvoice({
        sourceType: "COMMISSION_ENTITLEMENT",
        sourceId: entitlement.id,
        amount: entitlement.amount,
        description: `Comissão de correspondente bancário, provider ${PROVIDER_LABELS[entitlement.providerCode] || entitlement.providerCode}`,
      });
      setCommissionNotice("NFS-e solicitada. Acompanhe o status em Correspondente, Fiscal.");
    } catch (err) {
      setCommissionFormError(err?.message || "Não foi possível solicitar a NFS-e desta comissão.");
    } finally {
      setInvoicingCommissionId(null);
    }
  }

  async function handleAddRequirement() {
    setAddingRequirement(true);
    setActionError("");
    try {
      await createCaseRequirement(id, { documentType: newRequirementType });
      loadRequirements();
      refreshCase();
    } catch (err) {
      setActionError(err?.message || "Não foi possível adicionar o item ao checklist.");
    } finally {
      setAddingRequirement(false);
    }
  }

  async function handleUploadDocument(requirementId, file) {
    if (!file) return;
    setUploadingRequirementId(requirementId);
    setActionError("");
    try {
      const uploaded = await uploadFile(file);
      await uploadCaseDocument(id, { requirementId, fileId: uploaded.id });
      loadRequirements();
      refreshCase();
    } catch (err) {
      setActionError(err?.message || "Não foi possível enviar o documento.");
    } finally {
      setUploadingRequirementId(null);
    }
  }

  async function handleValidateRequirement(requirementId) {
    setValidatingRequirementId(requirementId);
    setActionError("");
    try {
      await validateCaseRequirement(id, requirementId);
      loadRequirements();
      refreshCase();
    } catch (err) {
      setActionError(err?.message || "Não foi possível validar este documento.");
    } finally {
      setValidatingRequirementId(null);
    }
  }

  if (loading) {
    return (
      <AppShell title="Caso de financiamento" backHref="/painel/correspondente">
        <SkeletonDetail />
      </AppShell>
    );
  }

  if (loadError || !financingCase) {
    return (
      <AppShell title="Caso de financiamento" backHref="/painel/correspondente">
        <Alert tone="danger" title="Não foi possível carregar o caso de financiamento">{loadError || "Caso não encontrado."}</Alert>
      </AppShell>
    );
  }

  return (
    <AppShell title="Caso de financiamento" backHref="/painel/correspondente">
      {actionError ? (
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}
      <Card
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            Status: <Badge tone={STATUS_TONE[financingCase.status] || "neutral"}>{financingStatusLabel(financingCase)}</Badge>
            {financingCase.possibleDuplicateOfCaseId || financingCase.possible_duplicate_of_case_id ? (
              <Badge tone="warning">Possível duplicata</Badge>
            ) : null}
          </span>
        }
        subtitle={`Criado em ${formatDateTime(financingCase.created_at || financingCase.createdAt)}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <strong>Provider</strong>
            <p>{PROVIDER_LABELS[financingCase.providerCode] || financingCase.providerCode}</p>
          </div>

          <div>
            <strong>Produto</strong>
            <p>{PRODUCT_LABELS[financingCase.product] || financingCase.product}</p>
          </div>

          <div>
            <strong>Finalidade</strong>
            <p>{PURPOSE_LABELS[financingCase.purpose] || financingCase.purpose || "Residencial"}</p>
          </div>

          <div>
            <strong>Imóvel</strong>
            <p>{financingCase.property ? `${financingCase.property.internalCode ? `${financingCase.property.internalCode} — ` : ""}${financingCase.property.title || ""}` : "Nenhum imóvel vinculado ainda."}</p>
          </div>

          <div>
            <strong>Proponentes</strong>
            {(financingCase.applicants || []).length === 0 ? (
              <p>Nenhum proponente.</p>
            ) : (
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {financingCase.applicants.map((applicant) => (
                  <li key={applicant.id}>
                    {applicant.person?.legalName || "Sem pessoa vinculada"} · {APPLICANT_ROLE_LABELS[applicant.role] || applicant.role}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Card
        title="Documentos"
        subtitle="Checklist de documentos exigidos para o caso — identidade e renda são sempre restritos, visíveis só por quem tem a permissão dedicada."
        style={{ marginTop: 16 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <FormField label="Novo item do checklist" htmlFor="new-requirement-type">
              <Select id="new-requirement-type" value={newRequirementType} onChange={(e) => setNewRequirementType(e.target.value)}>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>
            <Button variant="secondary" onClick={handleAddRequirement} loading={addingRequirement}>
              Adicionar ao checklist
            </Button>
          </div>

          {requirementsLoading ? (
            <p>Carregando checklist…</p>
          ) : requirementsError ? (
            <Alert tone="danger">{requirementsError}</Alert>
          ) : requirements.length === 0 ? (
            <p>Nenhum documento exigido cadastrado ainda para este caso.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {requirements.map((req) => {
                const currentDocument = (req.documents || []).find((d) => !d.supersededAt && !d.superseded_at);
                return (
                  <div key={req.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong>{DOCUMENT_TYPE_LABELS[req.documentType] || req.documentType}</strong>
                      <Badge tone={REQUIREMENT_STATUS_TONE[req.status] || "neutral"}>{REQUIREMENT_STATUS_LABELS[req.status] || req.status}</Badge>
                    </div>
                    {currentDocument ? (
                      <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-ink-soft)" }}>
                        {currentDocument.file?.fileName ? `Arquivo atual: ${currentDocument.file.fileName} (versão ${currentDocument.version})` : `Documento enviado (versão ${currentDocument.version}) — sem permissão para ver o nome do arquivo.`}
                      </p>
                    ) : null}
                    {currentDocument?.suggestedNote ? (
                      <p style={{ marginTop: 8, fontSize: 13 }}>{currentDocument.suggestedNote}</p>
                    ) : null}
                    <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <FileDropInput
                        id={`requirement-upload-${req.id}`}
                        accept="image/*,application/pdf"
                        uploading={uploadingRequirementId === req.id}
                        fileNames={[]}
                        onFiles={(files) => files[0] && handleUploadDocument(req.id, files[0])}
                        helper={currentDocument ? "Enviar um novo arquivo substitui a versão vigente (a anterior fica preservada no histórico)." : "Nenhum arquivo enviado ainda."}
                      />
                      {req.status === "SUBMITTED" ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleValidateRequirement(req.id)}
                          loading={validatingRequirementId === req.id}
                        >
                          Validar documento
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Simulações"
        subtitle="Cada simulação fica registrada à parte — simular de novo não apaga nem substitui as anteriores, para comparar propostas lado a lado."
        style={{ marginTop: 16 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <FormField label="Valor financiado (R$)" htmlFor="sim-amount">
              <DecimalInput id="sim-amount" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} placeholder="0,00" />
            </FormField>
            <FormField label="Prazo (meses)" htmlFor="sim-term">
              <Select id="sim-term" value={simTermMonths} onChange={(e) => setSimTermMonths(e.target.value)}>
                {[60, 120, 180, 240, 300, 360].map((months) => (
                  <option key={months} value={months}>{months} meses</option>
                ))}
              </Select>
            </FormField>
            <Button onClick={handleCreateSimulation} loading={creatingSimulation}>
              Nova simulação
            </Button>
          </div>
          {simulationFormError ? <Alert tone="danger">{simulationFormError}</Alert> : null}

          {simulationsLoading ? (
            <p>Carregando simulações…</p>
          ) : simulationsError ? (
            <Alert tone="danger">{simulationsError}</Alert>
          ) : simulations.length === 0 ? (
            <p>Nenhuma simulação feita ainda para este caso.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              {simulations.length > 1 ? (
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                  Comparação objetiva pela menor parcela — não é promessa de aprovação, taxa ou prazo.
                </p>
              ) : null}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ padding: "8px 12px" }}>Data</th>
                    <th style={{ padding: "8px 12px" }}>Provider</th>
                    <th style={{ padding: "8px 12px" }}>Valor financiado</th>
                    <th style={{ padding: "8px 12px" }}>Prazo</th>
                    <th style={{ padding: "8px 12px" }}>Taxa (a.m.)</th>
                    <th style={{ padding: "8px 12px" }}>Parcela estimada</th>
                    <th style={{ padding: "8px 12px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const lowestId = simulations.reduce((best, s) =>
                      !best || Number(s.monthlyPayment) < Number(best.monthlyPayment) ? s : best
                    , null)?.id;
                    return simulations.map((sim) => (
                      <tr key={sim.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td style={{ padding: "8px 12px" }}>{formatDateTime(sim.created_at || sim.createdAt)}</td>
                        <td style={{ padding: "8px 12px" }}>{PROVIDER_SHORT_LABELS[sim.providerCode] || sim.providerCode}</td>
                        <td style={{ padding: "8px 12px" }}>{formatBRL(sim.amount)}</td>
                        <td style={{ padding: "8px 12px" }}>{sim.termMonths} meses</td>
                        <td style={{ padding: "8px 12px" }}>{formatPercent(Number(sim.rate) * 100)}</td>
                        <td style={{ padding: "8px 12px" }}>{formatBRL(sim.monthlyPayment)}</td>
                        <td style={{ padding: "8px 12px" }}>
                          {simulations.length > 1 && sim.id === lowestId ? <Badge tone="success">Menor parcela</Badge> : null}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
      <Card
        title={financingCase?.providerCode === "manual" ? "Ação manual no banco" : "Envio ao provider"}
        subtitle={financingCase?.providerCode === "manual"
          ? "Este provider não envia a proposta sozinho. Registrar aqui só guarda o pedido para alguém levar ao banco. Registrar de novo com os mesmos dados não cria um segundo pedido."
          : "Envia o caso para o banco/financeira configurado. Enviar de novo com os mesmos dados nunca cria um segundo envio — o sistema reconhece quando já existe uma tentativa igual."}
        style={{ marginTop: 16 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(() => {
            const latestSubmission = submissions[0];
            const isUnknown = latestSubmission && latestSubmission.status === "UNKNOWN";
            return (
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={submitConsent}
                    onChange={(e) => setSubmitConsent(e.target.checked)}
                  />
                  {financingCase?.providerCode === "manual" ? "O cliente autorizou registrar esta proposta para ação manual" : "O cliente autorizou o envio desta proposta"}
                </label>
                <Button onClick={handleSubmitToProvider} loading={submitting} disabled={isUnknown || !submitConsent}>
                  {financingCase?.providerCode === "manual" ? "Registrar ação manual" : "Enviar ao provider"}
                </Button>
                {isUnknown ? (
                  <Button
                    variant="secondary"
                    onClick={() => handleAcknowledgeUnknown(latestSubmission.id)}
                    loading={acknowledgingId === latestSubmission.id}
                  >
                    Confirmar consulta de status e liberar novo envio
                  </Button>
                ) : null}
              </div>
            );
          })()}
          {submitError ? <Alert tone="danger">{submitError}</Alert> : null}
          {submissions[0]?.status === "UNKNOWN" ? (
            <Alert tone="warning" title="Status indeterminado no último envio">
              Não foi possível confirmar se o provider recebeu este caso (tempo esgotado ou erro de comunicação). Para
              sua segurança, o sistema não reenvia automaticamente — confirme acima que você está ciente antes de
              tentar um novo envio, assim não corremos o risco de duplicar a proposta no banco.
            </Alert>
          ) : null}

          {submissionsLoading ? (
            <p>Carregando histórico de envios…</p>
          ) : submissionsError ? (
            <Alert tone="danger">{submissionsError}</Alert>
          ) : submissions.length === 0 ? (
            <p>Nenhum envio realizado ainda para este caso.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ padding: "8px 12px" }}>Data</th>
                    <th style={{ padding: "8px 12px" }}>Provider</th>
                    <th style={{ padding: "8px 12px" }}>Status</th>
                    <th style={{ padding: "8px 12px" }}>Identificador no provider</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "8px 12px" }}>{formatDateTime(sub.created_at || sub.createdAt)}</td>
                      <td style={{ padding: "8px 12px" }}>{PROVIDER_SHORT_LABELS[sub.providerCode] || sub.providerCode}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <Badge tone={SUBMISSION_STATUS_TONE[sub.status] || "neutral"}>{submissionStatusLabel(sub)}</Badge>
                      </td>
                      <td style={{ padding: "8px 12px" }}>{sub.externalCaseId || "Sem identificador no provider"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <strong>Histórico de status</strong>
            {statusLoading ? (
              <p>Carregando histórico…</p>
            ) : statusHistory.length === 0 ? (
              <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-ink-soft)" }}>Nenhuma atualização de status recebida ainda.</p>
            ) : (
              <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                {statusHistory.map((entry) => (
                  <li key={entry.id} style={{ fontSize: 13, color: entry.applied ? "var(--color-ink)" : "var(--color-ink-soft)" }}>
                    {formatDateTime(entry.occurred_at || entry.occurredAt)} — {entry.normalizedStatus ? (STATUS_LABELS[entry.normalizedStatus] || entry.normalizedStatus) : "Status não reconhecido"}
                    {!entry.applied ? " (recebido fora de ordem, não alterou o status atual)" : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <FinancingCaseWorkflow
        financingCase={financingCase}
        onChanged={() => {
          refreshCase();
          loadStatus();
          loadSubmissions();
        }}
      />

      <Card
        title="Avaliação do imóvel"
        subtitle="Avaliação feita pelo banco/financeira — é só informativa. Ela nunca altera o preço ou a oferta cadastrada do imóvel; qualquer ajuste de preço continua sendo uma decisão manual, separada daqui."
        style={{ marginTop: 16 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Button variant="secondary" onClick={handleRequestAppraisal} loading={requestingAppraisal}>
              Solicitar avaliação
            </Button>
          </div>
          {appraisalFormError ? <Alert tone="danger">{appraisalFormError}</Alert> : null}

          {appraisalsLoading ? (
            <p>Carregando avaliações…</p>
          ) : appraisalsError ? (
            <Alert tone="danger">{appraisalsError}</Alert>
          ) : appraisals.length === 0 ? (
            <p>Nenhuma avaliação solicitada ainda para este caso.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ padding: "8px 12px" }}>Data</th>
                    <th style={{ padding: "8px 12px" }}>Provider</th>
                    <th style={{ padding: "8px 12px" }}>Status</th>
                    <th style={{ padding: "8px 12px" }}>Valor avaliado (informativo)</th>
                  </tr>
                </thead>
                <tbody>
                  {appraisals.map((ap) => (
                    <tr key={ap.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "8px 12px" }}>{formatDateTime(ap.created_at || ap.createdAt)}</td>
                      <td style={{ padding: "8px 12px" }}>{PROVIDER_SHORT_LABELS[ap.providerCode] || ap.providerCode}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <Badge tone={ap.status === "COMPLETED" ? "success" : ap.status === "FAILED" ? "danger" : "warning"}>
                          {ap.status === "COMPLETED" ? "Concluída" : ap.status === "FAILED" ? "Falhou" : "Solicitada"}
                        </Badge>
                      </td>
                      <td style={{ padding: "8px 12px" }}>{(ap.requestedValue ?? ap.requested_value) != null ? formatBRL(ap.requestedValue ?? ap.requested_value) : "Sem valor solicitado"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <NaySummary financingCaseId={id} />

      <Card
        title="Comissão"
        subtitle="Direito a comissão de correspondente bancário sobre este caso. O percentual vem configurado no Motor de Regras, não é digitado aqui."
        style={{ marginTop: 16 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <FormField label="Valor-base (R$)" htmlFor="commission-base-amount" helper="Vazio usa o valor aprovado da proposta vigente do banco.">
              <DecimalInput id="commission-base-amount" value={commissionBaseAmount} onChange={(e) => setCommissionBaseAmount(e.target.value)} placeholder="0,00" />
            </FormField>
            <FormField label="Fato gerador" htmlFor="commission-trigger">
              <Select id="commission-trigger" value={commissionTrigger} onChange={(e) => setCommissionTrigger(e.target.value)}>
                {triggerOptions.map((value) => (
                  <option key={value} value={value}>{TRIGGER_EVENT_LABELS[value] || value}</option>
                ))}
              </Select>
            </FormField>
            <Button onClick={handleCreateCommission} loading={creatingCommission}>
              Registrar direito à comissão
            </Button>
          </div>
          {commissionFormError ? <Alert tone="danger">{commissionFormError}</Alert> : null}
          {commissionNotice ? <Alert tone="success">{commissionNotice}</Alert> : null}

          {commissionsLoading ? (
            <p>Carregando comissões…</p>
          ) : commissionsError ? (
            <Alert tone="danger">{commissionsError}</Alert>
          ) : commissions.length === 0 ? (
            <p>Nenhuma comissão registrada ainda para este caso.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ padding: "8px 12px" }}>Data</th>
                    <th style={{ padding: "8px 12px" }}>Provider</th>
                    <th style={{ padding: "8px 12px" }}>Fato gerador</th>
                    <th style={{ padding: "8px 12px" }}>Base</th>
                    <th style={{ padding: "8px 12px" }}>Percentual</th>
                    <th style={{ padding: "8px 12px" }}>Valor</th>
                    <th style={{ padding: "8px 12px" }}>Corretor</th>
                    <th style={{ padding: "8px 12px" }}>Gerente</th>
                    <th style={{ padding: "8px 12px" }}>Status</th>
                    <th style={{ padding: "8px 12px" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "8px 12px" }}>{formatDateTime(c.created_at || c.createdAt)}</td>
                      <td style={{ padding: "8px 12px" }}>{PROVIDER_LABELS[c.providerCode] || c.providerCode}</td>
                      <td style={{ padding: "8px 12px" }}>{TRIGGER_EVENT_LABELS[c.triggerEvent] || c.triggerEvent}</td>
                      <td style={{ padding: "8px 12px" }}>{formatBRL(c.baseAmount)}</td>
                      <td style={{ padding: "8px 12px" }}>{formatPercent(c.percentage)}</td>
                      <td style={{ padding: "8px 12px" }}>{formatBRL(c.amount)}</td>
                      <td style={{ padding: "8px 12px" }}>{formatBRL(c.brokerAmount)} ({formatPercent(c.brokerSharePct)})</td>
                      <td style={{ padding: "8px 12px" }}>{formatBRL(c.managerAmount)} ({formatPercent(c.managerSharePct)})</td>
                      <td style={{ padding: "8px 12px" }}>
                        <Badge tone={COMMISSION_STATUS_TONE[c.status] || "neutral"}>
                          {COMMISSION_STATUS_LABELS[c.status] || c.status}
                        </Badge>
                      </td>
                      <td style={{ padding: "8px 12px", display: "flex", gap: 8 }}>
                        {c.status === "EXPECTED" ? (
                          <Button
                            variant="secondary"
                            onClick={() => { setConfirmTargetId(c.id); setConfirmExternalId(""); }}
                            loading={confirmingCommissionId === c.id}
                          >
                            Confirmar
                          </Button>
                        ) : null}
                        {c.status === "RECEIVABLE" ? (
                          <Button
                            variant="secondary"
                            onClick={() => handleReceiveCommission(c.id)}
                            loading={receivingCommissionId === c.id}
                          >
                            Receber
                          </Button>
                        ) : null}
                        {c.status === "RECEIVABLE" || c.status === "CONFIRMED" ? (
                          <Button
                            variant="secondary"
                            onClick={() => { setChargebackTargetId(c.id); setChargebackReason(""); }}
                            loading={chargebackCommissionId === c.id}
                          >
                            Estornar
                          </Button>
                        ) : null}
                        {c.status === "RECEIVABLE" || c.status === "RECEIVED" ? (
                          <Button
                            variant="secondary"
                            onClick={() => handleRequestInvoiceForCommission(c)}
                            loading={invoicingCommissionId === c.id}
                          >
                            Emitir NFS-e
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
      <Modal
        open={Boolean(confirmTargetId)}
        onClose={() => setConfirmTargetId(null)}
        title="Confirmar comissão"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmTargetId(null)}>Cancelar</Button>
            <Button onClick={handleConfirmCommission} disabled={!confirmExternalId.trim()} loading={Boolean(confirmingCommissionId)}>Confirmar</Button>
          </>
        }
      >
        <FormField label="Identificação da confirmação" htmlFor="commission-external-id" helper="Vem do banco ou da financeira. Confirmar de novo com a mesma identificação não duplica o recebível.">
          <Input id="commission-external-id" value={confirmExternalId} onChange={(e) => setConfirmExternalId(e.target.value)} />
        </FormField>
      </Modal>
      <Modal
        open={Boolean(chargebackTargetId)}
        onClose={() => setChargebackTargetId(null)}
        title="Estornar comissão"
        footer={
          <>
            <Button variant="secondary" onClick={() => setChargebackTargetId(null)}>Cancelar</Button>
            <Button onClick={handleChargebackCommission} disabled={!chargebackReason.trim()} loading={Boolean(chargebackCommissionId)}>Estornar</Button>
          </>
        }
      >
        <FormField label="Motivo do estorno" htmlFor="commission-chargeback-reason">
          <Input id="commission-chargeback-reason" value={chargebackReason} onChange={(e) => setChargebackReason(e.target.value)} />
        </FormField>
      </Modal>
    </AppShell>
  );
}
