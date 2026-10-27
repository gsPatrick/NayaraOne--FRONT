"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Tabs from "@/components/molecules/Tabs/Tabs";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import {
  listInvoiceRequests,
  checkInvoiceStatus,
  cancelInvoice,
  listDimobBatches,
  generateDimobBatch,
  closeDimobBatch,
  listFiscalReconciliations,
  resolveFiscalReconciliation,
  runFiscalReconciliations,
  listDimobRecords,
  listExportCandidates,
  createExportBatch,
  listExportBatches,
  getExportBatch,
  adjustExportLine,
  importAccountingReturn,
  listFiscalObligations,
  createFiscalObligation,
  completeFiscalObligation,
  downloadInvoiceFile,
  downloadDimobFile,
  getInvoiceEvents,
  requestInvoice,
  getCorrespondentParameters,
} from "@/lib/api/correspondent";
import Select from "@/components/atoms/Select/Select";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { formatDateTime, formatDate, formatBRL, toNumber, humanizeText, formatCompetence } from "@/lib/format";
import { hasPermission } from "@/lib/rbac/permissions";
import { SOURCE_TYPE_LABEL as BASE_SOURCE_TYPE_LABEL } from "../_labels";
import styles from "./page.module.css";

const INVOICE_STATUS_LABEL = {
  REQUESTED: "Solicitada",
  SUBMITTED: "Enviada ao emissor",
  AUTHORIZED: "Autorizada",
  REJECTED: "Rejeitada",
  CANCELED: "Cancelada",
  UNKNOWN: "Indefinida — consultar status",
};
const INVOICE_STATUS_TONE = {
  REQUESTED: "neutral",
  SUBMITTED: "warning",
  AUTHORIZED: "success",
  REJECTED: "danger",
  CANCELED: "neutral",
  UNKNOWN: "danger",
};

const RECONCILIATION_TYPE_LABEL = {
  FINANCE_X_NFSE: "Financeiro × NFS-e",
  COMMISSION_X_FISCAL: "Comissões × Fiscal",
  DIMOB_X_CONTRACTS: "DIMOB × Contratos",
  ACCOUNTING_RETURN_X_EXPORT: "Retorno do contador × Exportação",
};

const OBLIGATION_STATUS_LABEL = { PENDING: "Pendente", COMPLETED: "Concluída", OVERDUE: "Vencida" };
const OBLIGATION_STATUS_TONE = { PENDING: "warning", COMPLETED: "success", OVERDUE: "danger" };
const OBLIGATION_TYPE_LABEL = { DIMOB_ANNUAL: "DIMOB anual" };
const SOURCE_TYPE_LABEL = { ...BASE_SOURCE_TYPE_LABEL, COMMISSION_ENTITLEMENT: "Comissão de correspondente", NFSE: "NFS-e" };
const BOM = "\uFEFF";
const INVOICE_FINAL_NO_NUMBER = { REJECTED: "Não emitida (recusada pelo emissor)", CANCELED: "Cancelada", REQUESTED: "Ainda não enviada ao emissor", SUBMITTED: "Aguardando autorização", UNKNOWN: "Resultado incerto: consulte o status" };

// humanizeText tira códigos internos do texto e pode deixar um travessão solto no fim.
const TERMOS_INTERNOS = {
  CONTRATO_ASSINADO: "Contrato assinado",
  RECURSO_LIBERADO: "Recurso liberado pelo banco",
  REGISTRO_MANUAL: "Registro manual",
};

// Para o CSV do contador: só traduz os códigos internos, sem alterar o resto do texto fiscal.
function traduzCodigos(text) {
  return Object.entries(TERMOS_INTERNOS).reduce((acc, [codigo, rotulo]) => acc.split(codigo).join(rotulo), String(text ?? ""));
}

function limpaDescricao(text) {
  const legivel = Object.entries(TERMOS_INTERNOS).reduce((acc, [codigo, rotulo]) => acc.split(codigo).join(rotulo), String(text ?? ""));
  return humanizeText(legivel).replace(/\s*[—–-]\s*$/, "");
}

