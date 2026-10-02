"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Select from "@/components/atoms/Select/Select";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONE,
  PROJECT_STATUS_FLOW,
  STAGE_STATUS_LABELS,
  STAGE_STATUS_TONE,
  QUALITY_STATUS_LABELS,
  QUALITY_STATUS_TONE,
  BUDGET_STATUS_LABELS,
  BUDGET_STATUS_TONE,
  CHANGE_ORDER_STATUS_LABELS,
  CHANGE_ORDER_STATUS_TONE,
  CHANGE_ORDER_REASON_LABELS,
  MATERIAL_REQUEST_STATUS_LABELS,
  MATERIAL_REQUEST_STATUS_TONE,
  LOSS_RECORD_STATUS_LABELS,
  LOSS_RECORD_STATUS_TONE,
  LOSS_RECORD_MOVEMENT_LABELS,
  NONCONFORMITY_SEVERITY_LABELS,
  NONCONFORMITY_SEVERITY_TONE,
  NONCONFORMITY_STATUS_LABELS,
  NONCONFORMITY_STATUS_TONE,
} from "@/lib/mock/construction";
import {
  getProject,
  updateProject,
  transitionProject,
  removeProject,
  deliverProject,
  closeProjectWarranty,
  listProjectStages,
  createProjectStage,
  updateProjectStage,
  listDailyReports,
  createDailyReport,
  updateDailyReport,
  listDailyWorkers,
  listDailyMaterials,
  listBudgetLines,
  createBudgetLine,
  updateBudgetLine,
  listQualityItems,
  createQualityItem,
  checkQualityItem,
  listBudgets,
  createBudget,
  approveBudget,
  listChangeOrders,
  createChangeOrder,
  decideChangeOrder,
  getProjectHealth,
  getNayObrasSummary,
  getNayObrasPostObraSummary,
  listMaterialRequests,
  createMaterialRequest,
  receiveMaterialRequest,
  listLossRecords,
  createLossRecord,
  approveLossRecord,
  returnLossRecord,
  upsertApprovalThreshold,
  createMarginRule,
  getActiveMarginRule,
  listNonconformities,
  createNonconformity,
  closeNonconformity,
} from "@/lib/api/construction";
import { listProperties } from "@/lib/api/properties";
import { listCostCenters } from "@/lib/api/finance";
import { listPeople } from "@/lib/api/people";
import { uploadFile } from "@/lib/api/legal";
import { apiFetch } from "@/lib/api/client";
import { formatBRL, formatQuantity, formatPercent, formatDate, formatDateTime, dateOnlyInputToIso, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE, toNumber } from "@/lib/format";
import styles from "./page.module.css";

const WEATHER_OPTIONS = ["Ensolarado", "Nublado", "Chuvoso", "Ventania"];

// FIX (auditoria E2E de browser, ciclo 6, 02/10/2026): "NaN <= 0" e "NaN < 0" são ambos FALSE
// em JS — todo guard de validação deste arquivo que fazia `toNumber(x) <= 0` (ou `< 0`) sem
// checar Number.isNaN primeiro deixava passar entrada tipo "," (vírgula sozinha, sem dígito)
// como se fosse válida, mandando NaN pro backend (serializado como `null` pelo JSON.stringify)
// sem nenhum feedback ao usuário. isInvalidNumber centraliza o guard correto: trata vazio como
// inválido também, pra não precisar repetir `x === "" || ...` em cada call-site.
function isInvalidNumber(value, { allowZero = false } = {}) {
  if (value === "" || value === null || value === undefined) return true;
  const numeric = toNumber(value);
  if (Number.isNaN(numeric)) return true;
  return allowZero ? numeric < 0 : numeric <= 0;
}

function isLossFullyReturned(lossRecord, allRecords) {
  const alreadyReturned = allRecords
    .filter((r) => r.movementType === "RETURN" && r.status === "APPROVED" && r.relatedLossRecordId === lossRecord.id)
    .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  return alreadyReturned >= Number(lossRecord.quantity || 0);
}

