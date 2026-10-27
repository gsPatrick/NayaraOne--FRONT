"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
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
  rejectCaseRequirement,
  sendDocumentsToProvider,
  getFinancingCaseStatus,
  listAppraisals,
  createAppraisal,
  listCommissionEntitlements,
  getCorrespondentParameters,
  createCommissionEntitlement,
  confirmCommissionEntitlement,
  receiveCommissionEntitlement,
  chargebackCommissionEntitlement,
  completeFinancialReversal,
  requestInvoice,
  listRequirementDocuments,
  dispenseCaseRequirement,
  listCommissionAdjustments,
} from "@/lib/api/correspondent";
import { uploadFile } from "@/lib/api/legal";
import NaySummary from "@/components/organisms/NaySummary/NaySummary";
import FinancingCaseWorkflow from "@/components/organisms/FinancingCaseWorkflow/FinancingCaseWorkflow";
import { formatDateTime, formatDate, formatBRL, formatPercent, toNumber } from "@/lib/format";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  STATUS_TONE,
  PURPOSE_LABELS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_TONE,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_TONE,
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_TONE,
  SOURCE_LABELS,
  TRIGGER_EVENT_LABELS,
  PROVIDER_LABELS,
  label,
  financingStatusLabel,
  statusLabel,
  productLabel,
  providerShortLabel,
  triggerLabel,
  isFinalCase,
} from "../_labels";

const APPLICANT_ROLE_LABELS = { PRINCIPAL: "Proponente principal", CO_APPLICANT: "Co-proponente" };
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const digits = (text) => String(text ?? "").replace(/\D/g, "");
const SENDABLE_BLOCKED_STATUSES = ["DRAFT", "DOCUMENTS_PENDING"];

// Motivo legível quando o envio não foi (ou ainda não foi concluído): nunca mostra o código interno.
function submissionReasonText(sub) {
  const reason = String(sub?.failureReason || sub?.failure_reason || "");
  if (!reason) return sub?.status === "CANCELED" ? "Envio cancelado." : "";
  if (reason === "CASO_CANCELADO") return "O caso foi cancelado antes do envio.";
  if (reason === "CASO_CANCELADO_PELO_PROVIDER") return "O provider informou que o caso foi encerrado do lado dele.";
  if (reason === "SUBSTITUIDA_POR_NOVO_ENVIO") return "Substituído por um novo envio, depois de consultar o provider.";
  if (reason === "PROVEDOR_INDISPONIVEL") return "O provider não está disponível neste ambiente.";
  if (reason === "ENVIO_EM_ANDAMENTO") return "Envio em andamento: se travar, use \"Consultar o provider\" antes de reenviar.";
  if (reason === "FINALIZACAO_LOCAL_PENDENTE" || reason === "FINALIZACAO_LOCAL_FALHOU") return "O provider aceitou o caso; o registro local está sendo concluído.";
  if (reason.startsWith("NAO_PODE_ENVIAR:")) return reason.replace("NAO_PODE_ENVIAR:", "").trim();
  return sub?.status === "UNKNOWN" ? "Não foi possível confirmar se o provider recebeu o caso." : "";
}

function submissionStatusLabel(sub) {
  const raw = sub?.responseSnapshot || sub?.response_snapshot;
  if (raw?.status === "PENDING_MANUAL_ACTION") return "Aguardando ação manual";
  return label(SUBMISSION_STATUS_LABELS, sub?.status, "Status não identificado");
}

function LoadError({ message, onRetry }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Alert tone="danger">{message}</Alert>
      <div><Button variant="secondary" size="sm" onClick={onRetry}>Tentar de novo</Button></div>
    </div>
  );
}

const cell = { padding: "8px 12px" };
const headRow = { textAlign: "left", borderBottom: "1px solid var(--color-border)" };
const bodyRow = { borderBottom: "1px solid var(--color-border)" };

// Mesmos campos críticos do servidor (caseDocuments.service): o servidor é quem barra; aqui só se oferece o preenchimento.
const CRITICAL_FIELDS_BY_DOCUMENT_TYPE = { RG_CPF: ["taxId", "name"], COMPROVANTE_RENDA: ["income"], EXTRATO_BANCARIO: ["accountNumber"] };
const CRITICAL_FIELD_LABELS = { taxId: "CPF/CNPJ", name: "Nome", income: "Renda", accountNumber: "Conta" };