function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`;
}

// Data de hoje no fuso de Brasília (o mesmo que o servidor usa nas competências fiscais).
function todayBrasilia() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function currentPeriod() {
  return todayBrasilia().slice(0, 7);
}

function currentYear() {
  return Number(todayBrasilia().slice(0, 4));
}

function validYear(text) {
  const n = Number(String(text ?? "").trim());
  return Number.isInteger(n) && n >= 1900 && n <= 2100 ? n : null;
}

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// Célula de CSV que começa com =, +, - ou @ vira fórmula na planilha: neutraliza com apóstrofo.
function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Lê o CSV (vírgula ou ponto e vírgula) ou o JSON devolvido pelo contador. Devolve também quantas
// linhas foram ignoradas, para a pessoa conferir antes de importar.
function parseReturnFile(text) {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) throw new Error("O arquivo de retorno está vazio.");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let json;
    try {
      json = JSON.parse(trimmed);
    } catch {
      throw new Error("O arquivo JSON do contador está com defeito e não pôde ser lido. Confira o arquivo ou use o CSV.");
    }
    const rawLines = Array.isArray(json) ? json : json.lines || [];
    const lines = [];
    let ignored = 0;
    for (const l of rawLines) {
      const amount = typeof l?.amount === "number" ? l.amount : toNumber(String(l?.amount ?? ""));
      if (!l?.sourceType || !l?.sourceId || !Number.isFinite(amount)) { ignored += 1; continue; }
      lines.push({ sourceType: String(l.sourceType), sourceId: String(l.sourceId), amount });
    }
    return { batchHash: Array.isArray(json) ? "" : json.batchHash || "", lines, ignored };
  }
  let batchHash = "";
  const lines = [];
  let ignored = 0;
  for (const raw of trimmed.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row) continue;
    const hashMatch = /^#?\s*(?:hash|batchHash)\s*[:=,;]\s*([0-9a-fA-F]{64})/i.exec(row);
    if (hashMatch) {
      batchHash = hashMatch[1];
      continue;
    }
    // Separador da linha: ponto e vírgula quando existir (vírgula pode ser decimal: 1234,56); senão vírgula.
    const separator = row.includes(";") ? ";" : ",";
    const cells = row.split(new RegExp(`\\${separator}(?=(?:[^"]*"[^"]*")*[^"]*$)`)).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells[0].toLowerCase() === "sourcetype") continue;
    const amount = cells.length >= 3 ? toNumber(cells[2]) : NaN;
    if (cells.length < 3 || !cells[0] || !cells[1] || !Number.isFinite(amount)) {
      ignored += 1;
      continue;
    }
    lines.push({ sourceType: cells[0], sourceId: cells[1], amount });
  }
  return { batchHash, lines, ignored };
}

export default function FiscalPage() {
  const [invoices, setInvoices] = useState([]);
  const [dimobBatches, setDimobBatches] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [obligations, setObligations] = useState([]);
  const [exportBatches, setExportBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState({});
  const [canFiscal, setCanFiscal] = useState(true);
  const [dimobIncludesCommissions, setDimobIncludesCommissions] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [reconMessage, setReconMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [modalError, setModalError] = useState("");

  const [dimobYearOpen, setDimobYearOpen] = useState(false);
  const [dimobYear, setDimobYear] = useState(String(currentYear()));

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveReason, setResolveReason] = useState("");

  const [obligationOpen, setObligationOpen] = useState(false);
  const [obligationForm, setObligationForm] = useState({ obligationType: "DIMOB_ANNUAL", referenceYear: String(currentYear()), dueAt: "" });
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeNote, setCompleteNote] = useState("");

  const [dimobView, setDimobView] = useState(null);
  const [closeDimobTarget, setCloseDimobTarget] = useState(null);
  const [eventsView, setEventsView] = useState(null);

  const [exportPeriod, setExportPeriod] = useState(currentPeriod());
  const [candidates, setCandidates] = useState(null);
  const [batchView, setBatchView] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ deltaAmount: "", reason: "" });
  const [returnHash, setReturnHash] = useState("");
  const [returnFile, setReturnFile] = useState(null);
  const [returnPreview, setReturnPreview] = useState(null);
  const loadSeq = useRef(0);

  const busy = (key) => busyKey === key;

  // Cada aba carrega por conta própria: se uma lista falhar, as outras continuam visíveis.
  function load() {
    loadSeq.current += 1;
    const mine = loadSeq.current;
    setLoading(true);
    const tasks = [
      ["invoices", listInvoiceRequests, setInvoices, "as notas fiscais (NFS-e)"],
      ["dimob", listDimobBatches, setDimobBatches, "os batches DIMOB"],
      ["reconciliations", listFiscalReconciliations, setReconciliations, "as divergências fiscais"],
      ["obligations", listFiscalObligations, setObligations, "o calendário de obrigações"],
      ["exports", listExportBatches, setExportBatches, "as exportações contábeis"],
    ];
    Promise.allSettled(tasks.map(([, fn]) => fn())).then((results) => {
      if (mine !== loadSeq.current) return;
      const errors = {};
      results.forEach((result, index) => {
        const [key, , setter, text] = tasks[index];
        if (result.status === "fulfilled") setter(result.value || []);
        else errors[key] = `Não foi possível carregar ${text}: ${result.reason?.message || "erro desconhecido"}.`;
      });
      setLoadErrors(errors);
    }).finally(() => { if (mine === loadSeq.current) setLoading(false); });
  }

  useEffect(() => {
    const allowed = hasPermission("correspondent:fiscal");
    setCanFiscal(allowed);
    if (allowed) {
      load();
      getCorrespondentParameters()
        .then((p) => setDimobIncludesCommissions(p?.commission?.action?.dimobIncludeCommissions === true))
        .catch(() => {});
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function clearMessages() {
    setActionError("");
    setActionMessage("");
    setReconMessage("");
    setModalError("");
  }

  function errorBox(key) {
    return loadErrors[key] ? (
      <div style={{ marginBottom: 12 }}>
        <Alert tone="danger">{loadErrors[key]}</Alert>
        <div style={{ marginTop: 8 }}><Button variant="secondary" size="sm" onClick={load}>Tentar de novo</Button></div>
      </div>
    ) : null;
  }

  async function runAction(key, fn, { modal = false } = {}) {
    if (busyKey) return false;
    clearMessages();
    setBusyKey(key);
    try {
      await fn();
      return true;
    } catch (err) {
      const text = err?.message || "Não foi possível concluir a ação.";
      if (modal) setModalError(text);
      else setActionError(text);
      return false;
    } finally {
      setBusyKey("");
    }
  }

  async function handleCheckStatus(row) {
    await runAction(`check-${row.id}`, async () => {
      const result = await checkInvoiceStatus(row.id);
      const newStatus = (result?.data || result)?.status;
      setActionMessage(newStatus
        ? (newStatus === row.status ? `Status consultado junto ao emissor: continua "${INVOICE_STATUS_LABEL[newStatus] || newStatus}".` : `Status consultado junto ao emissor: agora "${INVOICE_STATUS_LABEL[newStatus] || newStatus}".`)
        : "Status consultado junto ao emissor.");
      load();
    });
  }

  async function handleReissue(row) {
    await runAction(`reissue-${row.id}`, async () => {
      await requestInvoice({ sourceType: row.sourceType, sourceId: row.sourceId, amount: row.amount, description: row.description });
      setActionMessage("Nova solicitação de NFS-e enviada para a mesma origem.");
      load();
    });
  }

  async function handleViewEvents(row) {
    setModalError("");
    setEventsView({ row, loading: true, events: [] });
    try {
      const events = await getInvoiceEvents(row.id);
      setEventsView({ row, loading: false, events: events || [] });
    } catch (err) {
      setEventsView({ row, loading: false, events: [], error: err?.message || "Não foi possível carregar o histórico da nota." });
    }
  }

  function openCancel(row) {
    clearMessages();
    setCancelReason("");
    setCancelTarget(row);
  }

  async function handleCancelInvoice() {
    if (cancelReason.trim().length < 3) return;
    const ok = await runAction("cancel", async () => {
      await cancelInvoice(cancelTarget.id, { reason: cancelReason.trim() });
    }, { modal: true });
    if (ok) {
      setActionMessage("NFS-e cancelada.");
      setCancelTarget(null);
      setCancelReason("");
      load();
    }
  }

  function openDimobYear() {
    clearMessages();
    setDimobYear(String(currentYear()));
    setDimobYearOpen(true);
  }

  async function handleGenerateDimob() {
    const year = validYear(dimobYear);
    if (!year) {
      setModalError("Informe um ano válido, entre 1900 e 2100.");
      return;
    }
    const ok = await runAction("dimob-generate", async () => {
      await generateDimobBatch({ referenceYear: year });
    }, { modal: true });
    if (ok) {
      setActionMessage("Batch DIMOB gerado. A versão e o código de integridade aparecem na lista.");
      setDimobYearOpen(false);
      load();
    }
  }

  async function handleCloseDimob() {
    const target = closeDimobTarget;
    if (!target) return;
    const ok = await runAction("dimob-close", async () => {
      await closeDimobBatch(target.id);
    }, { modal: true });
    if (ok) {
      setCloseDimobTarget(null);
      setActionMessage("Batch DIMOB fechado. Qualquer correção exigirá uma nova versão.");
      load();
    }
  }

  function openResolve(row) {
    clearMessages();
    setResolveReason("");
    setResolveTarget(row);
  }

  async function handleResolveReconciliation() {
    if (resolveReason.trim().length < 3) return;
    const ok = await runAction("resolve", async () => {
      await resolveFiscalReconciliation(resolveTarget.id, { reason: resolveReason.trim() });
    }, { modal: true });
    if (ok) {
      setActionMessage("Divergência resolvida.");
      setResolveTarget(null);
      setResolveReason("");
      load();
    }
  }

  async function handleDownload(row, kind) {
    await runAction(`dl-${row.id}-${kind}`, () => downloadInvoiceFile(row.id, kind));
  }

  async function handleViewDimob(batch) {
    await runAction(`view-${batch.id}`, async () => {
      const data = await listDimobRecords(batch.id);
      setDimobView({ batch, records: data.records || [] });
    });
  }

  async function handleDownloadDimob(batch) {
    await runAction(`dl-dimob-${batch.id}`, () => downloadDimobFile(batch.id));
  }

  async function handleRunReconciliations() {
    await runAction("recon-run", async () => {
      const result = await runFiscalReconciliations();
      const checked = Object.values(result?.checked || {}).reduce((sum, n) => sum + n, 0);
      const aberto = result?.openTotal ?? (result?.opened || []).length;
      // Mensagem junto ao botão (a faixa do topo pode ficar fora da tela e repetia o mesmo texto).
      setReconMessage(
        aberto === 0
          ? `Conferência concluída: ${plural(checked, "item conferido", "itens conferidos")} e nenhuma divergência em aberto.`
          : `Conferência concluída: ${plural(checked, "item conferido", "itens conferidos")}. Há ${plural(aberto, "divergência em aberto", "divergências em aberto")} no total, listadas abaixo.`
      );
      load();
    });
  }

  function openObligation() {
    clearMessages();
    setObligationForm({ obligationType: "DIMOB_ANNUAL", referenceYear: String(currentYear()), dueAt: "" });
    setObligationOpen(true);
  }

  async function handleCreateObligation() {
    const year = validYear(obligationForm.referenceYear);
    if (!year) {
      setModalError("Informe um ano-base válido, entre 1900 e 2100.");
      return;
    }
    const ok = await runAction("obligation-create", async () => {
      await createFiscalObligation({ obligationType: obligationForm.obligationType, referenceYear: year, dueAt: obligationForm.dueAt });
    }, { modal: true });
    if (ok) {
      setActionMessage("Obrigação cadastrada no calendário fiscal.");
      setObligationOpen(false);
      load();
    }
  }

  function openComplete(row) {
    clearMessages();
    setCompleteNote("");
    setCompleteTarget(row);
  }

  async function handleCompleteObligation() {
    if (completeNote.trim().length < 3) return;
    const ok = await runAction("obligation-complete", async () => {
      await completeFiscalObligation(completeTarget.id, { note: completeNote.trim() });
    }, { modal: true });
    if (ok) {
      setActionMessage("Obrigação concluída.");
      setCompleteTarget(null);
      setCompleteNote("");
      load();
    }
  }

  function periodProblem() {
    if (!PERIOD_PATTERN.test(exportPeriod)) return "Informe o mês no formato AAAA-MM (ex.: 2026-05).";
    if (exportPeriod > currentPeriod()) return "O mês de referência não pode estar no futuro.";
    return "";
  }

  async function handleLoadCandidates() {
    const problem = periodProblem();
    if (problem) {
      clearMessages();
      setActionError(problem);
      return;
    }
    await runAction("candidates", async () => {
      setCandidates(await listExportCandidates(exportPeriod));
    });
  }

  async function handleCreateExport() {
    const expectedCount = candidates ? candidates.length : 0;
    await runAction("export-create", async () => {
      const result = await createExportBatch({ referencePeriod: exportPeriod });
      const lines = (result?.data || result)?.lines;
      const created = Array.isArray(lines) ? lines.length : (result?.lineCount ?? null);
      const differs = created !== null && expectedCount && created !== expectedCount;
      setActionMessage(`Batch de ${formatCompetence(exportPeriod)} gerado para o contador${created !== null ? ` com ${plural(created, "linha", "linhas")}` : ""}.${differs ? ` Atenção: a tela mostrava ${plural(expectedCount, "lançamento", "lançamentos")}; entraram outros porque o servidor recalcula no momento de gerar. Abra o batch e confira.` : ""}`);
      setCandidates(null);
      load();
    });
  }

  async function openBatch(batchId) {
    await runAction(`open-${batchId}`, async () => {
      setBatchView(await getExportBatch(batchId));
      setReturnHash("");
      setReturnFile(null);
      setReturnPreview(null);
    });
  }

  function handleDownloadBatch() {
    const { batch, lines } = batchView;
    const rows = [
      `# hash;${batch.batchHash}`,
      "sourceType;sourceId;amount;description",
      ...lines.map((l) => [csvCell(l.sourceType), csvCell(l.sourceId), Number(l.amount).toFixed(2), csvCell(traduzCodigos(l.description))].join(";")),
    ];
    // BOM para o Excel brasileiro reconhecer os acentos.
    const blob = new Blob([BOM + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exportacao-contabil-${batch.referencePeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const adjustDelta = toNumber(adjustForm.deltaAmount);
  const adjustValid = Number.isFinite(adjustDelta) && Math.abs(adjustDelta) >= 0.01 && adjustForm.reason.trim().length >= 3;

  async function handleAdjust() {
    if (!adjustValid) return;
    const ok = await runAction("adjust", async () => {
      await adjustExportLine(adjustTarget.id, { deltaAmount: Math.round(adjustDelta * 100) / 100, reason: adjustForm.reason.trim() });
      setBatchView(await getExportBatch(batchView.batch.id));
    }, { modal: true });
    if (ok) {
      setActionMessage("Ajuste registrado como linha nova; a linha original não foi alterada.");
      setAdjustTarget(null);
      setAdjustForm({ deltaAmount: "", reason: "" });
    }
  }

  async function handleReturnFileChange(file) {
    setReturnFile(file);
    setReturnPreview(null);
    setModalError("");
    if (!file) return;
    try {
      const parsed = parseReturnFile(await file.text());
      setReturnPreview({ lines: parsed.lines.length, ignored: parsed.ignored, batchHash: parsed.batchHash, parsed });
    } catch (err) {
      setReturnPreview({ error: err?.message || "Não foi possível ler o arquivo." });
    }
  }

  async function handleImportReturn() {
    if (!returnPreview || returnPreview.error || returnPreview.ignored > 0 || returnPreview.lines === 0) return;
    const parsed = returnPreview.parsed;
    const ok = await runAction("return-import", async () => {
      const result = await importAccountingReturn(batchView.batch.id, {
        batchHash: (returnHash.trim() || parsed.batchHash).toLowerCase(),
        fileName: returnFile?.name,
        lines: parsed.lines,
      });
      setActionMessage(
        result.status === "MATCHED"
          ? "Retorno do contador importado: tudo confere com a exportação."
          : "Retorno importado com divergências: a diferença foi aberta na aba Reconciliações e está detalhada abaixo."
      );
      setBatchView(await getExportBatch(batchView.batch.id));
      setReturnFile(null);
      setReturnPreview(null);
      setReturnHash("");
      load();
    }, { modal: true });
    return ok;
  }

  const invoiceColumns = [
    { key: "description", label: "Descrição", render: (row) => <span title={row.description || undefined}>{limpaDescricao(row.description) || "Sem descrição"}</span> },
    { key: "amount", label: "Valor", render: (row) => formatBRL(row.amount) },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <>
          <Badge tone={INVOICE_STATUS_TONE[row.status] || "neutral"}>{INVOICE_STATUS_LABEL[row.status] || "Status não identificado"}</Badge>
          {row.status === "REJECTED" ? <div className={styles.helper}>Motivo: {row.rejectionReason || row.rejection_reason || "o emissor não informou o motivo"}</div> : null}
        </>
      ),
    },
    { key: "number", label: "Número oficial", render: (row) => row.document?.documentNumber || INVOICE_FINAL_NO_NUMBER[row.status] || "Aguardando autorização" },
    { key: "createdAt", label: "Solicitada em", render: (row) => formatDateTime(row.createdAt || row.created_at) },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className={styles.rowActions}>
          {row.document?.hasXml ? <Button variant="secondary" size="sm" loading={busy(`dl-${row.id}-xml`)} disabled={Boolean(busyKey)} onClick={() => handleDownload(row, "xml")}>XML</Button> : null}
          {row.document?.hasPdf ? <Button variant="secondary" size="sm" loading={busy(`dl-${row.id}-pdf`)} disabled={Boolean(busyKey)} onClick={() => handleDownload(row, "pdf")}>PDF</Button> : null}
          {["REQUESTED", "SUBMITTED", "UNKNOWN", "AUTHORIZED"].includes(row.status) ? (
            <Button variant="secondary" size="sm" loading={busy(`check-${row.id}`)} disabled={Boolean(busyKey)} onClick={() => handleCheckStatus(row)}>Consultar status</Button>
          ) : null}
          {row.status === "REJECTED" ? (
            <Button variant="secondary" size="sm" loading={busy(`reissue-${row.id}`)} disabled={Boolean(busyKey)} onClick={() => handleReissue(row)}>Solicitar de novo</Button>
          ) : null}
          {row.status === "AUTHORIZED" ? (
            <Button variant="secondary" size="sm" disabled={Boolean(busyKey)} onClick={() => openCancel(row)}>Cancelar</Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => handleViewEvents(row)}>Histórico</Button>
        </div>
      ),
    },
  ];

  const dimobColumns = [
    { key: "referenceYear", label: "Ano" },
    { key: "version", label: "Versão" },
    { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "CLOSED" ? "success" : "neutral"}>{row.status === "CLOSED" ? "Fechado" : row.status === "DRAFT" ? "Rascunho" : "Status não identificado"}</Badge> },
    { key: "snapshotHash", label: "Código de integridade", render: (row) => <code className={styles.hash}>{row.snapshotHash}</code> },
    { key: "createdAt", label: "Gerado em", render: (row) => formatDateTime(row.createdAt || row.created_at) },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className={styles.rowActions}>
          <Button variant="secondary" size="sm" loading={busy(`view-${row.id}`)} disabled={Boolean(busyKey)} onClick={() => handleViewDimob(row)}>Ver registros</Button>
          <Button variant="secondary" size="sm" loading={busy(`dl-dimob-${row.id}`)} disabled={Boolean(busyKey)} onClick={() => handleDownloadDimob(row)}>Baixar arquivo</Button>
          {row.status !== "CLOSED" ? <Button variant="secondary" size="sm" disabled={Boolean(busyKey)} onClick={() => { clearMessages(); setCloseDimobTarget(row); }}>Fechar batch</Button> : null}
        </div>
      ),
    },
  ];

  const obligationColumns = [
    { key: "typeLabel", label: "Obrigação", render: (row) => OBLIGATION_TYPE_LABEL[row.obligationType] || "Obrigação não identificada" },
    { key: "referenceYear", label: "Ano-base" },
    { key: "dueAt", label: "Prazo", render: (row) => formatDate(row.dueAt) },
    {
      key: "daysUntilDue",
      label: "Situação do prazo",
      render: (row) => {
        if (row.status === "COMPLETED") return "Cumprida";
        if (row.daysUntilDue < 0) return `Venceu há ${Math.abs(row.daysUntilDue)} dia(s)`;
        if (row.daysUntilDue === 0) return "Vence hoje";
        return `Faltam ${row.daysUntilDue} dia(s)`;
      },
    },
    { key: "status", label: "Status", render: (row) => <Badge tone={OBLIGATION_STATUS_TONE[row.status] || "neutral"}>{OBLIGATION_STATUS_LABEL[row.status] || "Status não identificado"}</Badge> },
    { key: "completedAt", label: "Concluída em", render: (row) => (row.completedAt ? formatDateTime(row.completedAt) : "Ainda não concluída") },
    {
      key: "actions",
      label: "",
      render: (row) => (row.status !== "COMPLETED" ? <Button variant="secondary" size="sm" disabled={Boolean(busyKey)} onClick={() => openComplete(row)}>Concluir</Button> : null),
    },
  ];

  const exportColumns = [
    { key: "referencePeriod", label: "Período", render: (row) => formatCompetence(row.referencePeriod) },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const text = { EXPORTED: "Exportado", RETURNED: "Retorno conferido", DIVERGENT: "Retorno com divergência", PENDING: "Aguardando exportação" }[row.status];
        const tone = row.status === "DIVERGENT" ? "danger" : row.status === "PENDING" ? "warning" : "success";
        return <Badge tone={tone}>{text || "Exportado"}</Badge>;
      },
    },
    { key: "batchHash", label: "Código de integridade do batch", render: (row) => <code className={styles.hash}>{row.batchHash}</code> },
    { key: "createdAt", label: "Gerado em", render: (row) => formatDateTime(row.createdAt || row.created_at) },
    { key: "actions", label: "", render: (row) => <Button variant="secondary" size="sm" loading={busy(`open-${row.id}`)} disabled={Boolean(busyKey)} onClick={() => openBatch(row.id)}>Abrir</Button> },
  ];

  const candidateColumns = [
    { key: "sourceType", label: "Origem", render: (row) => SOURCE_TYPE_LABEL[row.sourceType] || "Origem não identificada" },
    { key: "description", label: "Descrição", render: (row) => <span title={row.description || undefined}>{limpaDescricao(row.description) || "Sem descrição"}</span> },
    { key: "amount", label: "Valor", render: (row) => formatBRL(row.amount) },
  ];

  const batchLineColumns = [
    { key: "sourceType", label: "Origem", render: (row) => SOURCE_TYPE_LABEL[row.sourceType] || "Origem não identificada" },
    { key: "description", label: "Descrição", render: (row) => <span title={row.description || undefined}>{limpaDescricao(row.description) || "Sem descrição"}</span> },
    { key: "amount", label: "Valor", render: (row) => formatBRL(row.amount) },
    { key: "kind", label: "Tipo", render: (row) => (row.adjustmentOfLineId ? "Ajuste" : "Original") },
    {
      key: "actions",
      label: "",
      render: (row) => (row.adjustmentOfLineId ? null : <Button variant="secondary" size="sm" onClick={() => { clearMessages(); setAdjustTarget(row); setAdjustForm({ deltaAmount: "", reason: "" }); }}>Ajustar</Button>),
    },
  ];

  const returnColumns = [
    { key: "importedAt", label: "Importado em", render: (row) => formatDateTime(row.importedAt) },
    { key: "fileName", label: "Arquivo", render: (row) => row.fileName || "Sem nome de arquivo" },
    { key: "lineCount", label: "Linhas" },
    { key: "returnedTotal", label: "Total devolvido", render: (row) => formatBRL(row.returnedTotal) },
    {
      key: "status",
      label: "Resultado",
      render: (row) => {
        const divergences = row.summaryJson?.divergences || [];
        return (
          <>
            <Badge tone={row.status === "MATCHED" ? "success" : "danger"}>{row.status === "MATCHED" ? "Confere" : "Divergente"}</Badge>
            {divergences.length ? (
              <ul className={styles.helper} style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                {divergences.map((d) => {
                  const [type, ...rest] = String(d.source || "").split(":");
                  return <li key={d.source}>{SOURCE_TYPE_LABEL[type] || "Origem"} {rest.join(":").slice(0, 8)}: esperado {formatBRL(d.expected)}, devolvido {formatBRL(d.returned)} (diferença {formatBRL(d.difference)})</li>;
                })}
              </ul>
            ) : null}
          </>
        );
      },
    },
  ];

  const dimobRecordColumns = [
    { key: "recordType", label: "Origem", render: (row) => (row.recordType === "LEASE" ? `Locação ${row.detailJson?.contractNumber || ""}`.trim() : "Comissão de correspondente") },
    { key: "amount", label: "Valor no ano", render: (row) => formatBRL(row.amount) },
    { key: "validationStatus", label: "Cadastro", render: (row) => <Badge tone={row.validationStatus === "VALID" ? "success" : "danger"}>{row.validationStatus === "VALID" ? "Completo" : "Com pendência"}</Badge> },
    { key: "validationIssues", label: "Pendências", render: (row) => ((row.validationIssues || []).length ? (row.validationIssues || []).map((i) => i.message).join(" ") : "Nenhuma pendência") },
  ];

  const reconciliationColumns = [
    { key: "reconciliationType", label: "Tipo", render: (row) => RECONCILIATION_TYPE_LABEL[row.reconciliationType] || "Tipo não identificado" },
    {
      key: "reference",
      label: "Referência",
      render: (row) => {
        const id = row.referenceId || row.reference_id;
        if (row.referenceLabel) return row.referenceLabel;
        if (!id) return "Sem referência registrada";
        const kind = { FINANCE_X_NFSE: "NFS-e", COMMISSION_X_FISCAL: "Comissão", DIMOB_X_CONTRACTS: "Batch DIMOB", ACCOUNTING_RETURN_X_EXPORT: "Retorno do contador" }[row.reconciliationType] || "Item";
        return `${kind}, código ${String(id).slice(0, 8)}`;
      },
    },
    { key: "expectedAmount", label: "Esperado", render: (row) => formatBRL(row.expectedAmount) },
    { key: "actualAmount", label: "Real", render: (row) => formatBRL(row.actualAmount) },
    { key: "differenceAmount", label: "Diferença", render: (row) => formatBRL(row.differenceAmount) },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <>
          <Badge tone={row.status === "OPEN" ? "danger" : "success"}>{row.status === "OPEN" ? "Em aberto" : "Resolvida"}</Badge>
          {row.status !== "OPEN" && (row.resolutionNote || row.resolution_note) ? <div className={styles.helper}>{row.resolutionNote || row.resolution_note}</div> : null}
        </>
      ),
    },
    { key: "detectedAt", label: "Detectada em", render: (row) => formatDateTime(row.detectedAt || row.detected_at) },
    {
      key: "actions",
      label: "",
      render: (row) => (row.status === "OPEN" ? <Button variant="secondary" size="sm" disabled={Boolean(busyKey)} onClick={() => openResolve(row)}>Resolver</Button> : null),
    },
  ];

  if (!canFiscal) {
    return (
      <AppShell title="Fiscal" backHref="/painel/correspondente">
        <div className={styles.wrap}>
          <Alert tone="warning" title="Sem acesso ao Fiscal">Seu perfil não tem a permissão fiscal do correspondente. Peça a um administrador para liberar.</Alert>
        </div>
      </AppShell>
    );
  }

  const dimobEmptyText = dimobIncludesCommissions
    ? "Este batch não tem registros: não havia aluguel recebido nem comissão recebível no ano."
    : "Este batch não tem registros: não havia aluguel recebido no ano. As comissões de correspondente não entram na DIMOB, conforme os Parâmetros.";
  const yearProblem = validYear(dimobYear) ? "" : "Informe um ano entre 1900 e 2100.";
  const obligationYearProblem = validYear(obligationForm.referenceYear) ? "" : "Informe um ano entre 1900 e 2100.";
  const obligationDuePast = obligationForm.dueAt && obligationForm.dueAt < todayBrasilia();

  return (
    <AppShell title="Fiscal" backHref="/painel/correspondente">
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
        {actionMessage ? <Alert tone="success">{actionMessage}</Alert> : null}

        <Alert tone="warning" title="Subledger operacional — não é o livro contábil oficial">
          O Nayara One mantém este módulo como um subledger operacional/gerencial, com documentos
          fiscais de apoio. Ele não substitui o livro contábil oficial da empresa — o fechamento
          contábil e a validação final permanecem com o contador responsável.
        </Alert>

        <Tabs
          items={[
            {
              label: "NFS-e",
              content: (
                <Card title="Notas fiscais de serviço (NFS-e) emitidas">
                  {errorBox("invoices")}
                  <Table columns={invoiceColumns} rows={invoices} loading={loading} emptyMessage="Nenhuma NFS-e solicitada ainda." />
                </Card>
              ),
            },
            {
              label: "DIMOB",
              content: (
                <Card title="Batches DIMOB (declaração anual)">
                  {errorBox("dimob")}
                  <div className={styles.toolbarRow}>
                    <Button onClick={openDimobYear} disabled={Boolean(busyKey)}>Gerar batch do ano</Button>
                  </div>
                  <Table columns={dimobColumns} rows={dimobBatches} loading={loading} emptyMessage="Nenhum batch DIMOB gerado ainda." />
                </Card>
              ),
            },
            {
              label: "Calendário",
              content: (
                <Card title="Calendário de obrigações fiscais">
                  {errorBox("obligations")}
                  <div className={styles.toolbarRow}>
                    <Button onClick={openObligation} disabled={Boolean(busyKey)}>Cadastrar obrigação</Button>
                  </div>
                  <Table columns={obligationColumns} rows={obligations} loading={loading} emptyMessage="Nenhuma obrigação cadastrada. Gerar um batch DIMOB cadastra a do ano automaticamente." />
                </Card>
              ),
            },
            {
              label: "Exportação contábil",
              content: (
                <Card title="Exportação para o contador">
                  {errorBox("exports")}
                  <div className={styles.toolbarRow}>
                    <div className={styles.inlineField}>
                      <FormField label="Mês de referência" htmlFor="export-period" helper="Formato AAAA-MM. Se o seu navegador não mostrar um seletor de mês, digite assim: 2026-05." error={PERIOD_PATTERN.test(exportPeriod) && exportPeriod <= currentPeriod() ? undefined : periodProblem()}>
                        <Input id="export-period" type="month" placeholder="AAAA-MM" max={currentPeriod()} value={exportPeriod} onChange={(e) => { setExportPeriod(e.target.value); setCandidates(null); }} />
                      </FormField>
                    </div>
                    <Button variant="secondary" onClick={handleLoadCandidates} loading={busy("candidates")} disabled={Boolean(busyKey)}>Ver lançamentos pendentes</Button>
                  </div>
                  {candidates ? (
                    <div className={styles.candidates}>
                      <Table columns={candidateColumns} rows={candidates} emptyMessage="Nada pendente de exportação neste período." />
                      {candidates.length > 0 ? (
                        <div className={styles.toolbarRow}>
                          <Button onClick={handleCreateExport} loading={busy("export-create")} disabled={Boolean(busyKey)}>Gerar batch com {plural(candidates.length, "lançamento", "lançamentos")}</Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <Table columns={exportColumns} rows={exportBatches} loading={loading} emptyMessage="Nenhum batch exportado ainda." />
                </Card>
              ),
            },
            {
              label: "Reconciliações",
              content: (
                <Card title="Divergências fiscais detectadas">
                  {errorBox("reconciliations")}
                  <div className={styles.toolbarRow}>
                    <Button onClick={handleRunReconciliations} loading={busy("recon-run")} disabled={Boolean(busyKey)}>Conferir agora</Button>
                  </div>
                  <p className={styles.helper}>A conferência compara Financeiro, comissões, NFS-e, DIMOB e retornos do contador e registra as diferenças encontradas. Ela não altera valores de nenhuma nota ou comissão.</p>
                  {reconMessage ? <div role="status"><Alert tone="success">{reconMessage}</Alert></div> : null}
                  <Table
                    columns={reconciliationColumns}
                    rows={reconciliations}
                    loading={loading}
                    emptyMessage="Nenhuma divergência registrada — tudo reconciliado."
                  />
                </Card>
              ),
            },
          ]}
        />
      </div>

      <Modal open={dimobYearOpen} onClose={() => { if (!busyKey) setDimobYearOpen(false); }} title="Gerar batch DIMOB">
        {modalError ? <Alert tone="danger">{modalError}</Alert> : null}
        <FormField label="Ano de referência" htmlFor="dimob-year" error={yearProblem || undefined}>
          <Input id="dimob-year" inputMode="numeric" maxLength={4} value={dimobYear} onChange={(e) => setDimobYear(e.target.value.replace(/\D/g, ""))} />
        </FormField>
        <p className={styles.helper}>
          Gerar de novo para o mesmo ano cria uma nova versão — a anterior nunca é apagada ou sobrescrita.
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setDimobYearOpen(false)} disabled={Boolean(busyKey)}>Cancelar</Button>
          <Button onClick={handleGenerateDimob} loading={busy("dimob-generate")} disabled={Boolean(busyKey) || Boolean(yearProblem)}>Gerar</Button>
        </div>
      </Modal>

      <Modal open={Boolean(closeDimobTarget)} onClose={() => { if (!busyKey) setCloseDimobTarget(null); }} title="Fechar batch DIMOB">
        {modalError ? <Alert tone="danger">{modalError}</Alert> : null}
        <p>
          Fechar o batch do ano {closeDimobTarget?.referenceYear}, versão {closeDimobTarget?.version}, congela os valores e conclui a obrigação do calendário. Não dá para desfazer: qualquer correção depois exige uma nova versão.
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setCloseDimobTarget(null)} disabled={Boolean(busyKey)}>Voltar</Button>
          <Button onClick={handleCloseDimob} loading={busy("dimob-close")} disabled={Boolean(busyKey)}>Fechar batch</Button>
        </div>
      </Modal>

      <Modal open={Boolean(cancelTarget)} onClose={() => { if (!busyKey) setCancelTarget(null); }} title="Cancelar NFS-e">
        {modalError ? <Alert tone="danger">{modalError}</Alert> : null}
        <FormField label="Motivo do cancelamento" htmlFor="cancel-reason" required helper="Mínimo 3 caracteres. Fica na auditoria.">
          <Input id="cancel-reason" maxLength={300} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCancelInvoice(); } }} />
        </FormField>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={Boolean(busyKey)}>Voltar</Button>
          <Button onClick={handleCancelInvoice} loading={busy("cancel")} disabled={Boolean(busyKey) || cancelReason.trim().length < 3}>Confirmar cancelamento</Button>
        </div>
      </Modal>

      <Modal open={Boolean(resolveTarget)} onClose={() => { if (!busyKey) setResolveTarget(null); }} title="Resolver divergência">
        {modalError ? <Alert tone="danger">{modalError}</Alert> : null}
        <FormField label="Motivo/explicação da divergência" htmlFor="resolve-reason" required helper="Mínimo 3 caracteres. Fica na auditoria.">
          <Input id="resolve-reason" maxLength={300} value={resolveReason} onChange={(e) => setResolveReason(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleResolveReconciliation(); } }} />
        </FormField>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setResolveTarget(null)} disabled={Boolean(busyKey)}>Voltar</Button>
          <Button onClick={handleResolveReconciliation} loading={busy("resolve")} disabled={Boolean(busyKey) || resolveReason.trim().length < 3}>Confirmar resolução</Button>
        </div>
      </Modal>

      <Modal open={obligationOpen} onClose={() => { if (!busyKey) setObligationOpen(false); }} title="Cadastrar obrigação fiscal">
        {modalError ? <Alert tone="danger">{modalError}</Alert> : null}
        <FormField label="Obrigação" htmlFor="obl-type">
          <Select id="obl-type" value={obligationForm.obligationType} onChange={(e) => setObligationForm((f) => ({ ...f, obligationType: e.target.value }))}>
            <option value="DIMOB_ANNUAL">DIMOB anual</option>
          </Select>
        </FormField>
        <FormField label="Ano-base" htmlFor="obl-year" error={obligationYearProblem || undefined}>
          <Input id="obl-year" inputMode="numeric" maxLength={4} value={obligationForm.referenceYear} onChange={(e) => setObligationForm((f) => ({ ...f, referenceYear: e.target.value.replace(/\D/g, "") }))} />
        </FormField>
        <FormField label="Prazo da entrega" htmlFor="obl-due" helper="Vazio usa o último dia útil de fevereiro do ano seguinte. Feriados não são considerados: confirme com o contador." error={obligationDuePast ? "Esta data já passou: a obrigação nasceria vencida." : undefined}>
          <Input id="obl-due" type="date" value={obligationForm.dueAt} onChange={(e) => setObligationForm((f) => ({ ...f, dueAt: e.target.value }))} />
        </FormField>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setObligationOpen(false)} disabled={Boolean(busyKey)}>Voltar</Button>
          <Button onClick={handleCreateObligation} loading={busy("obligation-create")} disabled={Boolean(busyKey) || Boolean(obligationYearProblem)}>Cadastrar</Button>
        </div>
      </Modal>

      <Modal open={Boolean(completeTarget)} onClose={() => { if (!busyKey) setCompleteTarget(null); }} title="Concluir obrigação">
        {modalError ? <Alert tone="danger">{modalError}</Alert> : null}
        <FormField label="Observação" htmlFor="obl-note" required helper="Ex.: entregue pelo contador, protocolo e data. Mínimo 3 caracteres.">
          <Input id="obl-note" maxLength={300} value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCompleteObligation(); } }} />
        </FormField>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setCompleteTarget(null)} disabled={Boolean(busyKey)}>Voltar</Button>
          <Button onClick={handleCompleteObligation} loading={busy("obligation-complete")} disabled={Boolean(busyKey) || completeNote.trim().length < 3}>Concluir</Button>
        </div>
      </Modal>

      <Modal open={Boolean(eventsView)} onClose={() => setEventsView(null)} title="Histórico da NFS-e" size="lg">
        {eventsView?.loading ? <p>Carregando histórico…</p> : null}
        {eventsView?.error ? <Alert tone="danger">{eventsView.error}</Alert> : null}
        {eventsView && !eventsView.loading && !eventsView.error ? (
          eventsView.events.length === 0 ? <p>Nenhum evento registrado para esta nota.</p> : (
            <ul style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {eventsView.events.map((evt) => (
                <li key={evt.id}>
                  {formatDateTime(evt.occurredAt || evt.occurred_at)}: {INVOICE_STATUS_LABEL[evt.normalizedStatus] || "Status não identificado"}
                  {evt.note ? ` · ${evt.note}` : ""}
                </li>
              ))}
            </ul>
          )
        ) : null}
      </Modal>

      <Modal open={Boolean(dimobView)} onClose={() => setDimobView(null)} title={dimobView ? `Registros do DIMOB ${dimobView.batch.referenceYear}, versão ${dimobView.batch.version}` : "Registros do DIMOB"} size="lg">
        {dimobView ? (
          <>
            <p className={styles.helper}>
              Total do batch: {formatBRL(dimobView.records.reduce((sum, r) => sum + Number(r.amount), 0))} em {dimobView.records.length} registro(s), {dimobView.records.filter((r) => r.validationStatus === "INVALID").length} com pendência de cadastro. Batch com pendência não pode ser fechado: corrija o cadastro e gere uma nova versão.
            </p>
            <Table columns={dimobRecordColumns} rows={dimobView.records} emptyMessage={dimobEmptyText} />
          </>
        ) : null}
      </Modal>

      <Modal open={Boolean(batchView)} onClose={() => { if (!busyKey) setBatchView(null); }} title={batchView ? `Exportação ${formatCompetence(batchView.batch.referencePeriod)}` : "Exportação"} size="lg">
        {batchView ? (
          <div className={styles.batchBody}>
            {modalError && !adjustTarget ? <Alert tone="danger">{modalError}</Alert> : null}
            <p className={styles.helper}>Código de integridade do batch (o contador precisa devolvê-lo no arquivo de retorno): <code className={styles.hash}>{batchView.batch.batchHash}</code></p>
            <div className={styles.toolbarRow}>
              <Button variant="secondary" onClick={handleDownloadBatch}>Baixar CSV para o contador</Button>
            </div>
            <Table columns={batchLineColumns} rows={batchView.lines} emptyMessage="Batch sem linhas." />
            <h4 className={styles.subtitle}>Retorno do contador</h4>
            <FormField label="Código informado no arquivo" htmlFor="return-hash" helper="Se o arquivo trouxer a linha “# hash;…”, pode deixar vazio.">
              <Input id="return-hash" value={returnHash} onChange={(e) => setReturnHash(e.target.value)} />
            </FormField>
            <FormField label="Arquivo de retorno (CSV ou JSON)" htmlFor="return-file">
              <input id="return-file" type="file" accept=".csv,.json,.txt" onChange={(e) => handleReturnFileChange(e.target.files?.[0] || null)} />
            </FormField>
            {returnPreview?.error ? <Alert tone="danger">{returnPreview.error}</Alert> : null}
            {returnPreview && !returnPreview.error ? (
              returnPreview.ignored > 0 ? (
                <Alert tone="danger" title="O arquivo tem linhas que não puderam ser lidas">
                  {plural(returnPreview.lines, "linha lida", "linhas lidas")} e {plural(returnPreview.ignored, "linha ignorada", "linhas ignoradas")} (faltam colunas, origem ou valor numérico). Corrija o arquivo antes de importar: importar assim geraria divergências falsas.
                </Alert>
              ) : returnPreview.lines === 0 ? (
                <Alert tone="danger">Nenhuma linha válida encontrada no arquivo.</Alert>
              ) : (
                <Alert tone="info">{plural(returnPreview.lines, "linha lida", "linhas lidas")}, nenhuma ignorada.</Alert>
              )
            ) : null}
            <div className={styles.toolbarRow}>
              <Button onClick={handleImportReturn} loading={busy("return-import")} disabled={Boolean(busyKey) || !returnPreview || Boolean(returnPreview.error) || returnPreview.ignored > 0 || returnPreview.lines === 0}>Importar retorno</Button>
            </div>
            <Table columns={returnColumns} rows={batchView.returns} emptyMessage="Nenhum retorno importado para este batch ainda." />
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(adjustTarget)} onClose={() => { if (!busyKey) setAdjustTarget(null); }} title="Ajustar linha exportada">
        {modalError ? <Alert tone="danger">{modalError}</Alert> : null}
        <p className={styles.helper}>O ajuste cria uma linha nova no mesmo batch. A linha original nunca é editada.</p>
        <FormField label="Valor do ajuste (R$)" htmlFor="adjust-delta" helper="Positivo acrescenta; negativo (com sinal de menos) reduz o valor exportado. Mínimo de R$ 0,01." error={adjustForm.deltaAmount && !(Math.abs(adjustDelta) >= 0.01) ? "Informe um valor de pelo menos R$ 0,01 (positivo ou negativo)." : undefined}>
          <DecimalInput id="adjust-delta" allowNegative maxDecimals={2} value={adjustForm.deltaAmount} onChange={(e) => setAdjustForm((f) => ({ ...f, deltaAmount: e.target.value }))} placeholder="0,00" />
        </FormField>
        <FormField label="Motivo do ajuste" htmlFor="adjust-reason" required helper="Mínimo 3 caracteres.">
          <Input id="adjust-reason" maxLength={300} value={adjustForm.reason} onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))} />
        </FormField>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setAdjustTarget(null)} disabled={Boolean(busyKey)}>Voltar</Button>
          <Button onClick={handleAdjust} loading={busy("adjust")} disabled={Boolean(busyKey) || !adjustValid}>Registrar ajuste</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
