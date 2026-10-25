"use client";

import { useEffect, useState } from "react";
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
} from "@/lib/api/correspondent";
import Select from "@/components/atoms/Select/Select";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { formatDateTime, formatDate, formatBRL, toNumber, humanizeText, formatCompetence } from "@/lib/format";
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
const SOURCE_TYPE_LABEL = { COMMISSION_ENTITLEMENT: "Comissão de correspondente", NFSE: "NFS-e" };

// humanizeText tira códigos internos do texto e pode deixar um travessão solto no fim.
const TERMOS_INTERNOS = {
  CONTRATO_ASSINADO: "Contrato assinado",
  RECURSO_LIBERADO: "Recurso liberado pelo banco",
  REGISTRO_MANUAL: "Registro manual",
};

function limpaDescricao(text) {
  const legivel = Object.entries(TERMOS_INTERNOS).reduce((acc, [codigo, rotulo]) => acc.split(codigo).join(rotulo), String(text ?? ""));
  return humanizeText(legivel).replace(/\s*[—–-]\s*$/, "");
}

function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`;
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Célula de CSV que começa com =, +, - ou @ vira fórmula na planilha: neutraliza com apóstrofo.
function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Lê o CSV (vírgula ou ponto e vírgula) ou o JSON devolvido pelo contador.
function parseReturnFile(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const json = JSON.parse(trimmed);
    return { batchHash: json.batchHash || "", lines: Array.isArray(json) ? json : json.lines || [] };
  }
  let batchHash = "";
  const lines = [];
  for (const raw of trimmed.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row) continue;
    const hashMatch = /^#?\s*(?:hash|batchHash)\s*[:=,;]\s*([0-9a-fA-F]{64})/i.exec(row);
    if (hashMatch) {
      batchHash = hashMatch[1];
      continue;
    }
    const cells = row.split(/[;,](?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells[0].toLowerCase() === "sourcetype") continue;
    if (cells.length < 3) continue;
    lines.push({ sourceType: cells[0], sourceId: cells[1], amount: toNumber(cells[2]) });
  }
  return { batchHash, lines };
}

export default function FiscalPage() {
  const [invoices, setInvoices] = useState([]);
  const [dimobBatches, setDimobBatches] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [dimobYearOpen, setDimobYearOpen] = useState(false);
  const [dimobYear, setDimobYear] = useState(String(new Date().getFullYear()));
  const [savingDimob, setSavingDimob] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveReason, setResolveReason] = useState("");

  const [obligations, setObligations] = useState([]);
  const [obligationOpen, setObligationOpen] = useState(false);
  const [obligationForm, setObligationForm] = useState({ obligationType: "DIMOB_ANNUAL", referenceYear: String(new Date().getFullYear()), dueAt: "" });
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeNote, setCompleteNote] = useState("");

  const [dimobView, setDimobView] = useState(null);
  const [reconciling, setReconciling] = useState(false);

  const [exportBatches, setExportBatches] = useState([]);
  const [exportPeriod, setExportPeriod] = useState(currentPeriod());
  const [candidates, setCandidates] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [batchView, setBatchView] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ deltaAmount: "", reason: "" });
  const [returnHash, setReturnHash] = useState("");
  const [returnFile, setReturnFile] = useState(null);
  const [returnBusy, setReturnBusy] = useState(false);

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listInvoiceRequests(), listDimobBatches(), listFiscalReconciliations(), listFiscalObligations(), listExportBatches()])
      .then(([i, d, r, o, b]) => {
        setInvoices(i || []);
        setDimobBatches(d || []);
        setReconciliations(r || []);
        setObligations(o || []);
        setExportBatches(b || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os dados fiscais."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCheckStatus(invoiceRequestId) {
    setActionError("");
    try {
      await checkInvoiceStatus(invoiceRequestId);
      setActionMessage("Status consultado junto ao emissor.");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível consultar o status da nota.");
    }
  }

  async function handleCancelInvoice() {
    if (!cancelReason.trim()) return;
    setActionError("");
    try {
      await cancelInvoice(cancelTarget.id, { reason: cancelReason });
      setActionMessage("NFS-e cancelada.");
      setCancelTarget(null);
      setCancelReason("");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível cancelar a NFS-e.");
    }
  }

  async function handleGenerateDimob() {
    const year = toNumber(dimobYear);
    if (!year || Number.isNaN(year)) return;
    setSavingDimob(true);
    setActionError("");
    try {
      await generateDimobBatch({ referenceYear: year });
      setActionMessage("Batch DIMOB gerado — confira o hash e a versão na lista.");
      setDimobYearOpen(false);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível gerar o batch DIMOB.");
    } finally {
      setSavingDimob(false);
    }
  }

  async function handleCloseDimob(id) {
    setActionError("");
    try {
      await closeDimobBatch(id);
      setActionMessage("Batch DIMOB fechado. Qualquer correção exigirá uma nova versão.");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível fechar o batch DIMOB.");
    }
  }

  async function handleResolveReconciliation() {
    if (!resolveReason.trim()) return;
    setActionError("");
    try {
      await resolveFiscalReconciliation(resolveTarget.id, { reason: resolveReason });
      setActionMessage("Reconciliação resolvida.");
      setResolveTarget(null);
      setResolveReason("");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível resolver a reconciliação.");
    }
  }


  async function handleDownload(row, kind) {
    setActionError("");
    try {
      await downloadInvoiceFile(row.id, kind);
    } catch (err) {
      setActionError(err?.message || "Não foi possível baixar o arquivo.");
    }
  }

  async function handleViewDimob(batch) {
    setActionError("");
    try {
      const data = await listDimobRecords(batch.id);
      setDimobView({ batch, records: data.records || [] });
    } catch (err) {
      setActionError(err?.message || "Não foi possível carregar os registros do DIMOB.");
    }
  }

  async function handleDownloadDimob(batch) {
    setActionError("");
    try {
      await downloadDimobFile(batch.id);
    } catch (err) {
      setActionError(err?.message || "Não foi possível baixar o arquivo do DIMOB.");
    }
  }

  async function handleRunReconciliations() {
    setReconciling(true);
    setActionError("");
    try {
      const result = await runFiscalReconciliations();
      const checked = Object.values(result?.checked || {}).reduce((sum, n) => sum + n, 0);
      const aberto = result?.openTotal ?? (result?.opened || []).length;
      setActionMessage(
        aberto === 0
          ? `Conferência concluída: ${plural(checked, "item conferido", "itens conferidos")} e nenhuma divergência em aberto.`
          : `Conferência concluída: ${plural(checked, "item conferido", "itens conferidos")}. Há ${plural(aberto, "divergência em aberto", "divergências em aberto")} no total, veja a aba Reconciliações.`
      );
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível rodar a conferência.");
    } finally {
      setReconciling(false);
    }
  }

  async function handleCreateObligation() {
    const year = toNumber(obligationForm.referenceYear);
    if (!year) return;
    setActionError("");
    try {
      await createFiscalObligation({ obligationType: obligationForm.obligationType, referenceYear: year, dueAt: obligationForm.dueAt });
      setActionMessage("Obrigação cadastrada no calendário fiscal.");
      setObligationOpen(false);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível cadastrar a obrigação.");
    }
  }

  async function handleCompleteObligation() {
    if (completeNote.trim().length < 3) return;
    setActionError("");
    try {
      await completeFiscalObligation(completeTarget.id, { note: completeNote });
      setActionMessage("Obrigação concluída.");
      setCompleteTarget(null);
      setCompleteNote("");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível concluir a obrigação.");
    }
  }

  async function handleLoadCandidates() {
    setExportBusy(true);
    setActionError("");
    try {
      setCandidates(await listExportCandidates(exportPeriod));
    } catch (err) {
      setActionError(err?.message || "Não foi possível listar os lançamentos pendentes.");
    } finally {
      setExportBusy(false);
    }
  }

  async function handleCreateExport() {
    setExportBusy(true);
    setActionError("");
    try {
      await createExportBatch({ referencePeriod: exportPeriod });
      setActionMessage(`Batch de ${formatCompetence(exportPeriod)} gerado para o contador.`);
      setCandidates(null);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível gerar o batch.");
    } finally {
      setExportBusy(false);
    }
  }

  async function openBatch(batchId) {
    setActionError("");
    try {
      setBatchView(await getExportBatch(batchId));
      setReturnHash("");
      setReturnFile(null);
    } catch (err) {
      setActionError(err?.message || "Não foi possível abrir o batch.");
    }
  }

  function handleDownloadBatch() {
    const { batch, lines } = batchView;
    const rows = [
      `# hash;${batch.batchHash}`,
      "sourceType;sourceId;amount;description",
      ...lines.map((l) => [csvCell(l.sourceType), csvCell(l.sourceId), Number(l.amount).toFixed(2), csvCell(l.description)].join(";")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exportacao-contabil-${batch.referencePeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleAdjust() {
    const delta = toNumber(adjustForm.deltaAmount);
    if (!delta || adjustForm.reason.trim().length < 3) return;
    setActionError("");
    try {
      await adjustExportLine(adjustTarget.id, { deltaAmount: delta, reason: adjustForm.reason });
      setActionMessage("Ajuste registrado como linha nova; a linha original não foi alterada.");
      setAdjustTarget(null);
      setAdjustForm({ deltaAmount: "", reason: "" });
      setBatchView(await getExportBatch(batchView.batch.id));
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar o ajuste.");
    }
  }

  async function handleImportReturn() {
    setReturnBusy(true);
    setActionError("");
    try {
      const parsed = returnFile ? parseReturnFile(await returnFile.text()) : { batchHash: "", lines: [] };
      const result = await importAccountingReturn(batchView.batch.id, {
        batchHash: (returnHash.trim() || parsed.batchHash).toLowerCase(),
        fileName: returnFile?.name,
        lines: parsed.lines,
      });
      setActionMessage(
        result.status === "MATCHED"
          ? "Retorno do contador importado: tudo confere com a exportação."
          : "Retorno importado com divergências: a diferença foi aberta na aba Reconciliações."
      );
      setBatchView(await getExportBatch(batchView.batch.id));
      setReturnFile(null);
      setReturnHash("");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível importar o retorno do contador.");
    } finally {
      setReturnBusy(false);
    }
  }

  const invoiceColumns = [
    { key: "description", label: "Descrição", render: (row) => limpaDescricao(row.description) },
    { key: "amount", label: "Valor", render: (row) => formatBRL(row.amount) },
    { key: "status", label: "Status", render: (row) => <Badge tone={INVOICE_STATUS_TONE[row.status] || "neutral"}>{INVOICE_STATUS_LABEL[row.status] || row.status}</Badge> },
    { key: "number", label: "Número oficial", render: (row) => row.document?.documentNumber || "Aguardando autorização" },
    { key: "createdAt", label: "Solicitada em", render: (row) => formatDateTime(row.createdAt || row.created_at) },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className={styles.rowActions}>
          {row.document?.hasXml ? <Button variant="secondary" size="sm" onClick={() => handleDownload(row, "xml")}>XML</Button> : null}
          {row.document?.hasPdf ? <Button variant="secondary" size="sm" onClick={() => handleDownload(row, "pdf")}>PDF</Button> : null}
          {row.status === "SUBMITTED" || row.status === "UNKNOWN" ? (
            <Button variant="secondary" size="sm" onClick={() => handleCheckStatus(row.id)}>Consultar status</Button>
          ) : null}
          {row.status === "AUTHORIZED" ? (
            <Button variant="secondary" size="sm" onClick={() => setCancelTarget(row)}>Cancelar</Button>
          ) : null}
        </div>
      ),
    },
  ];

  const dimobColumns = [
    { key: "referenceYear", label: "Ano" },
    { key: "version", label: "Versão" },
    { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "CLOSED" ? "success" : "neutral"}>{row.status === "CLOSED" ? "Fechado" : "Rascunho"}</Badge> },
    { key: "snapshotHash", label: "Hash do snapshot", render: (row) => <code className={styles.hash}>{row.snapshotHash}</code> },
    { key: "createdAt", label: "Gerado em", render: (row) => formatDateTime(row.createdAt || row.created_at) },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className={styles.rowActions}>
          <Button variant="secondary" size="sm" onClick={() => handleViewDimob(row)}>Ver registros</Button>
          <Button variant="secondary" size="sm" onClick={() => handleDownloadDimob(row)}>Baixar arquivo</Button>
          {row.status !== "CLOSED" ? <Button variant="secondary" size="sm" onClick={() => handleCloseDimob(row.id)}>Fechar batch</Button> : null}
        </div>
      ),
    },
  ];

  const obligationColumns = [
    { key: "typeLabel", label: "Obrigação", render: (row) => OBLIGATION_TYPE_LABEL[row.obligationType] || row.obligationType },
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
    { key: "status", label: "Status", render: (row) => <Badge tone={OBLIGATION_STATUS_TONE[row.status] || "neutral"}>{OBLIGATION_STATUS_LABEL[row.status] || row.status}</Badge> },
    { key: "completedAt", label: "Concluída em", render: (row) => (row.completedAt ? formatDateTime(row.completedAt) : "Ainda não concluída") },
    {
      key: "actions",
      label: "",
      render: (row) => (row.status !== "COMPLETED" ? <Button variant="secondary" size="sm" onClick={() => { setCompleteTarget(row); setCompleteNote(""); }}>Concluir</Button> : null),
    },
  ];

  const exportColumns = [
    { key: "referencePeriod", label: "Período", render: (row) => formatCompetence(row.referencePeriod) },
    { key: "status", label: "Status", render: (row) => <Badge tone="success">Exportado</Badge> },
    { key: "batchHash", label: "Hash do batch", render: (row) => <code className={styles.hash}>{row.batchHash}</code> },
    { key: "createdAt", label: "Gerado em", render: (row) => formatDateTime(row.createdAt || row.created_at) },
    { key: "actions", label: "", render: (row) => <Button variant="secondary" size="sm" onClick={() => openBatch(row.id)}>Abrir</Button> },
  ];

  const candidateColumns = [
    { key: "sourceType", label: "Origem", render: (row) => SOURCE_TYPE_LABEL[row.sourceType] || row.sourceType },
    { key: "description", label: "Descrição", render: (row) => limpaDescricao(row.description) },
    { key: "amount", label: "Valor", render: (row) => formatBRL(row.amount) },
  ];

  const batchLineColumns = [
    { key: "sourceType", label: "Origem", render: (row) => SOURCE_TYPE_LABEL[row.sourceType] || row.sourceType },
    { key: "description", label: "Descrição", render: (row) => limpaDescricao(row.description) },
    { key: "amount", label: "Valor", render: (row) => formatBRL(row.amount) },
    { key: "kind", label: "Tipo", render: (row) => (row.adjustmentOfLineId ? "Ajuste" : "Original") },
    {
      key: "actions",
      label: "",
      render: (row) => (row.adjustmentOfLineId ? null : <Button variant="secondary" size="sm" onClick={() => { setAdjustTarget(row); setAdjustForm({ deltaAmount: "", reason: "" }); }}>Ajustar</Button>),
    },
  ];

  const returnColumns = [
    { key: "importedAt", label: "Importado em", render: (row) => formatDateTime(row.importedAt) },
    { key: "fileName", label: "Arquivo", render: (row) => row.fileName || "Sem nome de arquivo" },
    { key: "lineCount", label: "Linhas" },
    { key: "returnedTotal", label: "Total devolvido", render: (row) => formatBRL(row.returnedTotal) },
    { key: "status", label: "Resultado", render: (row) => <Badge tone={row.status === "MATCHED" ? "success" : "danger"}>{row.status === "MATCHED" ? "Confere" : "Divergente"}</Badge> },
  ];

  const dimobRecordColumns = [
    { key: "recordType", label: "Origem", render: (row) => (row.recordType === "LEASE" ? `Locação ${row.detailJson?.contractNumber || ""}`.trim() : "Comissão de correspondente") },
    { key: "amount", label: "Valor no ano", render: (row) => formatBRL(row.amount) },
    { key: "validationStatus", label: "Cadastro", render: (row) => <Badge tone={row.validationStatus === "VALID" ? "success" : "danger"}>{row.validationStatus === "VALID" ? "Completo" : "Com pendência"}</Badge> },
    { key: "validationIssues", label: "Pendências", render: (row) => ((row.validationIssues || []).length ? (row.validationIssues || []).map((i) => i.message).join(" ") : "Nenhuma pendência") },
  ];

  const reconciliationColumns = [
    { key: "reconciliationType", label: "Tipo", render: (row) => RECONCILIATION_TYPE_LABEL[row.reconciliationType] || row.reconciliationType },
    { key: "expectedAmount", label: "Esperado", render: (row) => formatBRL(row.expectedAmount) },
    { key: "actualAmount", label: "Real", render: (row) => formatBRL(row.actualAmount) },
    { key: "differenceAmount", label: "Diferença", render: (row) => formatBRL(row.differenceAmount) },
    { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "OPEN" ? "danger" : "success"}>{row.status === "OPEN" ? "Em aberto" : "Resolvida"}</Badge> },
    { key: "detectedAt", label: "Detectada em", render: (row) => formatDateTime(row.detectedAt || row.detected_at) },
    {
      key: "actions",
      label: "",
      render: (row) => (row.status === "OPEN" ? <Button variant="secondary" size="sm" onClick={() => setResolveTarget(row)}>Resolver</Button> : null),
    },
  ];

  return (
    <AppShell title="Fiscal" backHref="/painel/correspondente">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
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
                  <Table columns={invoiceColumns} rows={invoices} loading={loading} emptyMessage="Nenhuma NFS-e solicitada ainda." />
                </Card>
              ),
            },
            {
              label: "DIMOB",
              content: (
                <Card title="Batches DIMOB (declaração anual)">
                  <div className={styles.toolbarRow}>
                    <Button onClick={() => setDimobYearOpen(true)}>Gerar batch do ano</Button>
                  </div>
                  <Table columns={dimobColumns} rows={dimobBatches} loading={loading} emptyMessage="Nenhum batch DIMOB gerado ainda." />
                </Card>
              ),
            },
            {
              label: "Calendário",
              content: (
                <Card title="Calendário de obrigações fiscais">
                  <div className={styles.toolbarRow}>
                    <Button onClick={() => setObligationOpen(true)}>Cadastrar obrigação</Button>
                  </div>
                  <Table columns={obligationColumns} rows={obligations} loading={loading} emptyMessage="Nenhuma obrigação cadastrada. Gerar um batch DIMOB cadastra a do ano automaticamente." />
                </Card>
              ),
            },
            {
              label: "Exportação contábil",
              content: (
                <Card title="Exportação para o contador">
                  <div className={styles.toolbarRow}>
                    <div className={styles.inlineField}>
                      <FormField label="Mês de referência" htmlFor="export-period">
                        <Input id="export-period" type="month" value={exportPeriod} onChange={(e) => { setExportPeriod(e.target.value); setCandidates(null); }} />
                      </FormField>
                    </div>
                    <Button variant="secondary" onClick={handleLoadCandidates} loading={exportBusy}>Ver lançamentos pendentes</Button>
                  </div>
                  {candidates ? (
                    <div className={styles.candidates}>
                      <Table columns={candidateColumns} rows={candidates} emptyMessage="Nada pendente de exportação neste período." />
                      {candidates.length > 0 ? (
                        <div className={styles.toolbarRow}>
                          <Button onClick={handleCreateExport} loading={exportBusy}>Gerar batch com {plural(candidates.length, "lançamento", "lançamentos")}</Button>
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
                  <div className={styles.toolbarRow}>
                    <Button onClick={handleRunReconciliations} loading={reconciling}>Conferir agora</Button>
                  </div>
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

      <Modal open={dimobYearOpen} onClose={() => setDimobYearOpen(false)} title="Gerar batch DIMOB">
        <FormField label="Ano de referência" htmlFor="dimob-year">
          <Input id="dimob-year" value={dimobYear} onChange={(e) => setDimobYear(e.target.value)} />
        </FormField>
        <p className={styles.helper}>
          Gerar de novo para o mesmo ano cria uma nova versão — a anterior nunca é apagada ou sobrescrita.
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setDimobYearOpen(false)}>Cancelar</Button>
          <Button onClick={handleGenerateDimob} loading={savingDimob}>Gerar</Button>
        </div>
      </Modal>

      <Modal open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Cancelar NFS-e">
        <FormField label="Motivo do cancelamento" htmlFor="cancel-reason">
          <Input id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        </FormField>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setCancelTarget(null)}>Voltar</Button>
          <Button onClick={handleCancelInvoice} disabled={!cancelReason.trim()}>Confirmar cancelamento</Button>
        </div>
      </Modal>

      <Modal open={Boolean(resolveTarget)} onClose={() => setResolveTarget(null)} title="Resolver reconciliação">
        <FormField label="Motivo/explicação da divergência" htmlFor="resolve-reason">
          <Input id="resolve-reason" value={resolveReason} onChange={(e) => setResolveReason(e.target.value)} />
        </FormField>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setResolveTarget(null)}>Voltar</Button>
          <Button onClick={handleResolveReconciliation} disabled={!resolveReason.trim()}>Confirmar resolução</Button>
        </div>
      </Modal>

      <Modal open={obligationOpen} onClose={() => setObligationOpen(false)} title="Cadastrar obrigação fiscal">
        <FormField label="Obrigação" htmlFor="obl-type">
          <Select id="obl-type" value={obligationForm.obligationType} onChange={(e) => setObligationForm((f) => ({ ...f, obligationType: e.target.value }))}>
            <option value="DIMOB_ANNUAL">DIMOB anual</option>
          </Select>
        </FormField>
        <FormField label="Ano-base" htmlFor="obl-year">
          <Input id="obl-year" value={obligationForm.referenceYear} onChange={(e) => setObligationForm((f) => ({ ...f, referenceYear: e.target.value }))} />
        </FormField>
        <FormField label="Prazo da entrega" htmlFor="obl-due" helper="Vazio usa o último dia útil de fevereiro do ano seguinte. Feriados não são considerados: confirme com o contador.">
          <Input id="obl-due" type="date" value={obligationForm.dueAt} onChange={(e) => setObligationForm((f) => ({ ...f, dueAt: e.target.value }))} />
        </FormField>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setObligationOpen(false)}>Voltar</Button>
          <Button onClick={handleCreateObligation}>Cadastrar</Button>
        </div>
      </Modal>

      <Modal open={Boolean(completeTarget)} onClose={() => setCompleteTarget(null)} title="Concluir obrigação">
        <FormField label="Observação" htmlFor="obl-note" helper="Ex.: entregue pelo contador, protocolo e data.">
          <Input id="obl-note" value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} />
        </FormField>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setCompleteTarget(null)}>Voltar</Button>
          <Button onClick={handleCompleteObligation} disabled={completeNote.trim().length < 3}>Concluir</Button>
        </div>
      </Modal>

      <Modal open={Boolean(dimobView)} onClose={() => setDimobView(null)} title={dimobView ? `Registros do DIMOB ${dimobView.batch.referenceYear} — versão ${dimobView.batch.version}` : "Registros do DIMOB"} size="lg">
        {dimobView ? (
          <>
            <p className={styles.helper}>
              Total do batch: {formatBRL(dimobView.records.reduce((sum, r) => sum + Number(r.amount), 0))} em {dimobView.records.length} registro(s), {dimobView.records.filter((r) => r.validationStatus === "INVALID").length} com pendência de cadastro. Batch com pendência não pode ser fechado: corrija o cadastro e gere uma nova versão.
            </p>
            <Table columns={dimobRecordColumns} rows={dimobView.records} emptyMessage="Este batch não tem registros: não havia aluguel recebido nem comissão recebível no ano." />
          </>
        ) : null}
      </Modal>

      <Modal open={Boolean(batchView)} onClose={() => setBatchView(null)} title={batchView ? `Exportação ${formatCompetence(batchView.batch.referencePeriod)}` : "Exportação"} size="lg">
        {batchView ? (
          <div className={styles.batchBody}>
            <p className={styles.helper}>Hash do batch (o contador precisa devolvê-lo no arquivo de retorno): <code className={styles.hash}>{batchView.batch.batchHash}</code></p>
            <div className={styles.toolbarRow}>
              <Button variant="secondary" onClick={handleDownloadBatch}>Baixar CSV para o contador</Button>
            </div>
            <Table columns={batchLineColumns} rows={batchView.lines} emptyMessage="Batch sem linhas." />
            <h4 className={styles.subtitle}>Retorno do contador</h4>
            <FormField label="Hash informado no arquivo" htmlFor="return-hash" helper="Se o arquivo trouxer a linha “# hash;…”, pode deixar vazio.">
              <Input id="return-hash" value={returnHash} onChange={(e) => setReturnHash(e.target.value)} />
            </FormField>
            <FormField label="Arquivo de retorno (CSV ou JSON)" htmlFor="return-file">
              <input id="return-file" type="file" accept=".csv,.json,.txt" onChange={(e) => setReturnFile(e.target.files?.[0] || null)} />
            </FormField>
            <div className={styles.toolbarRow}>
              <Button onClick={handleImportReturn} loading={returnBusy} disabled={!returnFile}>Importar retorno</Button>
            </div>
            <Table columns={returnColumns} rows={batchView.returns} emptyMessage="Nenhum retorno importado para este batch ainda." />
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(adjustTarget)} onClose={() => setAdjustTarget(null)} title="Ajustar linha exportada">
        <p className={styles.helper}>O ajuste cria uma linha nova no mesmo batch. A linha original nunca é editada.</p>
        <FormField label="Valor do ajuste (R$)" htmlFor="adjust-delta" helper="Positivo acrescenta; negativo (com sinal de menos) reduz o valor exportado.">
          <DecimalInput id="adjust-delta" allowNegative value={adjustForm.deltaAmount} onChange={(e) => setAdjustForm((f) => ({ ...f, deltaAmount: e.target.value }))} placeholder="0,00" />
        </FormField>
        <FormField label="Motivo do ajuste" htmlFor="adjust-reason">
          <Input id="adjust-reason" value={adjustForm.reason} onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))} />
        </FormField>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setAdjustTarget(null)}>Voltar</Button>
          <Button onClick={handleAdjust} disabled={!toNumber(adjustForm.deltaAmount) || adjustForm.reason.trim().length < 3}>Registrar ajuste</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