export default function ObraDetalhePage({ params }) {
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [people, setPeople] = useState([]);
  const [stages, setStages] = useState([]);
  // FIX (auditoria pós-merge Marco 6, 30/09/2026): histórico de RDO ficava truncado a 5 itens
  // sem nenhuma forma de ver o restante. Mantém a lista completa em `allReports` e um toggle
  // `reportsShowAll` para exibir os 5 mais recentes por padrão, com opção de ver todos.
  const [allReports, setAllReports] = useState([]);
  const [reportsShowAll, setReportsShowAll] = useState(false);
  const reports = reportsShowAll ? allReports : allReports.slice(0, 5);
  const [budgetLines, setBudgetLines] = useState([]);
  const [qualityItems, setQualityItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", propertyId: "", responsibleUserId: "", costCenterId: "", budgetAmount: "", startsAt: "", endsAtPlanned: "" });
  const [editDateErrors, setEditDateErrors] = useState({});
  const [rdoDateInvalid, setRdoDateInvalid] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [stageOpen, setStageOpen] = useState(false);
  const [stageForm, setStageForm] = useState({ name: "", sequence: "1", plannedPct: "" });
  // FIX (homologação 23/09/2026): etapa e RDO só podiam ser CRIADOS. Guardar o id em
  // edição faz o mesmo modal servir pra criar e pra editar.
  const [editingStageId, setEditingStageId] = useState(null);
  const [savingStage, setSavingStage] = useState(false);

  const [rdoOpen, setRdoOpen] = useState(false);
  const [rdoForm, setRdoForm] = useState({ reportDate: new Date().toISOString().slice(0, 10), weather: WEATHER_OPTIONS[0], workforceCount: "", occurrences: "", servicesPerformed: "" });
  const [savingRdo, setSavingRdo] = useState(false);
  const [editingRdoId, setEditingRdoId] = useState(null);
  // Achado numa rodada de verificação de integrações (30/09/2026): a fonte exige "Fotos possuem
  // hash/origem" — evidência fotográfica do RDO. Reaproveita o mesmo padrão de upload já usado
  // em Change Orders/Não Conformidades (uploadFile + File.checksumSha256 no backend).
  const [rdoEvidenceFileIds, setRdoEvidenceFileIds] = useState([]);
  const [rdoEvidenceFileNames, setRdoEvidenceFileNames] = useState([]);
  const [rdoUploading, setRdoUploading] = useState(false);
  const [rdoUploadError, setRdoUploadError] = useState("");
  // Equipe do dia (DailyWorker) — achado numa rodada de verificação de integrações
  // (30/09/2026): a fonte exige "documentação correspondente" vinculada ao prestador do dia,
  // campo estava inteiramente ausente do Front (nenhuma tela de equipe do RDO existia).
  const [rdoWorkers, setRdoWorkers] = useState([]);
  const [workerUploadingIndex, setWorkerUploadingIndex] = useState(null);
  const [workerUploadError, setWorkerUploadError] = useState("");
  // Materiais do dia (DailyMaterial) — mesmo gap, achado na varredura final do Front.
  const [rdoMaterials, setRdoMaterials] = useState([]);

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: "", description: "", plannedAmount: "" });
  const [editingBudgetLineId, setEditingBudgetLineId] = useState(null);
  const [savingBudget, setSavingBudget] = useState(false);

  const [qualityOpen, setQualityOpen] = useState(false);
  const [qualityBusyId, setQualityBusyId] = useState(null);
  const [qualityRejecting, setQualityRejecting] = useState(null);
  const [qualityRejectNotes, setQualityRejectNotes] = useState("");
  const [qualityForm, setQualityForm] = useState({ item: "", projectStageId: "" });
  const [savingQuality, setSavingQuality] = useState(false);

  const [budget, setBudget] = useState(null);
  const [creatingBudget, setCreatingBudget] = useState(false);
  const [approveBudgetOpen, setApproveBudgetOpen] = useState(false);
  const [approvingBudget, setApprovingBudget] = useState(false);

  const [changeOrders, setChangeOrders] = useState([]);
  const [coOpen, setCoOpen] = useState(false);
  const [coForm, setCoForm] = useState({ reasonCode: "", description: "", budgetImpact: "", scheduleImpactDays: "", file: null });
  const [savingCo, setSavingCo] = useState(false);
  const [decidingCoId, setDecidingCoId] = useState(null);

  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState("");

  // NAY Obras (M6-101) — componente nomeado exigido pela fonte, resumo determinístico
  // (rule-based, nunca decide) sobre os read models de saúde já existentes. Achado numa
  // auditoria do Front do Marco 6: o endpoint existia, mas nenhuma tela o exibia.
  const [nayObras, setNayObras] = useState(null);
  const [nayObrasError, setNayObrasError] = useState("");
  const [postObraHealth, setPostObraHealth] = useState(null);

  const [materialRequests, setMaterialRequests] = useState([]);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({ description: "", quantity: "", unit: "" });
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [receivingMaterialId, setReceivingMaterialId] = useState(null);

  // FIX (auditoria pós-merge Marco 6, 30/09/2026): createLossRecord/listLossRecords/
  // approveLossRecord/returnLossRecord já existiam na API, mas nenhuma tela chamava (Categoria
  // 8 do catálogo de bugs — funcionalidade existe só no papel).
  const [lossRecords, setLossRecords] = useState([]);
  const [lossOpen, setLossOpen] = useState(false);
  const [lossForm, setLossForm] = useState({ materialDescription: "", quantity: "", estimatedValue: "", reason: "" });
  const [savingLoss, setSavingLoss] = useState(false);
  const [lossBusyId, setLossBusyId] = useState(null);

  // Alçada de aprovação (MATERIAL_LOSS) — achado numa auditoria do Front do Marco 6: o endpoint
  // já existia, mas não havia nenhuma tela pra configurar o valor (só dava pra setar direto no
  // banco). Configuração por empresa, não por obra.
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const [thresholdAmount, setThresholdAmount] = useState("");
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Margem mínima de obra (MarginRule) — achado numa auditoria do Front do Marco 6: nenhuma
  // empresa real conseguia aprovar orçamento algum sem isso, e não havia NENHUMA tela pra
  // configurar (o endpoint nem existia até esta correção).
  const [activeMarginRule, setActiveMarginRule] = useState(null);
  const [marginRuleOpen, setMarginRuleOpen] = useState(false);
  const [marginRuleError, setMarginRuleError] = useState("");
  const [marginRulePct, setMarginRulePct] = useState("");
  const [savingMarginRule, setSavingMarginRule] = useState(false);

  // Não conformidades (M6-13/M6-24/M6-38/M6-62/M6-86).
  const [nonconformities, setNonconformities] = useState([]);
  const [ncOpen, setNcOpen] = useState(false);
  const [ncForm, setNcForm] = useState({
    description: "",
    severity: "MEDIUM",
    responsibleUserId: "",
    slaDueAt: "",
    requiresAcceptance: false,
    beforeFileId: "",
    beforeFileName: "",
  });
  const [ncBeforeUploading, setNcBeforeUploading] = useState(false);
  const [ncBeforeUploadError, setNcBeforeUploadError] = useState("");
  const [savingNc, setSavingNc] = useState(false);

  // Modal de fechamento de NC — REGRA FAIL-CLOSED replicada aqui: o botão de confirmar só
  // habilita depois que a evidência "depois" terminar de subir com sucesso (mesma regra que
  // o backend aplica em nonconformities.service.js closeNonconformity).
  const [closingNc, setClosingNc] = useState(null);
  const [ncAfterFileId, setNcAfterFileId] = useState("");
  const [ncAfterFileName, setNcAfterFileName] = useState("");
  const [ncAfterUploading, setNcAfterUploading] = useState(false);
  const [ncAfterUploadError, setNcAfterUploadError] = useState("");
  const [ncAcceptedByUserId, setNcAcceptedByUserId] = useState("");
  const [savingNcClose, setSavingNcClose] = useState(false);

  // Entrega da obra — gate dedicado (bloqueia com NC crítica aberta).
  const [delivering, setDelivering] = useState(false);
  const [deliveryBlocked, setDeliveryBlocked] = useState(false);

  // Fechamento de garantia — gate dedicado (bloqueia com MaintenanceCase ainda aberto).
  const [closingWarranty, setClosingWarranty] = useState(false);
  const [warrantyCloseBlocked, setWarrantyCloseBlocked] = useState(false);

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      getProject(params.id).catch((err) => {
        if (err?.status === 404) {
          setNotFoundFlag(true);
          return null;
        }
        throw err;
      }),
      listProperties(),
      apiFetch("/users?status=ACTIVE"),
      // Centro de custo é opcional — não pode derrubar a página inteira se o usuário não tiver
      // permissão finance:read (o formulário de edição só perde essa opção específica).
      listCostCenters().catch(() => []),
      listPeople().catch(() => []),
    ])
      .then(([p, props, u, cc, ppl]) => {
        if (cancelled || !p) return;
        setProject(p);
        setProperties(props || []);
        setUsers(u || []);
        setCostCenters(cc || []);
        setPeople(ppl || []);
        return Promise.all([
          listProjectStages(p.id),
          listDailyReports(p.id),
          listBudgetLines(p.id),
          listQualityItems(p.id),
          listBudgets(p.id),
          listChangeOrders(p.id),
          listMaterialRequests(p.id),
          listNonconformities(p.id),
          listLossRecords(p.id),
        ]).then(([st, rd, bl, qi, budgets, cos, mr, ncs, lr]) => {
          if (cancelled) return;
          setStages(st || []);
          setAllReports(rd || []);
          setBudgetLines(bl || []);
          setQualityItems(qi || []);
          setBudget((budgets || [])[0] || null);
          setChangeOrders(cos || []);
          setMaterialRequests(mr || []);
          setNonconformities(ncs || []);
          setLossRecords(lr || []);
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar a obra.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  function loadHealth() {
    setHealthError("");
    getProjectHealth(params.id)
      .then((h) => setHealth(h || null))
      .catch((err) => setHealthError(err?.message || "Não foi possível carregar a saúde da obra."));
  }

  function loadNayObras() {
    setNayObrasError("");
    getNayObrasSummary(params.id)
      .then((s) => setNayObras(s || null))
      .catch((err) => setNayObrasError(err?.message || "Não foi possível carregar o resumo do NAY Obras."));
    getNayObrasPostObraSummary(params.id)
      .then((s) => setPostObraHealth(s || null))
      .catch(() => setPostObraHealth(null));
  }

  useEffect(() => {
    loadHealth();
    loadNayObras();
    getActiveMarginRule().then(setActiveMarginRule).catch(() => setActiveMarginRule(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    const cancel = load();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (notFoundFlag) return notFound();

  if (loading) {
    return (
      <AppShell title="Obra" backHref="/painel/obras/lista">
        <SkeletonDetail sections={4} />
      </AppShell>
    );
  }

  if (loadError && !project) {
    return (
      <AppShell title="Obra" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Não foi possível carregar a obra">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="Obra" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  const property = project.propertyId ? properties.find((p) => p.id === project.propertyId) : null;
  const responsible = project.responsibleUserId ? users.find((u) => u.id === project.responsibleUserId) : null;
  const nextStatuses = PROJECT_STATUS_FLOW[project.status] || [];

  async function handleAdvanceStatus(nextStatus) {
    setBusy(true);
    setActionError("");
    try {
      const updated = await transitionProject(project.id, nextStatus);
      setProject(updated);
    } catch (err) {
      setActionError(err?.message || "Não foi possível atualizar o status da obra.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setActionError("");
    try {
      await removeProject(project.id);
      router.push("/painel/obras/lista");
    } catch (err) {
      setActionError(err?.message || "Não foi possível excluir a obra.");
      setBusy(false);
    }
  }

  function openEditModal() {
    setEditForm({
      name: project.name,
      propertyId: project.propertyId || "",
      responsibleUserId: project.responsibleUserId || "",
      costCenterId: project.costCenterId || "",
      budgetAmount: project.budgetAmount != null ? String(project.budgetAmount) : "",
      startsAt: project.startsAt ? project.startsAt.slice(0, 10) : "",
      endsAtPlanned: project.endsAtPlanned ? project.endsAtPlanned.slice(0, 10) : "",
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    setActionError("");
    try {
      const updated = await updateProject(project.id, {
        name: editForm.name.trim(),
        propertyId: editForm.propertyId || null,
        responsibleUserId: editForm.responsibleUserId || null,
        costCenterId: editForm.costCenterId || null,
        // FIX (auditoria E2E de browser, ciclo 5, 02/10/2026): com orçamento já aprovado
        // (baseline imutável), o backend agora rejeita qualquer alteração de budgetAmount —
        // omite o campo do payload nesse caso (igual ao padrão já usado em
        // updateBudgetLine/plannedAmount), senão salvar OUTRO campo do modal (ex.: nome)
        // quebraria também, mesmo sem o usuário ter mexido no orçamento.
        ...(budget?.status !== "APPROVED"
          ? { budgetAmount: editForm.budgetAmount !== "" ? toNumber(editForm.budgetAmount) : null }
          : {}),
        startsAt: dateOnlyInputToIso(editForm.startsAt) || null,
        endsAtPlanned: dateOnlyInputToIso(editForm.endsAtPlanned) || null,
      });
      setProject(updated);
      setEditOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar as alterações.");
    } finally {
      setSavingEdit(false);
    }
  }

  // FIX (auditoria pós-merge Marco 6, 30/09/2026): a API aceita {status, notes} em
  // checkQualityItem, mas a tela nunca oferecia campo pra registrar o motivo ao marcar "Não OK"
  // — dado se perdia em silêncio (Categoria 3 do catálogo de bugs). "OK" continua direto (sem
  // motivo a justificar); "Não OK" abre o modal de observação obrigatória.
  async function handleQualityQuickAction(item, status, notes) {
    if (qualityBusyId) return;
    setActionError("");
    setQualityBusyId(item.id);
    try {
      const updated = await checkQualityItem(item.id, { status, notes: notes || undefined });
      setQualityItems((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setQualityRejecting(null);
      setQualityRejectNotes("");
    } catch (err) {
      setActionError(err?.message || "Não foi possível atualizar o item de qualidade.");
    } finally {
      setQualityBusyId(null);
    }
  }

  function openStageModal() {
    setEditingStageId(null);
    setStageForm({ name: "", sequence: String(stages.length + 1), plannedPct: "" });
    setStageOpen(true);
  }

  // FIX (homologação 23/09/2026): não existia NENHUMA forma de editar uma etapa de obra pela
  // interface — a etapa só podia ser criada. PATCH /construction/stages/:id já existia na API
  // e em lib/api/construction.js (updateProjectStage), mas nenhuma tela consumia. Corrigir
  // nome, sequência ou percentual planejado de uma etapa era impossível pelo sistema.
  function openStageEditModal(stage) {
    setEditingStageId(stage.id);
    setStageForm({
      name: stage.name || "",
      sequence: stage.sequence != null ? String(stage.sequence) : "",
      plannedPct: stage.plannedPct != null ? String(Number(stage.plannedPct)) : "",
    });
    setStageOpen(true);
  }

  async function handleSaveStage() {
    if (!stageForm.name.trim() || stageForm.sequence === "") return;
    setSavingStage(true);
    setActionError("");
    try {
      const payload = {
        name: stageForm.name.trim(),
        sequence: Number(stageForm.sequence),
        plannedPct: stageForm.plannedPct !== "" ? toNumber(stageForm.plannedPct) : undefined,
      };
      if (editingStageId) {
        const updated = await updateProjectStage(editingStageId, payload);
        setStages((prev) => prev.map((s) => (s.id === editingStageId ? updated : s)));
      } else {
        const created = await createProjectStage(project.id, payload);
        setStages((prev) => [...prev, created]);
      }
      setStageOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar a etapa.");
    } finally {
      setSavingStage(false);
    }
  }

  function openRdoModal() {
    setEditingRdoId(null);
    setRdoForm({ reportDate: new Date().toISOString().slice(0, 10), weather: WEATHER_OPTIONS[0], workforceCount: "", occurrences: "", servicesPerformed: "" });
    setRdoEvidenceFileIds([]);
    setRdoEvidenceFileNames([]);
    setRdoUploadError("");
    setRdoWorkers([]);
    setWorkerUploadError("");
    setRdoMaterials([]);
    setRdoOpen(true);
  }

  function addRdoMaterial() {
    setRdoMaterials((prev) => [...prev, { materialDescription: "", quantity: "", unit: "" }]);
  }
  function updateRdoMaterial(index, field, value) {
    setRdoMaterials((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }
  function removeRdoMaterial(index) {
    setRdoMaterials((prev) => prev.filter((_, i) => i !== index));
  }

  function addRdoWorker() {
    setRdoWorkers((prev) => [...prev, { personId: "", role: "", documentFileIds: [] }]);
  }
  function updateRdoWorker(index, field, value) {
    setRdoWorkers((prev) => prev.map((w, i) => (i === index ? { ...w, [field]: value } : w)));
  }
  function removeRdoWorker(index) {
    setRdoWorkers((prev) => prev.filter((_, i) => i !== index));
  }
  async function handleUploadWorkerDocument(index, file) {
    if (!file) return;
    setWorkerUploadingIndex(index);
    setWorkerUploadError("");
    try {
      const uploaded = await uploadFile(file);
      setRdoWorkers((prev) =>
        prev.map((w, i) => (i === index ? { ...w, documentFileIds: [...(w.documentFileIds || []), uploaded.id] } : w))
      );
    } catch (err) {
      setWorkerUploadError(err?.message || "Erro ao enviar documento.");
    } finally {
      setWorkerUploadingIndex(null);
    }
  }

  async function handleUploadRdoEvidence(files) {
    const fileArray = Array.from(files || []);
    if (fileArray.length === 0) return;
    setRdoUploading(true);
    setRdoUploadError("");
    try {
      for (const file of fileArray) {
        const uploaded = await uploadFile(file);
        setRdoEvidenceFileIds((prev) => [...prev, uploaded.id]);
        setRdoEvidenceFileNames((prev) => [...prev, file.name]);
      }
    } catch (err) {
      setRdoUploadError(err?.message || "Erro ao enviar foto.");
    } finally {
      setRdoUploading(false);
    }
  }

  function removeRdoEvidence(index) {
    setRdoEvidenceFileIds((prev) => prev.filter((_, i) => i !== index));
    setRdoEvidenceFileNames((prev) => prev.filter((_, i) => i !== index));
  }

  // FIX (homologação 23/09/2026): mesmo caso da etapa — o RDO só podia ser registrado, nunca
  // corrigido. PATCH /construction/daily-reports/:id já existia na API e em
  // lib/api/construction.js (updateDailyReport) sem nenhum consumidor. Um RDO lançado com
  // data, clima, efetivo ou ocorrências errados ficava errado pra sempre.
  function openRdoEditModal(report) {
    setEditingRdoId(report.id);
    setRdoDateInvalid(false);
    setRdoForm({
      reportDate: report.reportDate ? String(report.reportDate).slice(0, 10) : "",
      weather: report.weather || WEATHER_OPTIONS[0],
      workforceCount: report.workforceCount != null ? String(report.workforceCount) : "",
      occurrences: report.occurrences || "",
      servicesPerformed: report.servicesPerformed || "",
    });
    {
      const existingIds = Array.isArray(report.evidenceFileIds) ? report.evidenceFileIds : [];
      setRdoEvidenceFileIds(existingIds);
      // Nomes originais não são devolvidos pelo RDO (só o id do arquivo) — usa um rótulo
      // genérico numerado pros já existentes; uploads novos nesta sessão mostram o nome real.
      setRdoEvidenceFileNames(existingIds.map((_, i) => `Evidência ${i + 1}`));
    }
    setRdoUploadError("");
    setRdoWorkers([]);
    setWorkerUploadError("");
    setRdoMaterials([]);
    setRdoOpen(true);
    listDailyWorkers(report.id)
      .then((workers) => {
        setRdoWorkers(
          (workers || []).map((w) => ({ personId: w.personId, role: w.role || "", documentFileIds: Array.isArray(w.documentFileIds) ? w.documentFileIds : [] }))
        );
      })
      .catch(() => {});
    listDailyMaterials(report.id)
      .then((materials) => {
        setRdoMaterials(
          (materials || []).map((m) => ({ materialDescription: m.materialDescription, quantity: String(Number(m.quantity)), unit: m.unit }))
        );
      })
      .catch(() => {});
  }

  async function handleSaveRdo() {
    if (!rdoForm.reportDate || !rdoForm.weather || rdoForm.workforceCount === "") return;
    setSavingRdo(true);
    setActionError("");
    try {
      const payload = {
        reportDate: rdoForm.reportDate,
        weather: rdoForm.weather,
        workforceCount: Number(rdoForm.workforceCount),
        occurrences: rdoForm.occurrences.trim() || undefined,
        servicesPerformed: rdoForm.servicesPerformed.trim() || undefined,
        evidenceFileIds: rdoEvidenceFileIds,
        workers: rdoWorkers.filter((w) => w.personId),
        materials: rdoMaterials
          .filter((m) => m.materialDescription && m.quantity !== "" && m.unit)
          .map((m) => ({ ...m, quantity: toNumber(m.quantity) })),
      };
      if (editingRdoId) {
        const updated = await updateDailyReport(editingRdoId, payload);
        setAllReports((prev) => prev.map((r) => (r.id === editingRdoId ? updated : r)));
      } else {
        const created = await createDailyReport(project.id, payload);
        setAllReports((prev) => [created, ...prev]);
      }
      setRdoOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar o RDO.");
    } finally {
      setSavingRdo(false);
    }
  }

  function openBudgetModal() {
    setEditingBudgetLineId(null);
    setBudgetForm({ category: "", description: "", plannedAmount: "" });
    setBudgetOpen(true);
  }

  // Achado numa varredura final do Front do Marco 6: updateBudgetLine já existia na API (e no
  // wrapper do Front), mas nenhuma tela chamava — não dava pra corrigir categoria/descrição de
  // uma linha, nem o valor planejado antes da aprovação do orçamento. Mesmo modal de criação,
  // reaproveitado pra editar (valor planejado trava quando o orçamento agregado já está
  // aprovado — mesma regra que o backend aplica em updateBudgetLine).
  function openBudgetLineEditModal(line) {
    setEditingBudgetLineId(line.id);
    setBudgetForm({
      category: line.category || "",
      description: line.description || "",
      plannedAmount: line.plannedAmount != null ? String(Number(line.plannedAmount)).replace(".", ",") : "",
    });
    setBudgetOpen(true);
  }

  async function handleCreateBudgetLine() {
    if (!budgetForm.category.trim() || isInvalidNumber(budgetForm.plannedAmount, { allowZero: true })) return;
    setSavingBudget(true);
    setActionError("");
    try {
      if (editingBudgetLineId) {
        const payload = { category: budgetForm.category.trim(), description: budgetForm.description.trim() || null };
        if (budget?.status !== "APPROVED") payload.plannedAmount = toNumber(budgetForm.plannedAmount);
        const updated = await updateBudgetLine(editingBudgetLineId, payload);
        setBudgetLines((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await createBudgetLine(project.id, {
          category: budgetForm.category.trim(),
          description: budgetForm.description.trim() || undefined,
          plannedAmount: toNumber(budgetForm.plannedAmount),
          budgetId: budget?.id || undefined,
        });
        setBudgetLines((prev) => [...prev, created]);
      }
      setBudgetOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar a linha de orçamento.");
    } finally {
      setSavingBudget(false);
    }
  }

  async function handleCreateBudget() {
    setCreatingBudget(true);
    setActionError("");
    try {
      const created = await createBudget(project.id);
      setBudget(created);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o orçamento agregado.");
    } finally {
      setCreatingBudget(false);
    }
  }

  async function handleApproveBudget() {
    if (!budget) return;
    setApprovingBudget(true);
    setActionError("");
    try {
      const updated = await approveBudget(budget.id);
      setBudget(updated);
      setApproveBudgetOpen(false);
      loadHealth();
      // BUG REAL CORRIGIDO (achado numa auditoria final do Marco 6, 30/09/2026): aprovar o
      // orçamento move a obra PLANNED->BUDGETED como efeito colateral no backend (M6-18), mas
      // esta tela só atualizava o estado local de "budget" — o status da obra na tela (badge,
      // botões de ação disponíveis) ficava desatualizado até um reload manual da página.
      const refreshedProject = await getProject(project.id);
      setProject(refreshedProject);
    } catch (err) {
      setActionError(err?.message || "Não foi possível aprovar o orçamento.");
    } finally {
      setApprovingBudget(false);
    }
  }

  function openChangeOrderModal() {
    setCoForm({ reasonCode: "", description: "", budgetImpact: "", scheduleImpactDays: "", file: null });
    setCoOpen(true);
  }

  const isChangeOrderValid =
    coForm.reasonCode !== "" && coForm.description.trim() !== "" && coForm.budgetImpact !== "" && !Number.isNaN(toNumber(coForm.budgetImpact));

  async function handleCreateChangeOrder() {
    if (!isChangeOrderValid) return;
    setSavingCo(true);
    setActionError("");
    try {
      let evidenceFileIds;
      if (coForm.file) {
        const uploaded = await uploadFile(coForm.file);
        evidenceFileIds = [uploaded.id];
      }
      const created = await createChangeOrder(project.id, {
        reasonCode: coForm.reasonCode,
        description: coForm.description.trim(),
        budgetImpact: toNumber(coForm.budgetImpact),
        scheduleImpactDays: coForm.scheduleImpactDays !== "" ? Number(coForm.scheduleImpactDays) : undefined,
        evidenceFileIds,
      });
      setChangeOrders((prev) => [created, ...prev]);
      setCoOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o Change Order.");
    } finally {
      setSavingCo(false);
    }
  }

  async function handleDecideChangeOrder(changeOrder, decision) {
    setDecidingCoId(changeOrder.id);
    setActionError("");
    try {
      const updated = await decideChangeOrder(changeOrder.id, decision);
      setChangeOrders((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (decision === "APPROVE") {
        const [budgets] = await Promise.all([listBudgets(project.id)]);
        setBudget((budgets || [])[0] || null);
        loadHealth();
      }
    } catch (err) {
      setActionError(err?.message || "Não foi possível decidir o Change Order.");
    } finally {
      setDecidingCoId(null);
    }
  }

  function openQualityModal() {
    setQualityForm({ item: "", projectStageId: "" });
    setQualityOpen(true);
  }
  async function handleCreateQualityItem() {
    if (!qualityForm.item.trim()) return;
    setSavingQuality(true);
    setActionError("");
    try {
      const created = await createQualityItem(project.id, {
        item: qualityForm.item.trim(),
        projectStageId: qualityForm.projectStageId || undefined,
      });
      setQualityItems((prev) => [...prev, created]);
      setQualityOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o item de checklist.");
    } finally {
      setSavingQuality(false);
    }
  }

  function openMaterialModal() {
    setMaterialForm({ description: "", quantity: "", unit: "" });
    setMaterialOpen(true);
  }
  async function handleCreateMaterialRequest() {
    if (!materialForm.description.trim() || isInvalidNumber(materialForm.quantity) || !materialForm.unit.trim()) return;
    setSavingMaterial(true);
    setActionError("");
    try {
      const created = await createMaterialRequest(project.id, {
        description: materialForm.description.trim(),
        quantity: toNumber(materialForm.quantity),
        unit: materialForm.unit.trim(),
      });
      setMaterialRequests((prev) => [created, ...prev]);
      setMaterialOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a requisição de material.");
    } finally {
      setSavingMaterial(false);
    }
  }
  async function handleReceiveMaterialRequest(request) {
    if (receivingMaterialId) return;
    setReceivingMaterialId(request.id);
    setActionError("");
    try {
      const updated = await receiveMaterialRequest(request.id);
      setMaterialRequests((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      setActionError(err?.message || "Não foi possível marcar a requisição como recebida.");
    } finally {
      setReceivingMaterialId(null);
    }
  }

  function openLossModal() {
    setLossForm({ materialDescription: "", quantity: "", estimatedValue: "", reason: "" });
    setLossOpen(true);
  }
  async function handleCreateLossRecord() {
    if (!lossForm.materialDescription.trim() || isInvalidNumber(lossForm.quantity) || isInvalidNumber(lossForm.estimatedValue, { allowZero: true }) || !lossForm.reason.trim()) return;
    setSavingLoss(true);
    setActionError("");
    try {
      const created = await createLossRecord(project.id, {
        materialDescription: lossForm.materialDescription.trim(),
        quantity: toNumber(lossForm.quantity),
        estimatedValue: toNumber(lossForm.estimatedValue),
        reason: lossForm.reason.trim(),
      });
      setLossRecords((prev) => [created, ...prev]);
      setLossOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar a perda de material.");
    } finally {
      setSavingLoss(false);
    }
  }
  async function handleApproveLossRecord(record) {
    if (lossBusyId) return;
    setLossBusyId(record.id);
    setActionError("");
    try {
      const updated = await approveLossRecord(record.id);
      setLossRecords((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err) {
      setActionError(err?.message || "Não foi possível aprovar o registro de perda.");
    } finally {
      setLossBusyId(null);
    }
  }
  async function handleReturnLossRecord(record) {
    if (lossBusyId) return;
    setLossBusyId(record.id);
    setActionError("");
    try {
      const returned = await returnLossRecord(record.id);
      setLossRecords((prev) => [returned, ...prev]);
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar a devolução de material.");
    } finally {
      setLossBusyId(null);
    }
  }

  function openThresholdModal() {
    setThresholdAmount("");
    setThresholdOpen(true);
  }

  async function handleSaveThreshold() {
    if (isInvalidNumber(thresholdAmount)) return;
    setSavingThreshold(true);
    setActionError("");
    try {
      await upsertApprovalThreshold({
        groupId: project.groupId,
        companyId: project.companyId,
        context: "MATERIAL_LOSS",
        maxAutoApproveAmount: toNumber(thresholdAmount),
      });
      setThresholdOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar a alçada de aprovação.");
    } finally {
      setSavingThreshold(false);
    }
  }

  function openMarginRuleModal() {
    setMarginRulePct(activeMarginRule ? String(Number(activeMarginRule.minMarginPct)).replace(".", ",") : "");
    setMarginRuleError("");
    setMarginRuleOpen(true);
  }

  async function handleSaveMarginRule() {
    if (marginRulePct === "" || Number.isNaN(toNumber(marginRulePct)) || toNumber(marginRulePct) < 0 || toNumber(marginRulePct) > 100) return;
    setSavingMarginRule(true);
    setMarginRuleError("");
    try {
      const rule = await createMarginRule({
        groupId: project.groupId,
        companyId: project.companyId,
        minMarginPct: toNumber(marginRulePct),
      });
      setActiveMarginRule(rule);
      setMarginRuleOpen(false);
    } catch (err) {
      // FIX (auditoria E2E de browser, ciclo 3, 02/10/2026): o erro era gravado em
      // actionError, que só é exibido na tela PRINCIPAL por trás do modal — com o modal
      // aberto por cima, o usuário não via nenhum feedback e a ação parecia travar
      // silenciosamente. Erro agora aparece dentro do próprio modal.
      setMarginRuleError(err?.message || "Não foi possível salvar a margem mínima.");
    } finally {
      setSavingMarginRule(false);
    }
  }

  function openNcModal() {
    setNcForm({
      description: "",
      severity: "MEDIUM",
      responsibleUserId: "",
      slaDueAt: "",
      requiresAcceptance: false,
      beforeFileId: "",
      beforeFileName: "",
    });
    setNcBeforeUploadError("");
    setNcOpen(true);
  }

  async function handleUploadBeforeEvidence(file) {
    if (!file) return;
    setNcBeforeUploading(true);
    setNcBeforeUploadError("");
    try {
      const uploaded = await uploadFile(file);
      setNcForm((p) => ({ ...p, beforeFileId: uploaded.id, beforeFileName: file.name }));
    } catch (err) {
      setNcBeforeUploadError(err?.message || "Erro ao enviar evidência.");
    } finally {
      setNcBeforeUploading(false);
    }
  }

  async function handleCreateNonconformity() {
    if (!ncForm.description.trim()) return;
    setSavingNc(true);
    setActionError("");
    try {
      const created = await createNonconformity(project.id, {
        description: ncForm.description.trim(),
        severity: ncForm.severity,
        responsibleUserId: ncForm.responsibleUserId || undefined,
        slaDueAt: dateOnlyInputToIso(ncForm.slaDueAt) || undefined,
        requiresAcceptance: ncForm.requiresAcceptance,
        beforeEvidenceFileIds: ncForm.beforeFileId ? [ncForm.beforeFileId] : [],
      });
      setNonconformities((prev) => [created, ...prev]);
      setNcOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar a não conformidade.");
    } finally {
      setSavingNc(false);
    }
  }

  function openCloseNcModal(nc) {
    setClosingNc(nc);
    setNcAfterFileId("");
    setNcAfterFileName("");
    setNcAfterUploadError("");
    setNcAcceptedByUserId("");
  }

  async function handleUploadAfterEvidence(file) {
    if (!file) return;
    setNcAfterUploading(true);
    setNcAfterUploadError("");
    try {
      const uploaded = await uploadFile(file);
      setNcAfterFileId(uploaded.id);
      setNcAfterFileName(file.name);
    } catch (err) {
      setNcAfterUploadError(err?.message || "Erro ao enviar evidência.");
    } finally {
      setNcAfterUploading(false);
    }
  }

  // REGRA FAIL-CLOSED replicada na UI (não só confiar no erro 422 da API): o botão de
  // confirmar fechamento fica desabilitado até existir uma evidência "depois" já enviada
  // (ncAfterFileId preenchido) e, se a NC exigir aceite, até um responsável pelo aceite ser
  // selecionado. Mesmas duas condições de nonconformities.service.js closeNonconformity.
  async function handleCloseNonconformity() {
    if (!closingNc || !ncAfterFileId) return;
    if (closingNc.requiresAcceptance && !ncAcceptedByUserId) return;
    setSavingNcClose(true);
    setActionError("");
    try {
      const updated = await closeNonconformity(closingNc.id, {
        afterEvidenceFileIds: [ncAfterFileId],
        acceptedByUserId: ncAcceptedByUserId || undefined,
      });
      setNonconformities((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setClosingNc(null);
    } catch (err) {
      setActionError(err?.message || "Não foi possível fechar a não conformidade.");
    } finally {
      setSavingNcClose(false);
    }
  }

  // Entrega da obra (M6-25/...) — se a API recusar por NC crítica em aberto, mostramos um
  // aviso com link direto pra seção de Não Conformidades desta mesma tela, nunca o código de
  // erro técnico cru.
  async function handleDeliver() {
    if (delivering) return;
    setDelivering(true);
    setActionError("");
    setDeliveryBlocked(false);
    try {
      const updated = await deliverProject(project.id);
      setProject(updated);
    } catch (err) {
      if (err?.code === "PROJECT_DELIVERY_BLOCKED_BY_CRITICAL_NONCONFORMITY") {
        setDeliveryBlocked(true);
      } else {
        setActionError(err?.message || "Não foi possível entregar a obra.");
      }
    } finally {
      setDelivering(false);
    }
  }

  // Fechamento de garantia (M6-...) — se a API recusar por caso de garantia ainda aberto, mostra
  // um aviso claro em vez do código de erro técnico cru.
  async function handleCloseWarranty() {
    if (closingWarranty) return;
    setClosingWarranty(true);
    setActionError("");
    setWarrantyCloseBlocked(false);
    try {
      const updated = await closeProjectWarranty(project.id);
      setProject(updated);
    } catch (err) {
      if (err?.code === "PROJECT_WARRANTY_CLOSE_BLOCKED_BY_OPEN_CASE") {
        setWarrantyCloseBlocked(true);
      } else {
        setActionError(err?.message || "Não foi possível encerrar a garantia da obra.");
      }
    } finally {
      setClosingWarranty(false);
    }
  }

  const totalPlanned = budgetLines.reduce((s, b) => s + Number(b.plannedAmount || 0), 0);
  const totalActual = budgetLines.reduce((s, b) => s + Number(b.actualAmount || 0), 0);

  return (
    <AppShell title={project.name} backHref="/painel/obras/lista">
      <div className={styles.wrap}>
        {/* FIX (auditoria E2E de browser, ciclo 4, 02/10/2026): actionError é compartilhado por
            TODOS os modais do módulo (orçamento, change order, NC, perda de material, checklist,
            etc.), mas só era renderizado aqui, no topo da página — atrás do overlay de qualquer
            modal aberto (z-index 100). Usuário via o modal "travar" sem feedback nenhum ao
            submeter um valor rejeitado pela API. Posição fixa com z-index acima do Modal corrige
            de uma vez só, sem duplicar a condição em cada um dos ~13 modais da tela. */}
        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}
        {deliveryBlocked ? (
          <Alert tone="danger" title="Entrega bloqueada">
            Não é possível entregar a obra: existe pelo menos uma não conformidade{" "}
            <strong>crítica em aberto</strong> vinculada a este projeto. Resolva e feche a(s)
            pendência(s) na seção{" "}
            <a href="#nao-conformidades" className={styles.infoLink}>Não Conformidades</a>{" "}
            abaixo antes de tentar entregar novamente.
          </Alert>
        ) : null}
        {warrantyCloseBlocked ? (
          <Alert tone="danger" title="Encerramento de garantia bloqueado">
            Não é possível encerrar a garantia da obra: existe pelo menos um{" "}
            <strong>chamado de garantia ainda aberto</strong> vinculado a este projeto. Feche
            todos os chamados em{" "}
            <a href="/painel/obras/pos-obra" className={styles.infoLink}>Pós-obra</a>{" "}
            antes de tentar encerrar novamente.
          </Alert>
        ) : null}

        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={PROJECT_STATUS_TONE[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
          </div>
          <div className={styles.actions}>
            {nextStatuses.length > 0 ? (
              nextStatuses.map((status) =>
                // FIX (auditoria E2E de browser, ciclo 4, 02/10/2026): "Cancelar" é a única
                // transição destrutiva/irreversível deste conjunto (as demais são progresso
                // normal da obra) — executava na hora, sem confirmação nenhuma, rotulada com o
                // nome do estado-alvo ("Cancelada") em vez de um verbo de ação.
                status === "CANCELLED" ? (
                  <Button key={status} variant="danger" onClick={() => setCancelConfirmOpen(true)} loading={busy}>
                    <Icon name="arrowUpCircle" size={16} /> Cancelar obra
                  </Button>
                ) : (
                  <Button key={status} variant="secondary" onClick={() => handleAdvanceStatus(status)} loading={busy}>
                    <Icon name="arrowUpCircle" size={16} /> {PROJECT_STATUS_LABELS[status]}
                  </Button>
                )
              )
            ) : null}
            {project.status === "FINAL_INSPECTION" ? (
              <Button variant="primary" onClick={handleDeliver} loading={delivering} disabled={delivering}>
                <Icon name="check" size={16} /> Entregar obra
              </Button>
            ) : null}
            {project.status === "WARRANTY" ? (
              <Button variant="primary" onClick={handleCloseWarranty} loading={closingWarranty} disabled={closingWarranty}>
                <Icon name="check" size={16} /> Encerrar garantia
              </Button>
            ) : null}
            <Button variant="secondary" onClick={openEditModal}>
              <Icon name="pencil" size={16} /> Editar
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" size={16} /> Excluir
            </Button>
          </div>
        </div>

        <Card title="Informações gerais">
          <div className={styles.infoGrid}>
            <div>
              <p className={styles.infoLabel}>Imóvel vinculado</p>
              <p className={styles.infoValue}>
                {property ? (
                  <a href={`/painel/imoveis/${property.id}`} className={styles.infoLink}>{property.name}</a>
                ) : "—"}
              </p>
            </div>
            <div>
              <p className={styles.infoLabel}>Responsável</p>
              <p className={styles.infoValue}>{responsible?.name || "—"}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Centro de custo</p>
              <p className={styles.infoValue}>{costCenters.find((c) => c.id === project.costCenterId)?.name || "—"}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Orçamento planejado</p>
              <p className={styles.infoValue}>{formatBRL(project.budgetAmount)}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Início</p>
              <p className={styles.infoValue}>{formatDate(project.startsAt)}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Previsão de término</p>
              <p className={styles.infoValue}>{formatDate(project.endsAtPlanned)}</p>
            </div>
          </div>
        </Card>

        <Card title="Saúde da obra" subtitle="Read model de custo e progresso (calculado em tempo real)">
          {healthError ? (
            <Alert tone="danger">{healthError}</Alert>
          ) : !health ? (
            <p className={styles.infoLabel}>Carregando…</p>
          ) : (
            <>
              <div className={styles.infoGrid}>
                <div>
                  <p className={styles.infoLabel}>Orçamento base (baseline)</p>
                  <p className={styles.infoValue}>{formatBRL(health.baselineBudget)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Mudanças aprovadas</p>
                  <p className={styles.infoValue}>{formatBRL(health.approvedChanges)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Custo comprometido</p>
                  <p className={styles.infoValue}>{formatBRL(health.committedCost)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Custo financeiro realizado</p>
                  <p className={styles.infoValue}>{formatBRL(health.actualFinancialCost)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Custo de estoque consumido</p>
                  <p className={styles.infoValue}>{formatBRL(health.consumedInventoryCost)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Previsão para concluir</p>
                  <p className={styles.infoValue}>{formatBRL(health.forecastToComplete)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Custo total projetado</p>
                  <p className={styles.infoValue}>{formatBRL(health.projectedTotalCost)}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Margem projetada</p>
                  <p className={styles.infoValue}>
                    {formatBRL(health.projectedMargin)}
                    {health.marginPct != null ? ` (${health.marginPct}%)` : ""}
                  </p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Atualizado em</p>
                  <p className={styles.infoValue}>{formatDateTime(health.updatedAt)}</p>
                </div>
              </div>
              {health.belowMinMargin ? (
                <div style={{ marginTop: "var(--space-4)" }}>
                  <Alert tone="danger" title="Margem projetada abaixo da regra mínima">
                    Margem projetada atual de {health.marginPct}% está abaixo do mínimo configurado de {health.minMarginPct}%.
                    Revise o custo da obra ou o orçamento com a diretoria.
                  </Alert>
                </div>
              ) : null}
              <div className={styles.infoGrid} style={{ marginTop: "var(--space-4)" }}>
                <div>
                  <p className={styles.infoLabel}>Progresso físico medido</p>
                  <p className={styles.infoValue}>{health.kpis?.physicalProgressPct != null ? `${health.kpis.physicalProgressPct}%` : "—"}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Progresso planejado</p>
                  <p className={styles.infoValue}>{health.kpis?.plannedProgressPct != null ? `${health.kpis.plannedProgressPct}%` : "—"}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Progresso do cronograma</p>
                  <p className={styles.infoValue}>{health.kpis?.scheduleProgressPct != null ? `${health.kpis.scheduleProgressPct}%` : "—"}</p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Situação de prazo</p>
                  <p className={styles.infoValue}>
                    {health.kpis?.isOverdue ? `Atrasada (${health.kpis?.scheduleDelayDays ?? 0} dias)` : "Em dia"}
                  </p>
                </div>
                <div>
                  <p className={styles.infoLabel}>Contas a pagar pendentes</p>
                  <p className={styles.infoValue}>{formatBRL(health.kpis?.payablePendingTotal)}</p>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card title="NAY Obras" subtitle="Resumo determinístico (rule-based) de progresso, custos e riscos — NAY sugere, nunca decide">
          {nayObrasError ? (
            <Alert tone="danger">{nayObrasError}</Alert>
          ) : !nayObras ? (
            <p className={styles.infoLabel}>Carregando…</p>
          ) : (
            <>
              {nayObras.risks?.length ? (
                <div className={styles.rowList} style={{ marginBottom: "var(--space-3)" }}>
                  {nayObras.risks.map((r, i) => (
                    <Alert key={i} tone="warning">{r}</Alert>
                  ))}
                </div>
              ) : (
                <Alert tone="success">Nenhum risco identificado no momento.</Alert>
              )}
              {postObraHealth?.summary?.totalCases > 0 ? (
                <div className={styles.infoGrid} style={{ marginTop: "var(--space-3)" }}>
                  <div>
                    <p className={styles.infoLabel}>Chamados de garantia (total)</p>
                    <p className={styles.infoValue}>{postObraHealth.summary.totalCases}</p>
                  </div>
                  <div>
                    <p className={styles.infoLabel}>Chamados em aberto</p>
                    <p className={styles.infoValue}>{postObraHealth.summary.openCases}</p>
                  </div>
                  <div>
                    <p className={styles.infoLabel}>Tempo médio de atendimento</p>
                    <p className={styles.infoValue}>{postObraHealth.summary.avgResolutionHours != null ? `${postObraHealth.summary.avgResolutionHours}h` : "—"}</p>
                  </div>
                  <div>
                    <p className={styles.infoLabel}>Custo total de garantia</p>
                    <p className={styles.infoValue}>{formatBRL(postObraHealth.summary.totalWarrantyCost)}</p>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Card>

        <Card
          title="Etapas"
          subtitle="Cronograma físico da obra"
          actions={<Button size="sm" variant="secondary" onClick={openStageModal}>
            <Icon name="plus" size={14} /> Nova etapa
          </Button>}
        >
          {stages.length === 0 ? (
            <EmptyState icon="layers" title="Sem etapas" description="Nenhuma etapa cadastrada para esta obra ainda." />
          ) : (
            <div className={styles.rowList}>
              {stages.map((s) => (
                <a key={s.id} href={`/painel/obras/lista/${project.id}/etapas/${s.id}`} className={styles.row}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>{s.sequence}. {s.name}</span>
                    <span className={styles.rowSubtitle}>
                      Planejado {formatPercent(s.plannedPct)} · Medido {formatPercent(s.measuredPct)}
                    </span>
                  </div>
                  <Badge tone={STAGE_STATUS_TONE[s.status]}>{STAGE_STATUS_LABELS[s.status]}</Badge>
                  <button
                    type="button"
                    className={styles.rowEditBtn}
                    aria-label={`Editar etapa ${s.name}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openStageEditModal(s);
                    }}
                  >
                    <Icon name="pencil" size={14} />
                  </button>
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="RDO — Relatório Diário de Obra"
          subtitle={reportsShowAll ? `Todos os ${allReports.length} registros` : "Últimos 5 registros"}
          actions={<Button size="sm" variant="secondary" onClick={openRdoModal}>
            <Icon name="plus" size={14} /> Novo RDO
          </Button>}
        >
          {allReports.length === 0 ? (
            <EmptyState icon="document" title="Sem RDOs" description="Nenhum relatório diário de obra registrado ainda." />
          ) : (
            <div className={styles.rowList}>
              {reports.map((r) => (
                <div key={r.id} className={styles.rowStatic}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>{formatDate(r.reportDate)} · {r.weather}</span>
                    <span className={styles.rowSubtitle}>
                      Efetivo: {r.workforceCount} · {r.occurrences || "Sem ocorrências"}
                    </span>
                    {r.servicesPerformed ? (
                      <span className={styles.rowSubtitle}>Serviços: {r.servicesPerformed}</span>
                    ) : null}
                    {r.evidenceFileIds?.length ? (
                      <span className={styles.rowSubtitle}>{r.evidenceFileIds.length} foto(s) anexada(s)</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={styles.rowEditBtn}
                    aria-label={`Editar RDO de ${formatDate(r.reportDate)}`}
                    onClick={() => openRdoEditModal(r)}
                  >
                    <Icon name="pencil" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {allReports.length > 5 ? (
            <Button size="sm" variant="ghost" onClick={() => setReportsShowAll((v) => !v)}>
              {reportsShowAll ? "Mostrar só os últimos 5" : `Ver todos os ${allReports.length} registros`}
            </Button>
          ) : null}
        </Card>

        <Card
          title="Orçamento"
          subtitle="Linhas de orçamento por categoria"
          actions={
            <div className={styles.quickActions}>
              {!budget ? (
                <Button size="sm" variant="secondary" onClick={handleCreateBudget} loading={creatingBudget}>
                  <Icon name="plus" size={14} /> Criar orçamento agregado
                </Button>
              ) : budget.status === "DRAFT" ? (
                <Button size="sm" variant="primary" onClick={() => setApproveBudgetOpen(true)}>
                  <Icon name="check" size={14} /> Aprovar orçamento
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={openBudgetModal} disabled={budget?.status === "APPROVED"}>
                <Icon name="plus" size={14} /> Nova linha de orçamento
              </Button>
              <Button size="sm" variant="ghost" onClick={openMarginRuleModal}>
                <Icon name="key" size={14} /> Configurar margem mínima
              </Button>
            </div>
          }
        >
          {!activeMarginRule ? (
            // Achado pelo cliente (30/09/2026): o aviso de margem mínima ausente precisa ser
            // mais visível e levar direto pra onde resolver, não só um texto solto.
            <Alert tone="warning" title="Margem mínima não configurada">
              <>
                A aprovação de orçamento desta empresa será recusada até configurar uma margem
                mínima.{" "}
                <Button size="sm" variant="secondary" onClick={openMarginRuleModal} style={{ marginTop: "var(--space-2)" }}>
                  Configurar agora
                </Button>
              </>
            </Alert>
          ) : null}
          {budget ? (
            <div className={styles.rowStatic} style={{ marginBottom: "var(--space-3)" }}>
              <div className={styles.rowInfo}>
                <span className={styles.rowTitle}>Orçamento agregado</span>
                <span className={styles.rowSubtitle}>
                  {budget.status === "APPROVED"
                    ? `Baseline congelada em ${formatBRL(budget.baselineAmount)} — valores das linhas bloqueados (só alteram via Change Order aprovado).`
                    : "Ainda em rascunho — valores das linhas podem ser ajustados livremente até a aprovação."}
                </span>
              </div>
              <Badge tone={BUDGET_STATUS_TONE[budget.status]}>{BUDGET_STATUS_LABELS[budget.status] || budget.status}</Badge>
            </div>
          ) : (
            <Alert tone="info">Esta obra ainda não tem um orçamento agregado — crie um para poder aprovar a baseline e usar Change Orders.</Alert>
          )}
          {budgetLines.length === 0 ? (
            <EmptyState icon="money" title="Sem linhas de orçamento" description="Nenhuma linha de orçamento cadastrada para esta obra." />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Planejado</th>
                    <th>Realizado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {budgetLines.map((b) => (
                    <tr key={b.id}>
                      <td>{b.category}</td>
                      <td>{b.description || "—"}</td>
                      <td>
                        {formatBRL(b.plannedAmount)}
                        {budget?.status === "APPROVED" && b.budgetId === budget.id ? (
                          <Icon name="key" size={12} style={{ marginLeft: "var(--space-1)" }} />
                        ) : null}
                      </td>
                      <td>{formatBRL(b.actualAmount)}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.rowEditBtn}
                          aria-label={`Editar linha ${b.category}`}
                          onClick={() => openBudgetLineEditModal(b)}
                        >
                          <Icon name="pencil" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td><strong>{formatBRL(totalPlanned)}</strong></td>
                    <td><strong>{formatBRL(totalActual)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Change Orders"
          subtitle="Mudanças de escopo/prazo/custo — só alteram a baseline aprovada quando decididas"
          actions={
            <Button size="sm" variant="secondary" onClick={openChangeOrderModal} disabled={!budget}>
              <Icon name="plus" size={14} /> Novo Change Order
            </Button>
          }
        >
          {!budget ? (
            <EmptyState icon="document" title="Sem orçamento" description="Crie o orçamento agregado da obra antes de registrar Change Orders." />
          ) : changeOrders.length === 0 ? (
            <EmptyState icon="document" title="Sem Change Orders" description="Nenhum Change Order registrado para esta obra." />
          ) : (
            <div className={styles.rowList}>
              {changeOrders.map((co) => (
                <div key={co.id} className={styles.rowStatic}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>
                      {CHANGE_ORDER_REASON_LABELS[co.reasonCode] || co.reasonCode} · {formatBRL(co.budgetImpact)}
                      {co.scheduleImpactDays ? ` · ${co.scheduleImpactDays} dia(s) de prazo` : ""}
                    </span>
                    <span className={styles.rowSubtitle}>{co.description}</span>
                    {co.evidenceFileIds?.length ? (
                      <span className={styles.rowSubtitle}>{co.evidenceFileIds.length} evidência(s) anexada(s)</span>
                    ) : null}
                  </div>
                  <div className={styles.rowRight}>
                    <Badge tone={CHANGE_ORDER_STATUS_TONE[co.status]}>{CHANGE_ORDER_STATUS_LABELS[co.status] || co.status}</Badge>
                    {co.status === "PENDING_APPROVAL" ? (
                      <div className={styles.quickActions}>
                        <Button size="sm" variant="secondary" onClick={() => handleDecideChangeOrder(co, "APPROVE")} loading={decidingCoId === co.id}>Aprovar</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDecideChangeOrder(co, "REJECT")} loading={decidingCoId === co.id}>Rejeitar</Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Qualidade"
          subtitle="Checklist de qualidade"
          actions={<Button size="sm" variant="secondary" onClick={openQualityModal}>
            <Icon name="plus" size={14} /> Novo item de checklist
          </Button>}
        >
          {qualityItems.length === 0 ? (
            <EmptyState icon="check" title="Sem itens de checklist" description="Nenhum item de qualidade cadastrado para esta obra." />
          ) : (
            <div className={styles.rowList}>
              {qualityItems.map((q) => {
                const checkedBy = q.checkedByUserId ? users.find((u) => u.id === q.checkedByUserId) : null;
                return (
                  <div key={q.id} className={styles.rowStatic}>
                    <div className={styles.rowInfo}>
                      <span className={styles.rowTitle}>{q.item}</span>
                      <span className={styles.rowSubtitle}>
                        {checkedBy ? `Verificado por ${checkedBy.name}` : "Ainda não verificado"}
                      </span>
                      {/* FIX (2ª varredura final do Front do Marco 6, 30/09/2026): o motivo
                          digitado ao marcar "Não OK" era salvo (checkQualityItem já grava
                          "notes"), mas nunca era exibido em lugar nenhum — ficava impossível
                          saber por que um item foi reprovado depois que o modal fechava. */}
                      {q.status === "NOT_OK" && q.notes ? (
                        <span className={styles.rejectionReason}>Motivo: {q.notes}</span>
                      ) : null}
                    </div>
                    <div className={styles.rowRight}>
                      <Badge tone={QUALITY_STATUS_TONE[q.status]}>{QUALITY_STATUS_LABELS[q.status]}</Badge>
                      {/* FIX (auditoria E2E de browser, ciclo 3, 02/10/2026): os botões
                          OK/Não OK só apareciam com status PENDING — depois do primeiro
                          veredito não havia NENHUMA forma de corrigir um engano (ex.: marcar
                          "OK" sem querer). checkQualityItem no backend já aceita re-verificar
                          livremente (sem trava de status atual), então a UI é quem artificialmente
                          travava — agora os botões sempre aparecem, com rótulo "Revisar" quando
                          já verificado. */}
                      <div className={styles.quickActions}>
                        <Button
                          size="sm"
                          variant={q.status === "OK" ? "ghost" : "secondary"}
                          loading={qualityBusyId === q.id}
                          disabled={qualityBusyId === q.id || q.status === "OK"}
                          onClick={() => handleQualityQuickAction(q, "OK")}
                        >
                          {q.status === "PENDING" ? "OK" : "Marcar OK"}
                        </Button>
                        <Button
                          size="sm"
                          variant={q.status === "NOT_OK" ? "ghost" : "danger"}
                          disabled={qualityBusyId === q.id || q.status === "NOT_OK"}
                          onClick={() => {
                            setQualityRejecting(q);
                            setQualityRejectNotes("");
                          }}
                        >
                          {q.status === "PENDING" ? "Não OK" : "Marcar não conforme"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="Requisições de material"
          subtitle="Materiais solicitados para a obra"
          actions={<Button size="sm" variant="secondary" onClick={openMaterialModal}>
            <Icon name="plus" size={14} /> Nova requisição
          </Button>}
        >
          {materialRequests.length === 0 ? (
            <EmptyState icon="arrowDownCircle" title="Sem requisições" description="Nenhuma requisição de material registrada para esta obra." />
          ) : (
            <div className={styles.rowList}>
              {materialRequests.map((m) => (
                <div key={m.id} className={styles.rowStatic}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>{m.description}</span>
                    <span className={styles.rowSubtitle}>
                      {formatQuantity(m.quantity)} {m.unit}
                      {m.status === "RECEIVED" && m.receivedAt ? ` · Recebido em ${formatDate(m.receivedAt)}` : ""}
                    </span>
                  </div>
                  <div className={styles.rowRight}>
                    <Badge tone={MATERIAL_REQUEST_STATUS_TONE[m.status]}>{MATERIAL_REQUEST_STATUS_LABELS[m.status] || m.status}</Badge>
                    {m.status === "REQUESTED" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReceiveMaterialRequest(m)}
                        loading={receivingMaterialId === m.id}
                        disabled={receivingMaterialId !== null && receivingMaterialId !== m.id}
                      >
                        Marcar como recebido
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Perda e devolução de material"
          subtitle="Registro de perda/quebra com alçada de aprovação por valor"
          actions={
            <div className={styles.quickActions}>
              <Button size="sm" variant="ghost" onClick={openThresholdModal}>
                <Icon name="key" size={14} /> Configurar alçada
              </Button>
              <Button size="sm" variant="secondary" onClick={openLossModal}>
                <Icon name="plus" size={14} /> Registrar perda
              </Button>
            </div>
          }
        >
          {lossRecords.length === 0 ? (
            <EmptyState icon="ban" title="Sem registros" description="Nenhuma perda de material registrada para esta obra." />
          ) : (
            <div className={styles.rowList}>
              {lossRecords.map((l) => (
                <div key={l.id} className={styles.rowStatic}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>
                      {LOSS_RECORD_MOVEMENT_LABELS[l.movementType] || l.movementType} · {l.materialDescription}
                    </span>
                    <span className={styles.rowSubtitle}>
                      {formatQuantity(l.quantity)} un. · {formatBRL(l.estimatedValue)} · {l.reason}
                    </span>
                  </div>
                  <div className={styles.rowRight}>
                    <Badge tone={LOSS_RECORD_STATUS_TONE[l.status]}>{LOSS_RECORD_STATUS_LABELS[l.status] || l.status}</Badge>
                    {l.movementType === "LOSS" && l.status === "PENDING_APPROVAL" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleApproveLossRecord(l)}
                        loading={lossBusyId === l.id}
                        disabled={lossBusyId !== null && lossBusyId !== l.id}
                      >
                        Aprovar
                      </Button>
                    ) : null}
                    {l.movementType === "LOSS" && l.status === "APPROVED" && !isLossFullyReturned(l, lossRecords) ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReturnLossRecord(l)}
                        loading={lossBusyId === l.id}
                        disabled={lossBusyId !== null && lossBusyId !== l.id}
                      >
                        Registrar devolução
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div id="nao-conformidades">
        <Card
          title="Não Conformidades"
          subtitle="Ocorrências de qualidade/segurança em aberto ou fechadas"
          actions={<Button size="sm" variant="secondary" onClick={openNcModal}>
            <Icon name="plus" size={14} /> Nova não conformidade
          </Button>}
        >
          {nonconformities.length === 0 ? (
            <EmptyState icon="shield" title="Sem não conformidades" description="Nenhuma não conformidade registrada para esta obra." />
          ) : (
            <div className={styles.rowList}>
              {nonconformities.map((nc) => {
                const respUser = nc.responsibleUserId ? users.find((u) => u.id === nc.responsibleUserId) : null;
                return (
                  <div key={nc.id} className={styles.rowStatic}>
                    <div className={styles.rowInfo}>
                      <span className={styles.rowTitle}>{nc.description}</span>
                      <span className={styles.rowSubtitle}>
                        {respUser ? `Responsável: ${respUser.name}` : "Sem responsável definido"}
                        {nc.slaDueAt ? ` · Prazo: ${formatDate(nc.slaDueAt)}` : ""}
                        {nc.requiresAcceptance ? " · Exige aceite para fechar" : ""}
                      </span>
                    </div>
                    <div className={styles.rowRight}>
                      <Badge tone={NONCONFORMITY_SEVERITY_TONE[nc.severity]}>{NONCONFORMITY_SEVERITY_LABELS[nc.severity] || nc.severity}</Badge>
                      <Badge tone={NONCONFORMITY_STATUS_TONE[nc.status]}>{NONCONFORMITY_STATUS_LABELS[nc.status] || nc.status}</Badge>
                      {nc.status === "OPEN" ? (
                        <Button size="sm" variant="secondary" onClick={() => openCloseNcModal(nc)}>
                          Fechar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar obra"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} loading={savingEdit} disabled={!editForm.name.trim() || editDateErrors.startsAt || editDateErrors.endsAtPlanned}>Salvar alterações</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Nome da obra" htmlFor="e-name" required>
              <Input id="e-name" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Imóvel vinculado" htmlFor="e-property" helper="Opcional">
            <Select id="e-property" value={editForm.propertyId} onChange={(e) => setEditForm((p) => ({ ...p, propertyId: e.target.value }))}>
              <option value="">Nenhum</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Responsável" htmlFor="e-responsible" helper="Opcional">
            <Select id="e-responsible" value={editForm.responsibleUserId} onChange={(e) => setEditForm((p) => ({ ...p, responsibleUserId: e.target.value }))}>
              <option value="">Sem responsável</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Centro de custo" htmlFor="e-cost-center" helper="Opcional — usado no relatório de margem por obra">
            <Select id="e-cost-center" value={editForm.costCenterId} onChange={(e) => setEditForm((p) => ({ ...p, costCenterId: e.target.value }))}>
              <option value="">Nenhum</option>
              {costCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Orçamento (R$)"
            htmlFor="e-budget"
            helper={budget?.status === "APPROVED" ? "Baseline já aprovada — valor só muda via Change Order." : "Opcional"}
          >
            <DecimalInput
              id="e-budget"
              value={editForm.budgetAmount}
              onChange={(e) => setEditForm((p) => ({ ...p, budgetAmount: e.target.value }))}
              disabled={budget?.status === "APPROVED"}
            />
          </FormField>
          <FormField
            label="Início"
            htmlFor="e-starts"
            helper={editDateErrors.startsAt ? undefined : "Opcional"}
            error={editDateErrors.startsAt ? DATE_INPUT_ERROR_MESSAGE : undefined}
          >
            <Input
              id="e-starts"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              error={editDateErrors.startsAt}
              value={editForm.startsAt}
              onChange={(e) => {
                setEditDateErrors((p) => ({ ...p, startsAt: isDateInputInvalid(e.target.validity) }));
                setEditForm((p) => ({ ...p, startsAt: e.target.value }));
              }}
              onBlur={(e) => setEditDateErrors((p) => ({ ...p, startsAt: isDateInputInvalid(e.target.validity) }))}
            />
          </FormField>
          <FormField
            label="Previsão de término"
            htmlFor="e-ends"
            helper={editDateErrors.endsAtPlanned ? undefined : "Opcional"}
            error={editDateErrors.endsAtPlanned ? DATE_INPUT_ERROR_MESSAGE : undefined}
          >
            <Input
              id="e-ends"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              error={editDateErrors.endsAtPlanned}
              value={editForm.endsAtPlanned}
              onChange={(e) => {
                setEditDateErrors((p) => ({ ...p, endsAtPlanned: isDateInputInvalid(e.target.validity) }));
                setEditForm((p) => ({ ...p, endsAtPlanned: e.target.value }));
              }}
              onBlur={(e) => setEditDateErrors((p) => ({ ...p, endsAtPlanned: isDateInputInvalid(e.target.validity) }))}
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir obra"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={busy}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir a obra <strong>{project.name}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>

      <Modal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        title="Cancelar obra"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelConfirmOpen(false)}>Voltar</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                await handleAdvanceStatus("CANCELLED");
                setCancelConfirmOpen(false);
              }}
            >
              Cancelar obra
            </Button>
          </>
        }
      >
        <p>Tem certeza que deseja cancelar a obra <strong>{project.name}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>

      <Modal
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        title={editingStageId ? "Editar etapa" : "Nova etapa"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStageOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveStage} loading={savingStage} disabled={!stageForm.name.trim() || stageForm.sequence === ""}>{editingStageId ? "Salvar alterações" : "Criar etapa"}</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Nome da etapa" htmlFor="m-stage-name" required>
              <Input id="m-stage-name" value={stageForm.name} onChange={(e) => setStageForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Fundação e estrutura" />
            </FormField>
          </div>
          <FormField label="Sequência" htmlFor="m-stage-seq" required>
            <Input id="m-stage-seq" type="number" min="1" value={stageForm.sequence} onChange={(e) => setStageForm((p) => ({ ...p, sequence: e.target.value }))} />
          </FormField>
          <FormField label="Percentual planejado (%)" htmlFor="m-stage-pct" helper="Opcional">
            <DecimalInput id="m-stage-pct" value={stageForm.plannedPct} onChange={(e) => setStageForm((p) => ({ ...p, plannedPct: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={thresholdOpen}
        onClose={() => setThresholdOpen(false)}
        title="Configurar alçada de aprovação"
        footer={
          <>
            <Button variant="secondary" onClick={() => setThresholdOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveThreshold} loading={savingThreshold} disabled={isInvalidNumber(thresholdAmount)}>Salvar</Button>
          </>
        }
      >
        <FormField
          label="Valor máximo de auto-aprovação (R$)"
          htmlFor="m-threshold-amount"
          required
          helper="Perdas de material com valor estimado até este limite são aprovadas automaticamente; acima, exigem aprovação explícita. Configuração válida para toda a empresa (padrão: R$ 1.000,00)."
        >
          <DecimalInput
            id="m-threshold-amount"
            value={thresholdAmount}
            onChange={(e) => setThresholdAmount(e.target.value)}
            placeholder="1000,00"
          />
        </FormField>
      </Modal>

      <Modal
        open={marginRuleOpen}
        onClose={() => setMarginRuleOpen(false)}
        title="Configurar margem mínima"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMarginRuleOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMarginRule} loading={savingMarginRule} disabled={marginRulePct === "" || Number.isNaN(toNumber(marginRulePct)) || toNumber(marginRulePct) < 0 || toNumber(marginRulePct) > 100}>Salvar</Button>
          </>
        }
      >
        {marginRuleError ? <Alert tone="danger">{marginRuleError}</Alert> : null}
        <FormField
          label="Margem mínima exigida (%)"
          htmlFor="m-margin-pct"
          required
          helper="É obrigatório ter uma margem mínima configurada para aprovar qualquer orçamento. Depois de aprovado, a Saúde da obra compara a margem projetada (receita - custo) com este percentual e avisa quando estiver abaixo — não bloqueia a aprovação em si, pois o custo real só é conhecido durante a execução da obra. Salvar cria uma nova versão — a versão anterior fica preservada no histórico, sem afetar orçamentos já aprovados com ela. Configuração válida para toda a empresa."
        >
          <DecimalInput
            id="m-margin-pct"
            value={marginRulePct}
            onChange={(e) => setMarginRulePct(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="10,00"
          />
        </FormField>
      </Modal>

      <Modal
        open={rdoOpen}
        onClose={() => setRdoOpen(false)}
        title={editingRdoId ? "Editar RDO" : "Novo RDO"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRdoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRdo} loading={savingRdo} disabled={!rdoForm.reportDate || rdoDateInvalid || !rdoForm.weather || rdoForm.workforceCount === ""}>{editingRdoId ? "Salvar alterações" : "Registrar RDO"}</Button>
          </>
        }
      >
        {/* FIX (2ª varredura final do Front do Marco 6, 30/09/2026): erro de submissão (ex.: 409
            "já existe um RDO para esta obra nesta data e turno") só aparecia no Alert do topo da
            página, fora da área visível de quem está com o modal aberto — o usuário não recebia
            NENHUM feedback de que o registro falhou. Duplica o erro aqui dentro do modal. */}
        {rdoOpen && actionError ? <Alert tone="danger">{actionError}</Alert> : null}
        <div className={styles.formGrid}>
          <FormField label="Data" htmlFor="m-rdo-date" required error={rdoDateInvalid ? DATE_INPUT_ERROR_MESSAGE : undefined}>
            <Input
              id="m-rdo-date"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              error={rdoDateInvalid}
              value={rdoForm.reportDate}
              onChange={(e) => {
                setRdoDateInvalid(isDateInputInvalid(e.target.validity));
                setRdoForm((p) => ({ ...p, reportDate: e.target.value }));
              }}
              onBlur={(e) => setRdoDateInvalid(isDateInputInvalid(e.target.validity))}
            />
          </FormField>
          <FormField label="Clima" htmlFor="m-rdo-weather" required>
            <Select id="m-rdo-weather" value={rdoForm.weather} onChange={(e) => setRdoForm((p) => ({ ...p, weather: e.target.value }))}>
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Efetivo (nº de trabalhadores)" htmlFor="m-rdo-workforce" required>
            <Input id="m-rdo-workforce" type="number" min="0" value={rdoForm.workforceCount} onChange={(e) => setRdoForm((p) => ({ ...p, workforceCount: e.target.value }))} />
          </FormField>
          <div className={styles.span2}>
            <FormField label="Ocorrências" htmlFor="m-rdo-occurrences" helper="Opcional">
              <textarea
                id="m-rdo-occurrences"
                className={styles.textarea}
                rows={3}
                value={rdoForm.occurrences}
                onChange={(e) => setRdoForm((p) => ({ ...p, occurrences: e.target.value }))}
              />
            </FormField>
          </div>
          <div className={styles.span2}>
            <FormField label="Serviços executados" htmlFor="m-rdo-services" helper="Opcional">
              <textarea
                id="m-rdo-services"
                className={styles.textarea}
                rows={3}
                value={rdoForm.servicesPerformed}
                onChange={(e) => setRdoForm((p) => ({ ...p, servicesPerformed: e.target.value }))}
                placeholder="Ex: Concretagem da laje do 2º pavimento, instalação elétrica do térreo"
              />
            </FormField>
          </div>
          <div className={styles.span2}>
            <FormField label="Fotos do dia" htmlFor="m-rdo-evidence">
              <FileDropInput
                id="m-rdo-evidence"
                accept="image/*"
                multiple
                uploading={rdoUploading}
                error={rdoUploadError || undefined}
                fileNames={rdoEvidenceFileNames}
                onFiles={handleUploadRdoEvidence}
                onRemove={removeRdoEvidence}
                helper="Opcional — evidência fotográfica do andamento da obra"
              />
            </FormField>
          </div>
          <div className={styles.span2}>
            <FormField
              label="Equipe do dia"
              htmlFor="m-rdo-workers"
              helper="Opcional — prestador/trabalhador do dia, com documentação correspondente"
            >
              <div className={styles.rowList}>
                {rdoWorkers.map((w, i) => (
                  <div key={i} className={styles.rowStatic} style={{ flexWrap: "wrap", gap: "var(--space-2)" }}>
                    <Select
                      value={w.personId}
                      onChange={(e) => updateRdoWorker(i, "personId", e.target.value)}
                      aria-label={`Pessoa do trabalhador ${i + 1}`}
                    >
                      <option value="">Selecione a pessoa...</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>{p.legalName}</option>
                      ))}
                    </Select>
                    <Input
                      value={w.role}
                      onChange={(e) => updateRdoWorker(i, "role", e.target.value)}
                      placeholder="Função (ex: Pedreiro)"
                      aria-label={`Função do trabalhador ${i + 1}`}
                    />
                    <div style={{ minWidth: "220px", flex: 1 }}>
                      <FileDropInput
                        id={`m-rdo-worker-doc-${i}`}
                        accept="image/*,application/pdf"
                        uploading={workerUploadingIndex === i}
                        fileNames={(w.documentFileIds || []).map((_, docIndex) => `Documento ${docIndex + 1}`)}
                        onFiles={(files) => handleUploadWorkerDocument(i, files[0])}
                      />
                    </div>
                    <button type="button" className={styles.rowEditBtn} aria-label={`Remover trabalhador ${i + 1}`} onClick={() => removeRdoWorker(i)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {workerUploadError ? <Alert tone="danger">{workerUploadError}</Alert> : null}
              <Button size="sm" variant="ghost" onClick={addRdoWorker} style={{ marginTop: "var(--space-2)" }}>
                <Icon name="plus" size={14} /> Adicionar trabalhador
              </Button>
            </FormField>
          </div>
          <div className={styles.span2}>
            <FormField label="Materiais do dia" htmlFor="m-rdo-materials" helper="Opcional">
              <div className={styles.rowList}>
                {rdoMaterials.map((m, i) => (
                  <div key={i} className={styles.rowStatic} style={{ flexWrap: "wrap", gap: "var(--space-2)" }}>
                    <Input
                      value={m.materialDescription}
                      onChange={(e) => updateRdoMaterial(i, "materialDescription", e.target.value)}
                      placeholder="Material (ex: Cimento CP-II)"
                      aria-label={`Descrição do material ${i + 1}`}
                    />
                    <DecimalInput
                      value={m.quantity}
                      onChange={(e) => updateRdoMaterial(i, "quantity", e.target.value)}
                      placeholder="Qtd"
                      aria-label={`Quantidade do material ${i + 1}`}
                      style={{ maxWidth: "100px" }}
                    />
                    <Input
                      value={m.unit}
                      onChange={(e) => updateRdoMaterial(i, "unit", e.target.value)}
                      placeholder="Unidade (ex: SC)"
                      aria-label={`Unidade do material ${i + 1}`}
                      style={{ maxWidth: "120px" }}
                    />
                    <button type="button" className={styles.rowEditBtn} aria-label={`Remover material ${i + 1}`} onClick={() => removeRdoMaterial(i)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="ghost" onClick={addRdoMaterial} style={{ marginTop: "var(--space-2)" }}>
                <Icon name="plus" size={14} /> Adicionar material
              </Button>
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title={editingBudgetLineId ? "Editar linha de orçamento" : "Nova linha de orçamento"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBudgetOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateBudgetLine} loading={savingBudget} disabled={!budgetForm.category.trim() || isInvalidNumber(budgetForm.plannedAmount, { allowZero: true })}>{editingBudgetLineId ? "Salvar alterações" : "Criar linha"}</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <FormField label="Categoria" htmlFor="m-budget-category" required>
            <Input id="m-budget-category" value={budgetForm.category} onChange={(e) => setBudgetForm((p) => ({ ...p, category: e.target.value }))} placeholder="Ex: Fundação e estrutura" />
          </FormField>
          <FormField
            label="Valor planejado (R$)"
            htmlFor="m-budget-planned"
            required
            helper={editingBudgetLineId && budget?.status === "APPROVED" ? "Baseline já aprovada — valor só muda via Change Order." : undefined}
          >
            <DecimalInput
              id="m-budget-planned"
              value={budgetForm.plannedAmount}
              onChange={(e) => setBudgetForm((p) => ({ ...p, plannedAmount: e.target.value }))}
              placeholder="0,00"
              disabled={editingBudgetLineId != null && budget?.status === "APPROVED"}
            />
          </FormField>
          <div className={styles.span2}>
            <FormField label="Descrição" htmlFor="m-budget-description" helper="Opcional">
              <Input id="m-budget-description" value={budgetForm.description} onChange={(e) => setBudgetForm((p) => ({ ...p, description: e.target.value }))} placeholder="Detalhes da linha de orçamento" />
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={approveBudgetOpen}
        onClose={() => setApproveBudgetOpen(false)}
        title="Aprovar orçamento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveBudgetOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleApproveBudget} loading={approvingBudget} disabled={!activeMarginRule}>Confirmar aprovação</Button>
          </>
        }
      >
        {!activeMarginRule ? (
          <Alert tone="warning" title="Margem mínima não configurada">
            <>
              Esta empresa ainda não tem uma margem mínima configurada — a aprovação será
              recusada até isso ser feito.{" "}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setApproveBudgetOpen(false); openMarginRuleModal(); }}
                style={{ marginTop: "var(--space-2)" }}
              >
                Configurar agora
              </Button>
            </>
          </Alert>
        ) : (
          <p>
            Tem certeza que deseja aprovar este orçamento? A baseline será <strong>congelada</strong> em{" "}
            <strong>{formatBRL(totalPlanned)}</strong> e passa a ser <strong>imutável</strong> — depois disso, o valor
            das linhas de orçamento só pode mudar através de um Change Order aprovado. Esta ação não pode ser desfeita.
          </p>
        )}
      </Modal>

      <Modal
        open={coOpen}
        onClose={() => setCoOpen(false)}
        title="Novo Change Order"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCoOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateChangeOrder} loading={savingCo} disabled={!isChangeOrderValid}>Criar Change Order</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <FormField label="Motivo" htmlFor="m-co-reason" required>
            <Select id="m-co-reason" value={coForm.reasonCode} onChange={(e) => setCoForm((p) => ({ ...p, reasonCode: e.target.value }))}>
              <option value="">Selecione…</option>
              {Object.entries(CHANGE_ORDER_REASON_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Impacto financeiro (R$)" htmlFor="m-co-impact" required helper="Positivo aumenta o orçamento, negativo reduz">
            <DecimalInput id="m-co-impact" value={coForm.budgetImpact} onChange={(e) => setCoForm((p) => ({ ...p, budgetImpact: e.target.value }))} placeholder="0,00" />
          </FormField>
          <FormField label="Impacto de prazo (dias)" htmlFor="m-co-schedule" helper="Opcional">
            <Input id="m-co-schedule" type="number" value={coForm.scheduleImpactDays} onChange={(e) => setCoForm((p) => ({ ...p, scheduleImpactDays: e.target.value }))} placeholder="0" />
          </FormField>
          <div className={styles.span2}>
            <FormField label="Descrição" htmlFor="m-co-description" required>
              <textarea
                id="m-co-description"
                className={styles.textarea}
                rows={3}
                value={coForm.description}
                onChange={(e) => setCoForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Detalhe a mudança de escopo/condição que motiva este Change Order"
              />
            </FormField>
          </div>
          <div className={styles.span2}>
            <FormField label="Evidência" htmlFor="m-co-file">
              <FileDropInput
                id="m-co-file"
                fileNames={coForm.file ? [coForm.file.name] : []}
                onFiles={(files) => setCoForm((p) => ({ ...p, file: files[0] || null }))}
                onRemove={() => setCoForm((p) => ({ ...p, file: null }))}
                helper="Opcional — foto, documento ou planilha que sustente o pedido"
              />
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={qualityOpen}
        onClose={() => setQualityOpen(false)}
        title="Novo item de checklist"
        footer={
          <>
            <Button variant="secondary" onClick={() => setQualityOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateQualityItem} loading={savingQuality} disabled={!qualityForm.item.trim()}>Criar item</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Descrição do item" htmlFor="m-quality-item" required>
              <Input id="m-quality-item" value={qualityForm.item} onChange={(e) => setQualityForm((p) => ({ ...p, item: e.target.value }))} placeholder="Ex: Verificar prumo e nível da fundação" />
            </FormField>
          </div>
          <FormField label="Etapa vinculada" htmlFor="m-quality-stage" helper="Opcional">
            <Select id="m-quality-stage" value={qualityForm.projectStageId} onChange={(e) => setQualityForm((p) => ({ ...p, projectStageId: e.target.value }))}>
              <option value="">Obra toda</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.sequence}. {s.name}</option>
              ))}
            </Select>
          </FormField>
        </div>
      </Modal>

      <Modal
        open={!!qualityRejecting}
        onClose={() => {
          setQualityRejecting(null);
          setQualityRejectNotes("");
        }}
        title="Marcar item como Não OK"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setQualityRejecting(null); setQualityRejectNotes(""); }}>Cancelar</Button>
            <Button
              variant="danger"
              loading={qualityBusyId === qualityRejecting?.id}
              disabled={!qualityRejectNotes.trim()}
              onClick={() => handleQualityQuickAction(qualityRejecting, "NOT_OK", qualityRejectNotes.trim())}
            >
              Confirmar Não OK
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Motivo / observação" htmlFor="m-quality-reject-notes" required helper="Obrigatório — explique o que foi encontrado para registrar no histórico do item.">
              <textarea
                id="m-quality-reject-notes"
                className={styles.textarea}
                value={qualityRejectNotes}
                onChange={(e) => setQualityRejectNotes(e.target.value)}
                placeholder="Ex: infiltração visível na parede leste, precisa de correção antes de prosseguir"
                rows={4}
              />
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={materialOpen}
        onClose={() => setMaterialOpen(false)}
        title="Nova requisição de material"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMaterialOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateMaterialRequest}
              loading={savingMaterial}
              disabled={!materialForm.description.trim() || isInvalidNumber(materialForm.quantity) || !materialForm.unit.trim()}
            >
              Criar requisição
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Descrição do material" htmlFor="m-material-description" required>
              <Input id="m-material-description" value={materialForm.description} onChange={(e) => setMaterialForm((p) => ({ ...p, description: e.target.value }))} placeholder="Ex: Cimento CP-II 50kg" />
            </FormField>
          </div>
          <FormField label="Quantidade" htmlFor="m-material-quantity" required>
            <DecimalInput id="m-material-quantity" value={materialForm.quantity} onChange={(e) => setMaterialForm((p) => ({ ...p, quantity: e.target.value }))} />
          </FormField>
          <FormField label="Unidade" htmlFor="m-material-unit" required>
            <Input id="m-material-unit" value={materialForm.unit} onChange={(e) => setMaterialForm((p) => ({ ...p, unit: e.target.value }))} placeholder="Ex: un, kg, m2, saco" />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={lossOpen}
        onClose={() => setLossOpen(false)}
        title="Registrar perda de material"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLossOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateLossRecord}
              loading={savingLoss}
              disabled={!lossForm.materialDescription.trim() || isInvalidNumber(lossForm.quantity) || isInvalidNumber(lossForm.estimatedValue, { allowZero: true }) || !lossForm.reason.trim()}
            >
              Registrar perda
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Material" htmlFor="m-loss-description" required>
              <Input id="m-loss-description" value={lossForm.materialDescription} onChange={(e) => setLossForm((p) => ({ ...p, materialDescription: e.target.value }))} placeholder="Ex: Telha cerâmica" />
            </FormField>
          </div>
          <FormField label="Quantidade" htmlFor="m-loss-quantity" required>
            <DecimalInput id="m-loss-quantity" value={lossForm.quantity} onChange={(e) => setLossForm((p) => ({ ...p, quantity: e.target.value }))} />
          </FormField>
          <FormField label="Valor estimado (R$)" htmlFor="m-loss-value" required>
            <DecimalInput id="m-loss-value" value={lossForm.estimatedValue} onChange={(e) => setLossForm((p) => ({ ...p, estimatedValue: e.target.value }))} />
          </FormField>
          <div className={styles.span2}>
            <FormField label="Motivo" htmlFor="m-loss-reason" required helper="Acima do limite de alçada configurado, a perda nasce aguardando aprovação; abaixo, é autoaprovada.">
              <Input id="m-loss-reason" value={lossForm.reason} onChange={(e) => setLossForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Ex: quebra no transporte" />
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={ncOpen}
        onClose={() => setNcOpen(false)}
        title="Nova não conformidade"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNcOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateNonconformity} loading={savingNc} disabled={!ncForm.description.trim()}>
              Registrar
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Descrição" htmlFor="m-nc-description" required>
              <textarea
                id="m-nc-description"
                className={styles.textarea}
                rows={3}
                value={ncForm.description}
                onChange={(e) => setNcForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Descreva a não conformidade encontrada"
              />
            </FormField>
          </div>
          <FormField label="Severidade" htmlFor="m-nc-severity" required>
            <Select id="m-nc-severity" value={ncForm.severity} onChange={(e) => setNcForm((p) => ({ ...p, severity: e.target.value }))}>
              {Object.entries(NONCONFORMITY_SEVERITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Responsável" htmlFor="m-nc-responsible" helper="Opcional">
            <Select id="m-nc-responsible" value={ncForm.responsibleUserId} onChange={(e) => setNcForm((p) => ({ ...p, responsibleUserId: e.target.value }))}>
              <option value="">Sem responsável</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Prazo (SLA)" htmlFor="m-nc-sla" helper="Opcional">
            <Input
              id="m-nc-sla"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              value={ncForm.slaDueAt}
              onChange={(e) => setNcForm((p) => ({ ...p, slaDueAt: e.target.value }))}
            />
          </FormField>
          <FormField label="Exige aceite para fechar?" htmlFor="m-nc-requires-acceptance">
            <Select
              id="m-nc-requires-acceptance"
              value={ncForm.requiresAcceptance ? "yes" : "no"}
              onChange={(e) => setNcForm((p) => ({ ...p, requiresAcceptance: e.target.value === "yes" }))}
            >
              <option value="no">Não</option>
              <option value="yes">Sim</option>
            </Select>
          </FormField>
          <div className={styles.span2}>
            <FormField label="Evidência 'antes'" htmlFor="m-nc-before-file">
              <FileDropInput
                id="m-nc-before-file"
                accept="image/*,application/pdf"
                uploading={ncBeforeUploading}
                error={ncBeforeUploadError || undefined}
                fileNames={ncForm.beforeFileName ? [ncForm.beforeFileName] : []}
                onFiles={(files) => handleUploadBeforeEvidence(files[0])}
                onRemove={() => setNcForm((p) => ({ ...p, beforeFileId: "", beforeFileName: "" }))}
                helper="Foto do problema encontrado (opcional)."
              />
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(closingNc)}
        onClose={() => setClosingNc(null)}
        title="Fechar não conformidade"
        footer={
          <>
            <Button variant="secondary" onClick={() => setClosingNc(null)}>Cancelar</Button>
            <Button
              onClick={handleCloseNonconformity}
              loading={savingNcClose}
              disabled={!ncAfterFileId || (closingNc?.requiresAcceptance && !ncAcceptedByUserId)}
            >
              Confirmar fechamento
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <Alert tone="warning">
              Para fechar esta não conformidade é obrigatório enviar uma evidência "depois" —
              o botão de confirmar só habilita depois do envio ser concluído com sucesso.
            </Alert>
          </div>
          <div className={styles.span2}>
            <FormField label="Evidência 'depois'" htmlFor="m-nc-after-file" required>
              <FileDropInput
                id="m-nc-after-file"
                accept="image/*,application/pdf"
                uploading={ncAfterUploading}
                error={ncAfterUploadError || undefined}
                fileNames={ncAfterFileName ? [ncAfterFileName] : []}
                onFiles={(files) => handleUploadAfterEvidence(files[0])}
                onRemove={() => { setNcAfterFileId(""); setNcAfterFileName(""); }}
                helper="Foto comprovando a correção do problema — obrigatório."
              />
            </FormField>
          </div>
          {closingNc?.requiresAcceptance ? (
            <div className={styles.span2}>
              <FormField label="Aceite por" htmlFor="m-nc-accepted-by" helper="Esta NC exige aceite — obrigatório para fechar." required>
                <Select id="m-nc-accepted-by" value={ncAcceptedByUserId} onChange={(e) => setNcAcceptedByUserId(e.target.value)}>
                  <option value="">Selecione quem aceitou</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </FormField>
            </div>
          ) : null}
        </div>
      </Modal>
    </AppShell>
  );
}