export default function FinancingCaseDetailPage() {
  const { id } = useParams();
  const [financingCase, setFinancingCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [perms, setPerms] = useState({ create: false, settle: false, fiscal: false });
  const [params, setParams] = useState(null);
  const [paramsError, setParamsError] = useState("");

  // Polling com limpeza: um timer por chave, todos cancelados ao sair da tela.
  const timers = useRef({});
  const alive = useRef(true);
  const stopPolling = useCallback((key) => {
    if (timers.current[key]) {
      clearInterval(timers.current[key]);
      delete timers.current[key];
    }
  }, []);
  const startPolling = useCallback((key, fn, times, ms = 3000) => {
    stopPolling(key);
    let ticks = 0;
    timers.current[key] = setInterval(() => {
      if (!alive.current) return;
      ticks += 1;
      fn();
      if (ticks >= times) stopPolling(key);
    }, ms);
  }, [stopPolling]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      Object.keys(timers.current).forEach((key) => clearInterval(timers.current[key]));
      timers.current = {};
    };
  }, []);

  const [requirements, setRequirements] = useState([]);
  const [requirementsLoading, setRequirementsLoading] = useState(true);
  const [requirementsError, setRequirementsError] = useState("");
  const [newRequirementType, setNewRequirementType] = useState("RG_CPF");
  const [addingRequirement, setAddingRequirement] = useState(false);
  const [documentsError, setDocumentsError] = useState("");
  const [documentsNotice, setDocumentsNotice] = useState("");
  const [uploadingRequirementId, setUploadingRequirementId] = useState(null);
  const [validatingRequirementId, setValidatingRequirementId] = useState(null);
  const [rejectingRequirementId, setRejectingRequirementId] = useState(null);
  const [rejectSavingId, setRejectSavingId] = useState(null);
  const [dispensingRequirementId, setDispensingRequirementId] = useState(null);
  const [dispenseSavingId, setDispenseSavingId] = useState(null);
  const [dispenseReason, setDispenseReason] = useState("");
  const [documentExpiry, setDocumentExpiry] = useState({});
  const [rejectReason, setRejectReason] = useState("");
  // Campos críticos que a leitura não achou: quem valida informa conferindo o arquivo original.
  const [manualRequirementId, setManualRequirementId] = useState(null);
  const [manualFields, setManualFields] = useState({});
  const [versionsOf, setVersionsOf] = useState({});
  const [sendingDocuments, setSendingDocuments] = useState(false);
  const [submitConsent, setSubmitConsent] = useState(false);
  const [consentEvidence, setConsentEvidence] = useState("");
  const [submitAmount, setSubmitAmount] = useState("");

  const [simulations, setSimulations] = useState([]);
  const [simulationsLoading, setSimulationsLoading] = useState(true);
  const [simulationsError, setSimulationsError] = useState("");
  const [simAmount, setSimAmount] = useState("");
  const [simTermMonths, setSimTermMonths] = useState("360");
  const [simPayment, setSimPayment] = useState("");
  const [simRate, setSimRate] = useState("");
  const [creatingSimulation, setCreatingSimulation] = useState(false);
  const [simulationFormError, setSimulationFormError] = useState("");

  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionsError, setSubmissionsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [unknownVerification, setUnknownVerification] = useState("");
  const [submitInfo, setSubmitInfo] = useState("");

  const [statusHistory, setStatusHistory] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");

  const [appraisals, setAppraisals] = useState([]);
  const [appraisalsLoading, setAppraisalsLoading] = useState(true);
  const [appraisalsError, setAppraisalsError] = useState("");
  const [requestingAppraisal, setRequestingAppraisal] = useState(false);
  const [appraisalReference, setAppraisalReference] = useState("");
  const [appraisalFormError, setAppraisalFormError] = useState("");

  const [commissions, setCommissions] = useState([]);
  const [commissionsLoading, setCommissionsLoading] = useState(true);
  const [commissionsError, setCommissionsError] = useState("");
  const [commissionBaseAmount, setCommissionBaseAmount] = useState("");
  const [commissionTrigger, setCommissionTrigger] = useState("");
  // Aparece quando o servidor recusa a base por diferir da proposta vigente além da tolerância dos Parâmetros.
  const [commissionNeedsJustification, setCommissionNeedsJustification] = useState(false);
  const [commissionBaseJustification, setCommissionBaseJustification] = useState("");
  const [triggerOptions, setTriggerOptions] = useState([]);
  const [creatingCommission, setCreatingCommission] = useState(false);
  const [commissionFormError, setCommissionFormError] = useState("");
  const [commissionNotice, setCommissionNotice] = useState("");
  const [commissionWarning, setCommissionWarning] = useState("");
  const [confirmingCommissionId, setConfirmingCommissionId] = useState(null);
  const [chargebackCommissionId, setChargebackCommissionId] = useState(null);
  const [invoicingCommissionId, setInvoicingCommissionId] = useState(null);
  const [invoicedIds, setInvoicedIds] = useState({});
  const [receivingCommissionId, setReceivingCommissionId] = useState(null);
  const [reversalCompletingId, setReversalCompletingId] = useState(null);
  const [confirmTargetId, setConfirmTargetId] = useState(null);
  const [confirmExternalId, setConfirmExternalId] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [chargebackTargetId, setChargebackTargetId] = useState(null);
  const [chargebackReason, setChargebackReason] = useState("");
  const [chargebackError, setChargebackError] = useState("");
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [receiveError, setReceiveError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState({});
  const [adjustmentsOf, setAdjustmentsOf] = useState({});

  function loadCommissions() {
    setCommissionsLoading(true);
    setCommissionsError("");
    listCommissionEntitlements(id)
      .then(setCommissions)
      .catch((err) => setCommissionsError(err?.message || "Não foi possível carregar as comissões deste caso."))
      .finally(() => setCommissionsLoading(false));
  }

  // silent: atualização em segundo plano (polling) não troca a tabela por "Carregando…".
  function loadAppraisals(silent = false) {
    if (!silent) setAppraisalsLoading(true);
    setAppraisalsError("");
    listAppraisals(id)
      .then(setAppraisals)
      .catch((err) => setAppraisalsError(err?.message || "Não foi possível carregar as avaliações deste caso."))
      .finally(() => { if (!silent) setAppraisalsLoading(false); });
  }

  function loadSubmissions(silent = false) {
    if (!silent) setSubmissionsLoading(true);
    setSubmissionsError("");
    listSubmissions(id)
      .then(setSubmissions)
      .catch((err) => setSubmissionsError(err?.message || "Não foi possível carregar o histórico de envios."))
      .finally(() => { if (!silent) setSubmissionsLoading(false); });
  }

  function loadStatus(silent = false) {
    if (!silent) setStatusLoading(true);
    setStatusError("");
    getFinancingCaseStatus(id)
      .then((data) => setStatusHistory(data.history || []))
      .catch((err) => setStatusError(err?.message || "Não foi possível carregar o histórico de status."))
      .finally(() => { if (!silent) setStatusLoading(false); });
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

  function loadParams() {
    setParamsError("");
    getCorrespondentParameters()
      .then((p) => {
        setParams(p);
        const allowed = p?.commission?.action?.allowedTriggerEvents || [];
        setTriggerOptions(allowed);
        setCommissionTrigger((current) => (allowed.includes(current) ? current : (p?.commission?.action?.defaultTriggerEvent || allowed[0] || "")));
      })
      .catch((err) => setParamsError(err?.message || "Não foi possível carregar os parâmetros do correspondente."));
  }

  function loadCase() {
    setLoading(true);
    setLoadError("");
    getFinancingCase(id)
      .then(setFinancingCase)
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar o caso de financiamento."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPerms({
      create: hasPermission("correspondent:create"),
      settle: hasPermission("finance:settle"),
      fiscal: hasPermission("correspondent:fiscal"),
    });
    loadCase();
    loadRequirements();
    loadSimulations();
    loadSubmissions();
    loadStatus();
    loadAppraisals();
    loadCommissions();
    loadParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function refreshCase() {
    getFinancingCase(id).then((data) => { if (alive.current) setFinancingCase(data); }).catch(() => {});
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
        <LoadError message={loadError || "Caso não encontrado."} onRetry={loadCase} />
      </AppShell>
    );
  }

  const providerCode = financingCase.providerCode || financingCase.provider_code;
  const isManual = providerCode === "manual";
  const caseStatus = financingCase.status;
  const caseFinal = isFinalCase(caseStatus);
  const canEditCase = perms.create && !caseFinal;
  const eligibilityAction = params?.eligibility?.action || {};
  const commissionAction = params?.commission?.action || {};
  const requireConsentEvidence = eligibilityAction.requireConsentEvidence === true;
  const providerCeiling = (eligibilityAction.maxAmountByProvider || {})[providerCode];
  const requiredDocumentTypes = eligibilityAction.requiredDocumentTypes || [];
  const blockedCommissionStatuses = commissionAction.blockedCaseStatuses || ["CANCELED", "REJECTED"];
  const commissionBlockedByStatus = blockedCommissionStatuses.includes(caseStatus);
  const confirmNeedsFinance = commissionAction.confirmRequiresFinancePermission !== false;
  const canConfirmCommission = perms.create && (!confirmNeedsFinance || perms.settle);

  const activeRequirementTypes = requirements.filter((r) => r.status !== "DISPENSED").map((r) => r.documentType);
  const missingRequiredTypes = requiredDocumentTypes.filter((t) => !activeRequirementTypes.includes(t));
  const duplicateRequirementType = requirements.some((r) => r.documentType === newRequirementType && !["DISPENSED", "VALIDATED"].includes(r.status) && r.status !== "EXPIRED");
  const pendingChecklist = requirements.filter((r) => !["VALIDATED", "DISPENSED"].includes(r.status));

  async function handleSubmitToProvider() {
    if (submitting) return;
    setSubmitError("");
    setSubmitInfo("");
    if (!submitConsent) {
      setSubmitError("Marque a autorização do cliente antes de enviar.");
      return;
    }
    if (requireConsentEvidence && consentEvidence.trim().length < 5) {
      setSubmitError("Informe como o cliente autorizou (mínimo 5 caracteres): os Parâmetros da empresa exigem esse registro.");
      return;
    }
    const amountTyped = String(submitAmount || "").trim() !== "";
    const amountNumber = amountTyped ? toNumber(submitAmount) : undefined;
    if (amountTyped && !(amountNumber > 0)) {
      setSubmitError("Informe o valor da operação com um número maior que zero.");
      return;
    }
    if (providerCeiling && !amountTyped) {
      setSubmitError(`Informe o valor da operação: este provider tem teto de ${formatBRL(providerCeiling)} e o sistema precisa conferir.`);
      return;
    }
    setSubmitting(true);
    try {
      await submitFinancingCase(id, { consent: true, consentEvidence: consentEvidence.trim() || undefined, amount: amountNumber });
      setSubmitConsent(false);
      setConsentEvidence("");
      loadSubmissions(true);
      loadStatus(true);
      refreshCase();
      startPolling("submission", () => { loadSubmissions(true); loadStatus(true); refreshCase(); }, 5);
    } catch (err) {
      setSubmitError(err?.message || (isManual ? "Não foi possível registrar o caso para ação manual." : "Não foi possível enviar o caso ao provider."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcknowledgeUnknown(submissionId) {
    if (acknowledgingId) return;
    setAcknowledgingId(submissionId);
    setSubmitError("");
    setSubmitInfo("");
    try {
      const result = await acknowledgeUnknownSubmission(id, submissionId, { verification: unknownVerification.trim() });
      setUnknownVerification("");
      if ((result?.data || result)?.recovered) {
        setSubmitInfo("A consulta mostrou que o provider já tinha recebido o caso. O envio foi recuperado e nada foi reenviado.");
      } else {
        setSubmitInfo("Consulta concluída. Se o provider não tinha recebido o caso, o envio foi liberado para uma nova tentativa.");
      }
      loadSubmissions(true);
      loadStatus(true);
      refreshCase();
    } catch (err) {
      setSubmitError(err?.message || "Não foi possível confirmar a consulta de status.");
    } finally {
      setAcknowledgingId(null);
    }
  }

  async function handleCreateSimulation() {
    if (creatingSimulation) return;
    setSimulationFormError("");
    const amount = toNumber(simAmount);
    const termMonths = Number(simTermMonths);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSimulationFormError("Informe o valor financiado, maior que zero.");
      return;
    }
    if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 480) {
      setSimulationFormError("Informe o prazo em meses, um número inteiro de 1 a 480.");
      return;
    }
    let paymentNumber;
    let rateNumber;
    if (isManual) {
      paymentNumber = toNumber(simPayment);
      if (!Number.isFinite(paymentNumber) || paymentNumber <= 0) {
        setSimulationFormError("Informe a parcela que o banco simulou: este provider não simula sozinho.");
        return;
      }
      if (paymentNumber > amount) {
        setSimulationFormError("A parcela não pode ser maior que o valor financiado.");
        return;
      }
      if (String(simRate || "").trim() !== "") {
        rateNumber = toNumber(simRate);
        if (!Number.isFinite(rateNumber) || rateNumber < 0 || rateNumber > 100) {
          setSimulationFormError("A taxa ao mês precisa ser um número de 0 a 100.");
          return;
        }
      }
    }
    setCreatingSimulation(true);
    try {
      await createSimulation(id, isManual ? { amount, termMonths, monthlyPayment: paymentNumber, monthlyRatePct: rateNumber } : { amount, termMonths });
      setSimAmount("");
      setSimPayment("");
      setSimRate("");
      loadSimulations();
    } catch (err) {
      setSimulationFormError(err?.message || "Não foi possível criar a simulação.");
    } finally {
      setCreatingSimulation(false);
    }
  }

  async function handleRequestAppraisal() {
    if (requestingAppraisal) return;
    setAppraisalFormError("");
    const typedText = String(appraisalReference || "").trim();
    const typed = typedText ? toNumber(typedText) : undefined;
    if (typedText && !(typed > 0)) {
      setAppraisalFormError("Informe um valor maior que zero ou deixe o campo vazio.");
      return;
    }
    if (isManual && !typed) {
      setAppraisalFormError("Informe o valor que o banco avaliou: este provider não avalia sozinho.");
      return;
    }
    setRequestingAppraisal(true);
    try {
      // Valor de referência é o do IMÓVEL (informado por quem pede), nunca o valor financiado.
      if (isManual) {
        // Provider manual: o valor digitado é o que o BANCO avaliou (registro humano, só informativo).
        await createAppraisal(id, { appraisedValue: typed });
      } else {
        await createAppraisal(id, typed ? { referenceValue: typed } : {});
      }
      setAppraisalReference("");
      loadAppraisals(true);
      startPolling("appraisal", () => loadAppraisals(true), 4);
    } catch (err) {
      setAppraisalFormError(err?.message || "Não foi possível solicitar a avaliação.");
    } finally {
      setRequestingAppraisal(false);
    }
  }

  function clearCommissionMessages() {
    setCommissionFormError("");
    setCommissionNotice("");
    setCommissionWarning("");
  }

  async function handleCreateCommission() {
    if (creatingCommission) return;
    clearCommissionMessages();
    const informado = String(commissionBaseAmount || "").trim() !== "";
    const baseAmount = informado ? toNumber(commissionBaseAmount) : undefined;
    if (informado && (!Number.isFinite(baseAmount) || baseAmount <= 0)) {
      setCommissionFormError("Informe um valor-base maior que zero ou deixe vazio para usar o valor aprovado da proposta vigente.");
      return;
    }
    if (!commissionTrigger) {
      setCommissionFormError("Escolha o fato gerador da comissão.");
      return;
    }
    setCreatingCommission(true);
    try {
      await createCommissionEntitlement(id, { baseAmount, triggerEvent: commissionTrigger, baseJustification: commissionNeedsJustification ? commissionBaseJustification.trim() : undefined });
      setCommissionBaseAmount("");
      setCommissionNeedsJustification(false);
      setCommissionBaseJustification("");
      setCommissionNotice("Direito à comissão registrado.");
      loadCommissions();
    } catch (err) {
      if (err?.code === "COMMISSION_BASE_DIVERGES_FROM_PROPOSAL") setCommissionNeedsJustification(true);
      setCommissionFormError(err?.message || "Não foi possível registrar o direito à comissão.");
    } finally {
      setCreatingCommission(false);
    }
  }

  async function handleConfirmCommission() {
    if (!confirmExternalId.trim() || !confirmTargetId || confirmingCommissionId) return;
    setConfirmingCommissionId(confirmTargetId);
    setConfirmError("");
    try {
      await confirmCommissionEntitlement(id, confirmTargetId, { externalConfirmationId: confirmExternalId.trim() });
      setConfirmTargetId(null);
      setConfirmExternalId("");
      clearCommissionMessages();
      setCommissionNotice("Comissão confirmada: o recebível foi criado no Financeiro.");
      loadCommissions();
    } catch (err) {
      setConfirmError(err?.message || "Não foi possível confirmar esta comissão.");
    } finally {
      setConfirmingCommissionId(null);
    }
  }

  async function handleReceiveCommission() {
    if (!receiveTarget || receivingCommissionId) return;
    setReceivingCommissionId(receiveTarget.id);
    setReceiveError("");
    try {
      await receiveCommissionEntitlement(id, receiveTarget.id);
      setReceiveTarget(null);
      clearCommissionMessages();
      setCommissionNotice("Recebimento registrado e lançamento liquidado no Financeiro.");
      loadCommissions();
    } catch (err) {
      setReceiveError(err?.message || "Não foi possível registrar o recebimento desta comissão.");
    } finally {
      setReceivingCommissionId(null);
    }
  }

  async function handleChargebackCommission() {
    if (!chargebackReason.trim() || !chargebackTargetId || chargebackCommissionId) return;
    setChargebackCommissionId(chargebackTargetId);
    setChargebackError("");
    try {
      const result = await chargebackCommissionEntitlement(id, chargebackTargetId, { reason: chargebackReason.trim() });
      setChargebackTargetId(null);
      setChargebackReason("");
      clearCommissionMessages();
      if ((result?.data || result)?.financialReversalPending) {
        // Sucesso parcial: a comissão foi estornada; o lançamento do Financeiro depende de um mês aberto.
        setCommissionWarning("Comissão estornada, mas o lançamento financeiro está num mês já fechado: o estorno dele ficou pendente (veja Erros de integração) e precisa ser concluído no período aberto.");
      } else {
        setCommissionNotice("Comissão estornada.");
      }
      loadCommissions();
    } catch (err) {
      setChargebackError(err?.message || "Não foi possível estornar esta comissão.");
    } finally {
      setChargebackCommissionId(null);
    }
  }

  async function handleCompleteReversal(entitlementId) {
    if (reversalCompletingId) return;
    setReversalCompletingId(entitlementId);
    clearCommissionMessages();
    try {
      await completeFinancialReversal(id, entitlementId);
      setCommissionNotice("Estorno financeiro concluído.");
      loadCommissions();
    } catch (err) {
      setCommissionFormError(err?.message || "Não foi possível concluir o estorno financeiro.");
    } finally {
      setReversalCompletingId(null);
    }
  }

  async function handleRequestInvoiceForCommission(entitlement) {
    if (invoicingCommissionId || invoicedIds[entitlement.id]) return;
    setInvoicingCommissionId(entitlement.id);
    clearCommissionMessages();
    try {
      await requestInvoice({
        sourceType: "COMMISSION_ENTITLEMENT",
        sourceId: entitlement.id,
        amount: entitlement.amount,
        description: `Comissão de correspondente bancário, provider ${providerShortLabel(entitlement.providerCode)}`,
      });
      setInvoicedIds((prev) => ({ ...prev, [entitlement.id]: true }));
      setCommissionNotice("NFS-e solicitada. Acompanhe a situação em Correspondente, Fiscal.");
    } catch (err) {
      setCommissionFormError(err?.message || "Não foi possível solicitar a NFS-e desta comissão.");
    } finally {
      setInvoicingCommissionId(null);
    }
  }

  async function toggleCommissionDetails(entitlement) {
    const opening = !detailsOpen[entitlement.id];
    setDetailsOpen((prev) => ({ ...prev, [entitlement.id]: opening }));
    if (opening && entitlement.status === "ADJUSTED" && !adjustmentsOf[entitlement.id]) {
      try {
        const rows = await listCommissionAdjustments(id, entitlement.id);
        setAdjustmentsOf((prev) => ({ ...prev, [entitlement.id]: { rows: rows || [] } }));
      } catch (err) {
        setAdjustmentsOf((prev) => ({ ...prev, [entitlement.id]: { error: err?.message || "Não foi possível carregar os ajustes desta comissão." } }));
      }
    }
  }

  async function handleAddRequirement(type = newRequirementType) {
    if (addingRequirement) return;
    setAddingRequirement(true);
    setDocumentsError("");
    setDocumentsNotice("");
    try {
      await createCaseRequirement(id, { documentType: type });
      loadRequirements();
      refreshCase();
    } catch (err) {
      setDocumentsError(err?.message || "Não foi possível adicionar o item ao checklist.");
    } finally {
      setAddingRequirement(false);
    }
  }

  async function handleAddMissingRequirements() {
    if (addingRequirement) return;
    setAddingRequirement(true);
    setDocumentsError("");
    try {
      for (const type of missingRequiredTypes) {
        // eslint-disable-next-line no-await-in-loop
        await createCaseRequirement(id, { documentType: type });
      }
      loadRequirements();
      refreshCase();
    } catch (err) {
      setDocumentsError(err?.message || "Não foi possível adicionar os documentos exigidos ao checklist.");
      loadRequirements();
    } finally {
      setAddingRequirement(false);
    }
  }

  async function handleUploadDocument(requirementId, file) {
    if (!file || uploadingRequirementId) return;
    setDocumentsError("");
    setDocumentsNotice("");
    const expiry = documentExpiry[requirementId];
    if (expiry && expiry < todayIso()) {
      setDocumentsError("A validade informada já passou: o documento nasceria vencido. Corrija a data ou deixe o campo vazio.");
      return;
    }
    setUploadingRequirementId(requirementId);
    let uploaded = null;
    try {
      uploaded = await uploadFile(file);
      await uploadCaseDocument(id, { requirementId, fileId: uploaded.id, expiresAt: expiry || undefined });
      setDocumentExpiry((prev) => ({ ...prev, [requirementId]: "" }));
      setDocumentsNotice("Documento enviado. Falta a validação de uma pessoa.");
      loadRequirements();
      refreshCase();
    } catch (err) {
      const base = err?.message || "Não foi possível enviar o documento.";
      setDocumentsError(uploaded ? `${base} O arquivo chegou ao servidor, mas não ficou vinculado ao item; envie de novo.` : base);
    } finally {
      setUploadingRequirementId(null);
    }
  }

  async function handleValidateRequirement(requirementId, withManualFields) {
    if (validatingRequirementId) return;
    setValidatingRequirementId(requirementId);
    setDocumentsError("");
    setDocumentsNotice("");
    try {
      await validateCaseRequirement(id, requirementId, withManualFields);
      setManualRequirementId(null);
      setManualFields({});
      loadRequirements();
      refreshCase();
    } catch (err) {
      if (err?.code === "CASE_REQUIREMENT_CRITICAL_FIELDS_MISSING" || err?.code === "CASE_REQUIREMENT_MANUAL_FIELD_INVALID") {
        setManualRequirementId(requirementId);
        if (!withManualFields) setManualFields({});
      }
      setDocumentsError(err?.message || "Não foi possível validar este documento.");
    } finally {
      setValidatingRequirementId(null);
    }
  }

  async function handleRejectRequirement(requirementId) {
    if (rejectSavingId) return;
    setDocumentsError("");
    if (rejectReason.trim().length < 3) {
      setDocumentsError("Informe o motivo da recusa do documento (mínimo 3 caracteres).");
      return;
    }
    setRejectSavingId(requirementId);
    try {
      await rejectCaseRequirement(id, requirementId, rejectReason.trim());
      setRejectingRequirementId(null);
      setRejectReason("");
      loadRequirements();
      refreshCase();
    } catch (err) {
      setDocumentsError(err?.message || "Não foi possível recusar este documento.");
    } finally {
      setRejectSavingId(null);
    }
  }

  async function handleDispenseRequirement(requirementId) {
    if (dispenseSavingId) return;
    setDocumentsError("");
    if (dispenseReason.trim().length < 3) {
      setDocumentsError("Informe por que este item será dispensado (mínimo 3 caracteres).");
      return;
    }
    setDispenseSavingId(requirementId);
    try {
      await dispenseCaseRequirement(id, requirementId, dispenseReason.trim());
      setDispensingRequirementId(null);
      setDispenseReason("");
      loadRequirements();
      refreshCase();
    } catch (err) {
      setDocumentsError(err?.message || "Não foi possível dispensar este item.");
    } finally {
      setDispenseSavingId(null);
    }
  }

  async function toggleVersions(requirementId) {
    if (versionsOf[requirementId]) {
      setVersionsOf((prev) => { const next = { ...prev }; delete next[requirementId]; return next; });
      return;
    }
    setVersionsOf((prev) => ({ ...prev, [requirementId]: { loading: true } }));
    try {
      const rows = await listRequirementDocuments(id, requirementId);
      setVersionsOf((prev) => ({ ...prev, [requirementId]: { rows: rows || [] } }));
    } catch (err) {
      setVersionsOf((prev) => ({ ...prev, [requirementId]: { error: err?.message || "Não foi possível carregar as versões deste documento." } }));
    }
  }

  async function handleSendDocuments() {
    if (sendingDocuments) return;
    setSendingDocuments(true);
    setSubmitError("");
    setSubmitInfo("");
    try {
      const result = await sendDocumentsToProvider(id);
      const data = result?.data || result;
      const sent = data?.sentCount ?? (Array.isArray(data?.sent) ? data.sent.length : 0);
      setSubmitInfo(sent === 0 ? "Nenhum documento novo para enviar agora: o provider já tem tudo o que foi validado, ou o envio está em andamento." : `${sent} documento(s) enviado(s) ao provider.`);
      loadRequirements();
    } catch (err) {
      setSubmitError(err?.message || "Não foi possível enviar os documentos ao provider.");
    } finally {
      setSendingDocuments(false);
    }
  }

  const latestSubmission = submissions[0];
  const isUnknown = latestSubmission && latestSubmission.status === "UNKNOWN";
  const sendBlockedByChecklist = SENDABLE_BLOCKED_STATUSES.includes(caseStatus);
  const amountRequired = Boolean(providerCeiling);
  const sendDisabledReason = !perms.create
    ? "Seu perfil não tem permissão para enviar casos."
    : caseFinal
      ? "Este caso está encerrado e não aceita novos envios."
      : isUnknown
        ? "Há um envio com resultado incerto: consulte o provider antes de enviar de novo."
        : sendBlockedByChecklist
          ? `O caso está em "${statusLabel(caseStatus)}": conclua e valide o checklist de documentos antes de enviar${pendingChecklist.length ? ` (${pendingChecklist.length} item(ns) ainda sem validação)` : ""}.`
          : "";

  const maisRecente = [...simulations].sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))[0];
  // Só compara parcela entre simulações do mesmo valor E do mesmo prazo (parcela menor com prazo maior não é melhor oferta).
  const comparaveis = maisRecente
    ? simulations.filter((s) => Number(s.amount) === Number(maisRecente.amount) && Number(s.termMonths) === Number(maisRecente.termMonths))
    : [];
  const lowestId = comparaveis.length > 1
    ? comparaveis.reduce((best, s) => (!best || Number(s.monthlyPayment) < Number(best.monthlyPayment) ? s : best), null)?.id
    : null;

  return (
    <AppShell title="Caso de financiamento" backHref="/painel/correspondente">
      <Card
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            Status: <Badge tone={STATUS_TONE[caseStatus] || "neutral"}>{financingStatusLabel(financingCase)}</Badge>
            {(financingCase.possibleDuplicateOfCaseId || financingCase.possible_duplicate_of_case_id) && caseStatus !== "CANCELED" ? (
              <Badge tone="warning">Possível duplicata</Badge>
            ) : null}
          </span>
        }
        subtitle={`Criado em ${formatDateTime(financingCase.created_at || financingCase.createdAt)}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {caseFinal ? (
            <Alert tone="info" title={caseStatus === "CANCELED" ? "Caso cancelado" : "Caso concluído"}>
              Este caso está encerrado: documentos, simulações, avaliações e envios ficam somente para consulta. As comissões continuam disponíveis abaixo.
            </Alert>
          ) : null}
          {!perms.create ? (
            <Alert tone="warning" title="Somente consulta">Seu perfil pode ver este caso, mas não tem permissão para alterá-lo.</Alert>
          ) : null}
          {paramsError ? (
            <Alert tone="warning" title="Parâmetros não carregaram">
              {paramsError} Algumas validações da tela (consentimento, teto do provider, fatos geradores) podem não aparecer.{" "}
              <Button variant="secondary" size="sm" onClick={loadParams}>Tentar de novo</Button>
            </Alert>
          ) : null}
          <div>
            <strong>Provider</strong>
            <p>{label(PROVIDER_LABELS, providerCode, "Padrão da empresa")}</p>
          </div>

          <div>
            <strong>Produto</strong>
            <p>{productLabel(financingCase.product)}</p>
          </div>

          <div>
            <strong>Finalidade</strong>
            <p>{label(PURPOSE_LABELS, financingCase.purpose, "Residencial")}</p>
          </div>

          <div>
            <strong>Imóvel</strong>
            <p>{financingCase.property ? ([financingCase.property.internalCode, financingCase.property.title || financingCase.property.name].filter(Boolean).join(" · ") || "Imóvel sem título") : "Nenhum imóvel vinculado ainda."}</p>
          </div>

          <div>
            <strong>Proponentes</strong>
            {(financingCase.applicants || []).length === 0 ? (
              <p>Nenhum proponente.</p>
            ) : (
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {financingCase.applicants.map((applicant) => (
                  <li key={applicant.id}>
                    {applicant.person?.legalName || "Sem pessoa vinculada"} · {label(APPLICANT_ROLE_LABELS, applicant.role, "Papel não informado")}
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
          {documentsError ? <Alert tone="danger">{documentsError}</Alert> : null}
          {documentsNotice ? <Alert tone="success">{documentsNotice}</Alert> : null}
          {canEditCase && missingRequiredTypes.length > 0 ? (
            <Alert tone="warning" title="Documentos exigidos pela empresa ainda fora do checklist">
              {missingRequiredTypes.map((t) => label(DOCUMENT_TYPE_LABELS, t)).join(", ")}. O envio ao provider só é liberado com estes documentos validados.{" "}
              <Button variant="secondary" size="sm" onClick={handleAddMissingRequirements} loading={addingRequirement}>Adicionar ao checklist</Button>
            </Alert>
          ) : null}
          {canEditCase ? (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <FormField label="Novo item do checklist" htmlFor="new-requirement-type" helper={duplicateRequirementType ? "Já existe um item pendente deste tipo. Valide, recuse ou dispense o atual antes de criar outro." : undefined}>
                <Select id="new-requirement-type" value={newRequirementType} onChange={(e) => setNewRequirementType(e.target.value)}>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, text]) => (
                    <option key={value} value={value}>{text}</option>
                  ))}
                </Select>
              </FormField>
              <Button variant="secondary" onClick={() => handleAddRequirement()} loading={addingRequirement} disabled={duplicateRequirementType}>
                Adicionar ao checklist
              </Button>
            </div>
          ) : null}

          {requirementsLoading ? (
            <p>Carregando checklist…</p>
          ) : requirementsError ? (
            <LoadError message={requirementsError} onRetry={loadRequirements} />
          ) : requirements.length === 0 ? (
            <p>Nenhum documento exigido cadastrado ainda para este caso.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {requirements.map((req) => {
                const currentDocument = (req.documents || []).find((d) => !d.supersededAt && !d.superseded_at);
                const open = ["PENDING", "SUBMITTED", "REJECTED", "EXPIRED", "VALIDATED"].includes(req.status);
                const versions = versionsOf[req.id];
                return (
                  <div key={req.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong>{label(DOCUMENT_TYPE_LABELS, req.documentType, "Documento")}{requiredDocumentTypes.includes(req.documentType) ? " (exigido pela empresa)" : ""}</strong>
                      <Badge tone={DOCUMENT_STATUS_TONE[req.status] || "neutral"}>{label(DOCUMENT_STATUS_LABELS, req.status, "Situação não identificada")}</Badge>
                    </div>
                    {currentDocument ? (
                      <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-ink-soft)" }}>
                        {currentDocument.file?.fileName ? `Arquivo atual: ${currentDocument.file.fileName} (versão ${currentDocument.version})` : `Documento enviado (versão ${currentDocument.version}). Você não tem permissão para ver o nome do arquivo.`}
                        {currentDocument.expiresAt || currentDocument.expires_at ? ` · vale até ${formatDate(currentDocument.expiresAt || currentDocument.expires_at)}` : " · sem data de validade"}
                      </p>
                    ) : null}
                    {req.notes && ["REJECTED", "EXPIRED", "DISPENSED"].includes(req.status) ? (
                      <p style={{ marginTop: 8, fontSize: 13 }}>{req.notes}</p>
                    ) : null}
                    {currentDocument?.suggestedNote ? (
                      <p style={{ marginTop: 8, fontSize: 13 }}>{currentDocument.suggestedNote}</p>
                    ) : null}
                    {canEditCase && req.status !== "DISPENSED" ? (
                      <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <FormField
                          label="Validade do documento (opcional)"
                          htmlFor={`requirement-expiry-${req.id}`}
                          helper="Se informada, o item reabre sozinho quando o documento vencer. Sem data, vale o prazo definido em Parâmetros."
                          error={documentExpiry[req.id] && documentExpiry[req.id] < todayIso() ? "A data já passou: o documento nasceria vencido." : undefined}
                        >
                          <Input
                            id={`requirement-expiry-${req.id}`}
                            type="date"
                            min={todayIso()}
                            value={documentExpiry[req.id] || ""}
                            onChange={(e) => setDocumentExpiry((prev) => ({ ...prev, [req.id]: e.target.value }))}
                          />
                        </FormField>
                        <FileDropInput
                          id={`requirement-upload-${req.id}`}
                          accept="image/*,application/pdf"
                          uploading={uploadingRequirementId === req.id}
                          fileNames={[]}
                          onFiles={(files) => files[0] && handleUploadDocument(req.id, files[0])}
                          helper={currentDocument ? "Enviar um novo arquivo substitui a versão vigente (a anterior fica preservada no histórico). PDF ou imagem." : "Nenhum arquivo enviado ainda. PDF ou imagem."}
                        />
                        {req.status === "SUBMITTED" ? (
                          <Button variant="secondary" onClick={() => handleValidateRequirement(req.id, manualRequirementId === req.id ? manualFields : undefined)} loading={validatingRequirementId === req.id} disabled={Boolean(validatingRequirementId)}>
                            Validar documento
                          </Button>
                        ) : null}
                        {req.status === "SUBMITTED" || req.status === "VALIDATED" ? (
                          <Button variant="secondary" onClick={() => { setRejectingRequirementId(rejectingRequirementId === req.id ? null : req.id); setDispensingRequirementId(null); setRejectReason(""); setDocumentsError(""); }}>
                            Recusar documento
                          </Button>
                        ) : null}
                        {open && req.status !== "VALIDATED" && req.status !== "SUBMITTED" ? (
                          <Button variant="secondary" onClick={() => { setDispensingRequirementId(dispensingRequirementId === req.id ? null : req.id); setRejectingRequirementId(null); setDispenseReason(""); setDocumentsError(""); }}>
                            Dispensar item
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    {manualRequirementId === req.id && req.status === "SUBMITTED" ? (
                      <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        {(CRITICAL_FIELDS_BY_DOCUMENT_TYPE[req.documentType] || []).map((field) => (
                          <Input
                            key={field}
                            id={`manual-${field}-${req.id}`}
                            value={manualFields[field] || ""}
                            maxLength={120}
                            onChange={(e) => { setDocumentsError(""); setManualFields((prev) => ({ ...prev, [field]: e.target.value })); }}
                            placeholder={`${CRITICAL_FIELD_LABELS[field]} (conferido no arquivo original)`}
                            aria-label={`${CRITICAL_FIELD_LABELS[field]} informado por quem valida`}
                          />
                        ))}
                        <span style={{ fontSize: 13 }}>Preencha só o que a leitura não achou e clique em Validar documento de novo.</span>
                      </div>
                    ) : null}
                    {rejectingRequirementId === req.id ? (
                      <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <Input
                          id={`reject-reason-${req.id}`}
                          value={rejectReason}
                          maxLength={300}
                          onChange={(e) => setRejectReason(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleRejectRequirement(req.id); } }}
                          placeholder="Motivo da recusa (obrigatório)"
                          aria-label="Motivo da recusa do documento"
                        />
                        <Button onClick={() => handleRejectRequirement(req.id)} loading={rejectSavingId === req.id} disabled={Boolean(rejectSavingId) || rejectReason.trim().length < 3}>Confirmar recusa</Button>
                      </div>
                    ) : null}
                    {dispensingRequirementId === req.id ? (
                      <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <Input
                          id={`dispense-reason-${req.id}`}
                          value={dispenseReason}
                          maxLength={300}
                          onChange={(e) => setDispenseReason(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleDispenseRequirement(req.id); } }}
                          placeholder="Por que este item não é necessário (obrigatório)"
                          aria-label="Motivo da dispensa do item"
                        />
                        <Button onClick={() => handleDispenseRequirement(req.id)} loading={dispenseSavingId === req.id} disabled={Boolean(dispenseSavingId) || dispenseReason.trim().length < 3}>Confirmar dispensa</Button>
                      </div>
                    ) : null}
                    {currentDocument ? (
                      <div style={{ marginTop: 8 }}>
                        <Button variant="secondary" size="sm" onClick={() => toggleVersions(req.id)}>{versions ? "Ocultar versões" : "Ver versões anteriores"}</Button>
                        {versions?.loading ? <p style={{ fontSize: 13 }}>Carregando versões…</p> : null}
                        {versions?.error ? <Alert tone="warning">{versions.error}</Alert> : null}
                        {versions?.rows ? (
                          versions.rows.length === 0 ? <p style={{ fontSize: 13 }}>Nenhuma versão registrada.</p> : (
                            <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 13 }}>
                              {versions.rows.map((doc) => (
                                <li key={doc.id}>
                                  Versão {doc.version} · enviada em {formatDateTime(doc.createdAt || doc.created_at)}
                                  {doc.supersededAt || doc.superseded_at ? ` · substituída em ${formatDateTime(doc.supersededAt || doc.superseded_at)}` : " · vigente"}
                                  {doc.file?.fileName ? ` · ${doc.file.fileName}` : ""}
                                  {doc.validatedAt || doc.validated_at ? ` · validada em ${formatDateTime(doc.validatedAt || doc.validated_at)}` : " · sem validação"}
                                </li>
                              ))}
                            </ul>
                          )
                        ) : null}
                      </div>
                    ) : null}
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
          {canEditCase ? (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <FormField label="Valor financiado (R$)" htmlFor="sim-amount">
                <DecimalInput id="sim-amount" maxDecimals={2} value={simAmount} onChange={(e) => setSimAmount(e.target.value)} placeholder="0,00" />
              </FormField>
              <FormField label="Prazo (meses)" htmlFor="sim-term" helper="De 1 a 480 meses.">
                <Input id="sim-term" inputMode="numeric" list="sim-term-options" value={simTermMonths} onChange={(e) => setSimTermMonths(digits(e.target.value))} />
                <datalist id="sim-term-options">
                  {[60, 120, 180, 240, 300, 360, 420, 480].map((months) => <option key={months} value={months}>{months} meses</option>)}
                </datalist>
              </FormField>
              {isManual ? (
                <>
                  <FormField label="Parcela informada pelo banco (R$)" htmlFor="sim-payment">
                    <DecimalInput id="sim-payment" maxDecimals={2} value={simPayment} onChange={(e) => setSimPayment(e.target.value)} placeholder="0,00" />
                  </FormField>
                  <FormField label="Taxa ao mês informada pelo banco (%)" htmlFor="sim-rate" helper="Opcional. Vazio aparece como taxa não informada.">
                    <DecimalInput id="sim-rate" maxDecimals={4} value={simRate} onChange={(e) => setSimRate(e.target.value)} placeholder="0,00" />
                  </FormField>
                </>
              ) : null}
              <Button onClick={handleCreateSimulation} loading={creatingSimulation}>
                {isManual ? "Registrar simulação do banco" : "Nova simulação"}
              </Button>
            </div>
          ) : null}
          {simulationFormError ? <Alert tone="danger">{simulationFormError}</Alert> : null}

          {simulationsLoading ? (
            <p>Carregando simulações…</p>
          ) : simulationsError ? (
            <LoadError message={simulationsError} onRetry={loadSimulations} />
          ) : simulations.length === 0 ? (
            <p>Nenhuma simulação feita ainda para este caso.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              {simulations.length > 1 ? (
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                  A marca de menor parcela só compara simulações do mesmo valor e do mesmo prazo. Não é promessa de aprovação, taxa ou prazo.
                </p>
              ) : null}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={headRow}>
                    <th style={cell}>Data</th>
                    <th style={cell}>Provider</th>
                    <th style={cell}>Valor financiado</th>
                    <th style={cell}>Prazo</th>
                    <th style={cell}>Taxa (a.m.)</th>
                    <th style={cell}>Parcela estimada</th>
                    <th style={cell}>Comparação</th>
                  </tr>
                </thead>
                <tbody>
                  {simulations.map((sim) => {
                    const manualSim = sim.providerCode === "manual";
                    const rateText = sim.rate === null || sim.rate === undefined || (manualSim && Number(sim.rate) === 0)
                      ? "Taxa não informada"
                      : formatPercent(Number(sim.rate) * 100);
                    return (
                      <tr key={sim.id} style={bodyRow}>
                        <td style={cell}>{formatDateTime(sim.created_at || sim.createdAt)}</td>
                        <td style={cell}>{providerShortLabel(sim.providerCode)}</td>
                        <td style={cell}>{formatBRL(sim.amount)}</td>
                        <td style={cell}>{sim.termMonths} meses</td>
                        <td style={cell}>{rateText}</td>
                        <td style={cell}>{formatBRL(sim.monthlyPayment)}</td>
                        <td style={cell}>{sim.id === lowestId ? <Badge tone="success">Menor parcela, mesmo prazo</Badge> : "Sem comparação"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
      <Card
        title={isManual ? "Ação manual no banco" : "Envio ao provider"}
        subtitle={isManual
          ? "Este provider não envia a proposta sozinho. Registrar aqui só guarda o pedido para alguém levar ao banco. Registrar de novo com os mesmos dados não cria um segundo pedido."
          : "Envia o caso para o banco/financeira configurado. Enviar de novo com os mesmos dados nunca cria um segundo envio — o sistema reconhece quando já existe uma tentativa igual."}
        style={{ marginTop: 16 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {perms.create && !caseFinal ? (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={submitConsent}
                  onChange={(e) => setSubmitConsent(e.target.checked)}
                />
                {isManual ? "O cliente autorizou registrar esta proposta para ação manual" : "O cliente autorizou o envio desta proposta"}
              </label>
              <FormField
                label={amountRequired ? `Valor da operação (R$), obrigatório` : "Valor da operação (R$), se houver teto"}
                htmlFor="submit-amount"
                helper={amountRequired ? `Este provider tem teto de ${formatBRL(providerCeiling)}.` : "Só é cobrado quando o provider tem teto de valor."}
              >
                <DecimalInput id="submit-amount" maxDecimals={2} value={submitAmount} onChange={(e) => setSubmitAmount(e.target.value)} placeholder="0,00" />
              </FormField>
              <FormField
                label={requireConsentEvidence ? "Como o cliente autorizou (obrigatório)" : "Como o cliente autorizou (opcional)"}
                htmlFor="consent-evidence"
                helper={requireConsentEvidence ? "Os Parâmetros da empresa exigem este registro (mínimo 5 caracteres)." : "Assinatura, WhatsApp, e-mail..."}
              >
                <Input id="consent-evidence" maxLength={300} value={consentEvidence} onChange={(e) => setConsentEvidence(e.target.value)} />
              </FormField>
              <Button onClick={handleSubmitToProvider} loading={submitting} disabled={Boolean(sendDisabledReason) || !submitConsent}>
                {isManual ? "Registrar ação manual" : "Enviar ao provider"}
              </Button>
              {latestSubmission && latestSubmission.status === "SUBMITTED" && !isManual ? (
                <Button variant="secondary" onClick={handleSendDocuments} loading={sendingDocuments}>
                  Enviar documentos validados ao provider
                </Button>
              ) : null}
              {isUnknown ? (
                <FormField label="O que você conferiu com o banco" htmlFor="unknown-verification" helper="Obrigatório se o provider não tem consulta automática.">
                  <Input id="unknown-verification" maxLength={300} value={unknownVerification} onChange={(e) => setUnknownVerification(e.target.value)} />
                </FormField>
              ) : null}
              {isUnknown ? (
                <Button variant="secondary" onClick={() => handleAcknowledgeUnknown(latestSubmission.id)} loading={acknowledgingId === latestSubmission.id} disabled={Boolean(acknowledgingId)}>
                  Consultar o provider e liberar novo envio
                </Button>
              ) : null}
            </div>
          ) : null}
          {perms.create && sendDisabledReason ? <p style={{ margin: 0, fontSize: 13 }}>{sendDisabledReason}</p> : null}
          {submitError ? <Alert tone="danger">{submitError}</Alert> : null}
          {submitInfo ? <Alert tone="success">{submitInfo}</Alert> : null}
          {submissions[0]?.status === "UNKNOWN" ? (
            <Alert tone="warning" title="Status indeterminado no último envio">
              Não foi possível confirmar se o provider recebeu este caso (tempo esgotado ou erro de comunicação). Para
              sua segurança, o sistema não reenvia automaticamente — consulte o provider acima antes de tentar um novo
              envio, assim não corremos o risco de duplicar a proposta no banco.
            </Alert>
          ) : null}

          {submissionsLoading ? (
            <p>Carregando histórico de envios…</p>
          ) : submissionsError ? (
            <LoadError message={submissionsError} onRetry={() => loadSubmissions()} />
          ) : submissions.length === 0 ? (
            <p>Nenhum envio realizado ainda para este caso.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={headRow}>
                    <th style={cell}>Data</th>
                    <th style={cell}>Provider</th>
                    <th style={cell}>Status</th>
                    <th style={cell}>Identificador no provider</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id} style={bodyRow}>
                      <td style={cell}>{formatDateTime(sub.created_at || sub.createdAt)}</td>
                      <td style={cell}>{providerShortLabel(sub.providerCode)}</td>
                      <td style={cell}>
                        <Badge tone={SUBMISSION_STATUS_TONE[sub.status] || "neutral"}>{submissionStatusLabel(sub)}</Badge>
                        {submissionReasonText(sub) ? <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-muted, #6b6258)" }}>{submissionReasonText(sub)}</div> : null}
                      </td>
                      <td style={cell}>{sub.providerCode === "manual" ? "Conduzido manualmente com o banco" : sub.externalCaseId || "Sem identificador no provider"}</td>
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
            ) : statusError ? (
              <LoadError message={statusError} onRetry={() => loadStatus()} />
            ) : statusHistory.length === 0 ? (
              <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-ink-soft)" }}>Nenhuma atualização de status recebida ainda.</p>
            ) : (
              <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                {statusHistory.map((entry) => {
                  const raw = entry.rawProviderStatus || entry.raw_provider_status;
                  const normalizedText = entry.normalizedStatus ? statusLabel(entry.normalizedStatus) : "Status não reconhecido pelo sistema";
                  const rawText = raw && !String(raw).startsWith("MANUAL:") && raw !== entry.normalizedStatus ? ` (status original do provider: ${raw})` : "";
                  return (
                    <li key={entry.id} style={{ fontSize: 13, color: entry.applied ? "var(--color-ink)" : "var(--color-ink-soft)" }}>
                      {formatDateTime(entry.occurred_at || entry.occurredAt)}: {normalizedText}{rawText}
                      {` · origem: ${label(SOURCE_LABELS, entry.source, "não identificada")}`}
                      {entry.note ? ` · ${entry.note}` : ""}
                      {!entry.applied ? " · recebido fora de ordem, não alterou o status atual" : ""}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <FinancingCaseWorkflow
        financingCase={financingCase}
        onChanged={() => {
          refreshCase();
          loadStatus(true);
          loadSubmissions(true);
          loadCommissions();
        }}
      />

      <Card
        title="Avaliação do imóvel"
        subtitle="Avaliação feita pelo banco/financeira — é só informativa. Ela nunca altera o preço ou a oferta cadastrada do imóvel; qualquer ajuste de preço continua sendo uma decisão manual, separada daqui."
        style={{ marginTop: 16 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {canEditCase ? (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <FormField label={isManual ? "Valor avaliado pelo banco (R$)" : "Valor de referência do imóvel (R$)"} htmlFor="appraisal-reference" helper={isManual ? "O banco avaliou o imóvel fora do sistema: registre aqui o valor informado. É só informativo." : "Opcional. É o valor do imóvel, não o valor financiado."}>
                <DecimalInput id="appraisal-reference" maxDecimals={2} value={appraisalReference} onChange={(e) => setAppraisalReference(e.target.value)} placeholder="0,00" />
              </FormField>
              <Button variant="secondary" onClick={handleRequestAppraisal} loading={requestingAppraisal}>
                {isManual ? "Registrar avaliação do banco" : "Solicitar avaliação"}
              </Button>
            </div>
          ) : null}
          {appraisalFormError ? <Alert tone="danger">{appraisalFormError}</Alert> : null}

          {appraisalsLoading ? (
            <p>Carregando avaliações…</p>
          ) : appraisalsError ? (
            <LoadError message={appraisalsError} onRetry={() => loadAppraisals()} />
          ) : appraisals.length === 0 ? (
            <p>Nenhuma avaliação solicitada ainda para este caso.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={headRow}>
                    <th style={cell}>Data</th>
                    <th style={cell}>Provider</th>
                    <th style={cell}>Status</th>
                    <th style={cell}>Valor (informativo)</th>
                  </tr>
                </thead>
                <tbody>
                  {appraisals.map((ap) => {
                    const appraised = ap.appraisedValue ?? ap.appraised_value ?? null;
                    const referenceValue = ap.requestedValue ?? ap.requested_value ?? null;
                    let valueText;
                    if (ap.status === "COMPLETED") {
                      valueText = appraised != null ? `${formatBRL(appraised)} (avaliado)` : referenceValue != null ? `${formatBRL(referenceValue)} (valor de referência informado no pedido)` : "O provider concluiu sem informar valor";
                    } else if (ap.status === "FAILED") {
                      valueText = "Sem valor: a avaliação falhou";
                    } else {
                      valueText = referenceValue != null ? `Aguardando o provider (referência ${formatBRL(referenceValue)})` : "Aguardando o provider";
                    }
                    return (
                      <tr key={ap.id} style={bodyRow}>
                        <td style={cell}>{formatDateTime(ap.created_at || ap.createdAt)}</td>
                        <td style={cell}>{providerShortLabel(ap.providerCode)}</td>
                        <td style={cell}>
                          <Badge tone={ap.status === "COMPLETED" ? "success" : ap.status === "FAILED" ? "danger" : "warning"}>
                            {ap.status === "COMPLETED" ? "Concluída" : ap.status === "FAILED" ? "Falhou" : "Solicitada"}
                          </Badge>
                        </td>
                        <td style={cell}>{valueText}</td>
                      </tr>
                    );
                  })}
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
          {perms.create && !commissionBlockedByStatus ? (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <FormField label="Valor-base (R$)" htmlFor="commission-base-amount" helper="Vazio usa o valor aprovado da proposta vigente do banco.">
                <DecimalInput id="commission-base-amount" maxDecimals={2} value={commissionBaseAmount} onChange={(e) => setCommissionBaseAmount(e.target.value)} placeholder="0,00" />
              </FormField>
              {commissionNeedsJustification ? (
                <FormField label="Justificativa da diferença" htmlFor="commission-base-justification" helper="O valor-base difere da proposta vigente do banco. Explique o motivo (mínimo 5 caracteres).">
                  <Input id="commission-base-justification" value={commissionBaseJustification} maxLength={300} onChange={(e) => setCommissionBaseJustification(e.target.value)} placeholder="Motivo da diferença" />
                </FormField>
              ) : null}
              <FormField label="Fato gerador" htmlFor="commission-trigger" helper={triggerOptions.length === 0 ? "Nenhum fato gerador carregado: confira os Parâmetros." : undefined}>
                <Select id="commission-trigger" value={commissionTrigger} onChange={(e) => setCommissionTrigger(e.target.value)} disabled={triggerOptions.length === 0}>
                  {triggerOptions.length === 0 ? <option value="">Sem fatos geradores disponíveis</option> : null}
                  {triggerOptions.map((value) => (
                    <option key={value} value={value}>{triggerLabel(value)}</option>
                  ))}
                </Select>
              </FormField>
              <Button onClick={handleCreateCommission} loading={creatingCommission} disabled={triggerOptions.length === 0}>
                Registrar direito à comissão
              </Button>
            </div>
          ) : null}
          {perms.create && commissionBlockedByStatus ? (
            <Alert tone="info">Neste estágio ({statusLabel(caseStatus)}) o caso não gera comissão, conforme os Parâmetros da empresa.</Alert>
          ) : null}
          {commissionFormError ? <Alert tone="danger">{commissionFormError}</Alert> : null}
          {commissionWarning ? <Alert tone="warning">{commissionWarning}</Alert> : null}
          {commissionNotice ? <Alert tone="success">{commissionNotice}</Alert> : null}

          {commissionsLoading ? (
            <p>Carregando comissões…</p>
          ) : commissionsError ? (
            <LoadError message={commissionsError} onRetry={loadCommissions} />
          ) : commissions.length === 0 ? (
            <p>Nenhuma comissão registrada ainda para este caso.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={headRow}>
                    <th style={cell}>Data</th>
                    <th style={cell}>Provider</th>
                    <th style={cell}>Fato gerador</th>
                    <th style={cell}>Base</th>
                    <th style={cell}>Percentual</th>
                    <th style={cell}>Valor</th>
                    <th style={cell}>Corretor</th>
                    <th style={cell}>Gerente</th>
                    <th style={cell}>Status</th>
                    <th style={cell}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => {
                    const adjustments = adjustmentsOf[c.id];
                    return (
                      <Fragment key={c.id}>
                        <tr style={bodyRow}>
                          <td style={cell}>{formatDateTime(c.created_at || c.createdAt)}</td>
                          <td style={cell}>{providerShortLabel(c.providerCode)}</td>
                          <td style={cell}>{triggerLabel(c.triggerEvent)}</td>
                          <td style={cell}>{formatBRL(c.baseAmount)}</td>
                          <td style={cell}>{formatPercent(c.percentage)}</td>
                          <td style={cell}>{formatBRL(c.amount)}</td>
                          <td style={cell}>{formatBRL(c.brokerAmount)} ({formatPercent(c.brokerSharePct)})</td>
                          <td style={cell}>{formatBRL(c.managerAmount)} ({formatPercent(c.managerSharePct)})</td>
                          <td style={cell}>
                            <Badge tone={COMMISSION_STATUS_TONE[c.status] || "neutral"}>
                              {label(COMMISSION_STATUS_LABELS, c.status, "Status não identificado")}
                            </Badge>
                            {c.financialReversalPending ? <div style={{ marginTop: 4, fontSize: 12 }}>Estorno financeiro pendente</div> : null}
                          </td>
                          <td style={cell}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {c.status === "EXPECTED" && canConfirmCommission ? (
                                <Button variant="secondary" onClick={() => { setConfirmTargetId(c.id); setConfirmExternalId(""); setConfirmError(""); }} loading={confirmingCommissionId === c.id}>
                                  Confirmar
                                </Button>
                              ) : null}
                              {c.status === "RECEIVABLE" && perms.settle ? (
                                <Button variant="secondary" onClick={() => { setReceiveTarget(c); setReceiveError(""); }} loading={receivingCommissionId === c.id}>
                                  Receber
                                </Button>
                              ) : null}
                              {c.status === "ADJUSTED" && c.financialReversalPending && perms.settle ? (
                                <Button variant="secondary" onClick={() => handleCompleteReversal(c.id)} loading={reversalCompletingId === c.id} disabled={Boolean(reversalCompletingId)}>
                                  Concluir estorno financeiro
                                </Button>
                              ) : null}
                              {["EXPECTED", "RECEIVABLE", "CONFIRMED", "RECEIVED"].includes(c.status) && perms.settle ? (
                                <Button variant="secondary" onClick={() => { setChargebackTargetId(c.id); setChargebackReason(""); setChargebackError(""); }} loading={chargebackCommissionId === c.id}>
                                  Estornar
                                </Button>
                              ) : null}
                              {(c.status === "RECEIVABLE" || c.status === "RECEIVED") && perms.fiscal ? (
                                <Button variant="secondary" onClick={() => handleRequestInvoiceForCommission(c)} loading={invoicingCommissionId === c.id} disabled={Boolean(invoicedIds[c.id]) || Boolean(invoicingCommissionId)}>
                                  {invoicedIds[c.id] ? "NFS-e solicitada" : "Emitir NFS-e"}
                                </Button>
                              ) : null}
                              <Button variant="secondary" size="sm" onClick={() => toggleCommissionDetails(c)}>{detailsOpen[c.id] ? "Ocultar detalhes" : "Detalhes"}</Button>
                            </div>
                          </td>
                        </tr>
                        {detailsOpen[c.id] ? (
                          <tr style={bodyRow}>
                            <td colSpan={10} style={{ ...cell, fontSize: 12 }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <span>Confirmada em: {c.confirmedAt || c.confirmed_at ? formatDateTime(c.confirmedAt || c.confirmed_at) : "ainda não confirmada"}</span>
                                <span>Identificação da confirmação no banco: {c.externalConfirmationId || c.external_confirmation_id || "não informada"}</span>
                                <span>Recebida em: {c.receivedAt || c.received_at ? formatDateTime(c.receivedAt || c.received_at) : "ainda não recebida"}</span>
                                <span>Versão da regra de comissão aplicada: {c.ruleVersionId || c.rule_version_id || "não registrada"}</span>
                                {c.status === "ADJUSTED" ? (
                                  adjustments?.error ? <span>{adjustments.error}</span>
                                    : adjustments?.rows ? (
                                      adjustments.rows.length === 0 ? <span>Nenhum ajuste registrado.</span> : adjustments.rows.map((adj) => (
                                        <span key={adj.id}>Ajuste de {formatBRL(adj.amount)} em {formatDateTime(adj.createdAt || adj.created_at)}: {adj.reason || "motivo não informado"}</span>
                                      ))
                                    ) : <span>Carregando ajustes…</span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
      <Modal
        open={Boolean(confirmTargetId)}
        onClose={() => { if (!confirmingCommissionId) { setConfirmTargetId(null); setConfirmError(""); } }}
        title="Confirmar comissão"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setConfirmTargetId(null); setConfirmError(""); }} disabled={Boolean(confirmingCommissionId)}>Cancelar</Button>
            <Button onClick={handleConfirmCommission} disabled={!confirmExternalId.trim() || Boolean(confirmingCommissionId)} loading={Boolean(confirmingCommissionId)}>Confirmar</Button>
          </>
        }
      >
        {confirmError ? <Alert tone="danger">{confirmError}</Alert> : null}
        <FormField label="Identificação da confirmação" htmlFor="commission-external-id" helper="Vem do banco ou da financeira (até 128 caracteres). Confirmar de novo com a mesma identificação não duplica o recebível.">
          <Input id="commission-external-id" maxLength={128} value={confirmExternalId} onChange={(e) => setConfirmExternalId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleConfirmCommission(); } }} />
        </FormField>
      </Modal>
      <Modal
        open={Boolean(chargebackTargetId)}
        onClose={() => { if (!chargebackCommissionId) { setChargebackTargetId(null); setChargebackError(""); } }}
        title="Estornar comissão"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setChargebackTargetId(null); setChargebackError(""); }} disabled={Boolean(chargebackCommissionId)}>Cancelar</Button>
            <Button onClick={handleChargebackCommission} disabled={chargebackReason.trim().length < 3 || Boolean(chargebackCommissionId)} loading={Boolean(chargebackCommissionId)}>Estornar</Button>
          </>
        }
      >
        {chargebackError ? <Alert tone="danger">{chargebackError}</Alert> : null}
        <Alert tone="warning">O estorno é do valor total da comissão e não pode ser desfeito. Para refazer, registre um novo direito à comissão.</Alert>
        <FormField label="Motivo do estorno" htmlFor="commission-chargeback-reason" required helper="Mínimo 3 caracteres. Fica na auditoria.">
          <Input id="commission-chargeback-reason" maxLength={300} value={chargebackReason} onChange={(e) => setChargebackReason(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleChargebackCommission(); } }} />
        </FormField>
      </Modal>
      <Modal
        open={Boolean(receiveTarget)}
        onClose={() => { if (!receivingCommissionId) { setReceiveTarget(null); setReceiveError(""); } }}
        title="Registrar recebimento da comissão"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setReceiveTarget(null); setReceiveError(""); }} disabled={Boolean(receivingCommissionId)}>Cancelar</Button>
            <Button onClick={handleReceiveCommission} loading={Boolean(receivingCommissionId)} disabled={Boolean(receivingCommissionId)}>Registrar recebimento</Button>
          </>
        }
      >
        {receiveError ? <Alert tone="danger">{receiveError}</Alert> : null}
        <p>Confirma que o banco pagou {receiveTarget ? formatBRL(receiveTarget.amount) : ""}? O lançamento a receber no Financeiro será liquidado.</p>
      </Modal>
    </AppShell>
  );
}
