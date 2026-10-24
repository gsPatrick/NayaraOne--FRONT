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
} from "@/lib/api/correspondent";
import { formatDateTime, formatBRL, toNumber, humanizeText } from "@/lib/format";
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
};

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

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listInvoiceRequests(), listDimobBatches(), listFiscalReconciliations()])
      .then(([i, d, r]) => {
        setInvoices(i || []);
        setDimobBatches(d || []);
        setReconciliations(r || []);
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

  const invoiceColumns = [
    { key: "description", label: "Descrição", render: (row) => humanizeText(row.description) },
    { key: "amount", label: "Valor", render: (row) => formatBRL(row.amount) },
    { key: "status", label: "Status", render: (row) => <Badge tone={INVOICE_STATUS_TONE[row.status] || "neutral"}>{INVOICE_STATUS_LABEL[row.status] || row.status}</Badge> },
    { key: "createdAt", label: "Solicitada em", render: (row) => formatDateTime(row.createdAt || row.created_at) },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className={styles.rowActions}>
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
    { key: "snapshotHash", label: "Hash do snapshot", render: (row) => <code className={styles.hash}>{(row.snapshotHash || "").slice(0, 16)}…</code> },
    { key: "createdAt", label: "Gerado em", render: (row) => formatDateTime(row.createdAt || row.created_at) },
    {
      key: "actions",
      label: "",
      render: (row) => (row.status !== "CLOSED" ? <Button variant="secondary" size="sm" onClick={() => handleCloseDimob(row.id)}>Fechar batch</Button> : null),
    },
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
              label: "Reconciliações",
              content: (
                <Card title="Divergências fiscais detectadas">
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
    </AppShell>
  );
}
