"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StatTile from "@/components/molecules/StatTile/StatTile";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import {
  listPurchaseSuggestions,
  generatePurchaseSuggestions,
  approvePurchaseSuggestion,
  rejectPurchaseSuggestion,
  listLossCaseAnomalies,
} from "@/lib/api/inventory";
import { getSetting, updateSetting } from "@/lib/api/settings";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatBRL, formatDateTime, formatQuantity, toNumber } from "@/lib/format";
import styles from "../../obras/lista/page.module.css";

// NAY Estoque (EST-013 / Guia §12 / EST-TS-14). A NAY só SUGERE: esta tela lista as sugestões
// de compra calculadas a partir de consumo, obras ativas, lead time e estoque mínimo, e a
// ÚNICA ação com efeito é humana ("Aprovar e criar pedido"), que abre uma requisição de compra
// REQUESTED — ainda sujeita ao workflow de aprovação de Compras.

const LEAD_TIME_SETTING_KEY = "inventory.nay_default_lead_time_days";
const STATUS_LABELS = { PENDING: "Pendente", ACCEPTED: "Aprovada (pedido criado)", REJECTED: "Rejeitada", EXPIRED: "Expirada" };
const STATUS_TONE = { PENDING: "warning", ACCEPTED: "success", REJECTED: "neutral", EXPIRED: "neutral" };
const RISK_LABELS = { HIGH: "Risco de falta", MEDIUM: "Abaixo do mínimo", LOW: "Reposição" };
const RISK_TONE = { HIGH: "danger", MEDIUM: "warning", LOW: "info" };
const LEAD_SOURCE_LABELS = { OBSERVED: "observado", TENANT_SETTING: "padrão da empresa", DEFAULT: "padrão do sistema" };
const FLAG_LABELS = {
  RECURRENCE_ITEM_LOCATION: "Recorrência item/local",
  RECURRENCE_RESPONSIBLE: "Recorrência do responsável",
  VALUE_ABOVE_HISTORY: "Valor acima do histórico",
};

function toBrDecimalString(value) {
  if (value == null || Number.isNaN(Number(value))) return "";
  return String(value).replace(".", ",");
}

export default function SugestoesNayPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [anomalies, setAnomalies] = useState(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [perms, setPerms] = useState({ canGenerate: false, canDecide: false, canReadSettings: false, canUpdateSettings: false });

  const [approveTarget, setApproveTarget] = useState(null);
  const [approveForm, setApproveForm] = useState({ quantity: "", notes: "" });
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deciding, setDeciding] = useState(false);

  const [leadTime, setLeadTime] = useState({ loaded: false, value: "", saved: null, saving: false });

  // Permissões vêm da sessão (localStorage) — lidas só no cliente pra não divergir do SSR.
  useEffect(() => {
    setPerms({
      canGenerate: hasPermission("inventory:create"),
      canDecide: hasPermission("procurement:create"),
      canReadSettings: hasPermission("settings:read"),
      canUpdateSettings: hasPermission("settings:update"),
    });
  }, []);

  function load(status = statusFilter) {
    setLoading(true);
    setLoadError("");
    listPurchaseSuggestions({ status })
      .then((s) => setSuggestions(s || []))
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar as sugestões da NAY."))
      .finally(() => setLoading(false));
    // Isolado: falha nos indícios de perda nunca derruba a lista de sugestões de compra.
    listLossCaseAnomalies()
      .then((a) => setAnomalies(a || null))
      .catch(() => setAnomalies(null));
  }
  useEffect(() => { load(statusFilter); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!perms.canReadSettings) return;
    getSetting(LEAD_TIME_SETTING_KEY)
      .then((row) => {
        const v = row?.value;
        setLeadTime((p) => ({ ...p, loaded: true, value: v != null ? String(v) : "", saved: v != null ? Number(v) : null }));
      })
      // 404 = ainda não configurado para a empresa (a NAY usa o padrão do sistema).
      .catch(() => setLeadTime((p) => ({ ...p, loaded: true, value: "", saved: null })));
  }, [perms.canReadSettings]);

  async function handleGenerate() {
    setGenerating(true);
    setActionError("");
    setNotice(null);
    try {
      const result = await generatePurchaseSuggestions({});
      const parts = [`${result?.suggestions?.length || 0} sugestão(ões) ativa(s)`];
      if (result?.expiredCount) parts.push(`${result.expiredCount} expirada(s) por não serem mais necessárias`);
      if (result?.suppressedByRecentRejection) parts.push(`${result.suppressedByRecentRejection} omitida(s) por rejeição recente`);
      setNotice({ tone: "info", text: `Recalculado: ${parts.join(", ")}. Nenhuma compra foi criada automaticamente.` });
      if (statusFilter !== "PENDING") setStatusFilter("PENDING");
      else load("PENDING");
    } catch (err) {
      setActionError(err?.message || "Não foi possível recalcular as sugestões.");
    } finally {
      setGenerating(false);
    }
  }

  function openApprove(row) {
    setApproveTarget(row);
    setApproveForm({ quantity: toBrDecimalString(row.suggestedQuantity), notes: "" });
    setActionError("");
  }

  const approveQuantity = toNumber(approveForm.quantity);
  const approveValid = !Number.isNaN(approveQuantity) && approveQuantity > 0;

  async function handleApprove() {
    if (!approveTarget || !approveValid) return;
    setDeciding(true);
    setActionError("");
    try {
      const result = await approvePurchaseSuggestion(approveTarget.id, { quantity: approveQuantity, notes: approveForm.notes || undefined });
      setApproveTarget(null);
      setNotice({
        tone: "success",
        text: `Requisição de compra criada (${result?.purchaseRequest?.id?.slice(0, 8) || "—"}) e enviada para aprovação em Compras.`,
        link: "/painel/compras",
      });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível aprovar a sugestão.");
    } finally {
      setDeciding(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setDeciding(true);
    setActionError("");
    try {
      await rejectPurchaseSuggestion(rejectTarget.id, { reason: rejectReason || undefined });
      setRejectTarget(null);
      setRejectReason("");
      setNotice({ tone: "info", text: "Sugestão rejeitada. A NAY não vai reapresentá-la nos próximos dias, salvo risco de falta." });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível rejeitar a sugestão.");
    } finally {
      setDeciding(false);
    }
  }

  const leadTimeNumber = toNumber(leadTime.value);
  const leadTimeValid = !Number.isNaN(leadTimeNumber) && Number.isInteger(leadTimeNumber) && leadTimeNumber >= 0 && leadTimeNumber <= 365;

  async function handleSaveLeadTime() {
    if (!leadTimeValid) return;
    setLeadTime((p) => ({ ...p, saving: true }));
    setActionError("");
    try {
      await updateSetting(LEAD_TIME_SETTING_KEY, leadTimeNumber);
      setLeadTime((p) => ({ ...p, saving: false, saved: leadTimeNumber }));
      setNotice({ tone: "success", text: `Lead time padrão salvo: ${leadTimeNumber} dia(s). Vale para itens sem histórico de reposição.` });
    } catch (err) {
      setLeadTime((p) => ({ ...p, saving: false }));
      setActionError(err?.message || "Não foi possível salvar o lead time padrão.");
    }
  }

  const pending = suggestions.filter((s) => s.status === "PENDING");
  const highRisk = pending.filter((s) => s.riskLevel === "HIGH").length;
  const estimatedTotal = pending.reduce((sum, s) => sum + (Number(s.estimatedCost) || 0), 0);
  const flaggedCases = anomalies?.cases || [];

  const columns = [
    {
      key: "item",
      label: "Item",
      width: "20%",
      render: (row) => (
        <div>
          <span className={styles.nameMain}>{row.itemName || "—"}</span>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{row.sku || ""} · {row.locationName || "—"}</div>
        </div>
      ),
    },
    {
      key: "stock",
      label: "Saldo / projetado",
      width: "13%",
      render: (row) => `${formatQuantity(row.quantityOnHand)} / ${formatQuantity(row.projectedOnHand)}`,
    },
    {
      key: "demand",
      label: "Consumo e obras",
      width: "16%",
      render: (row) => (
        <div style={{ fontSize: 13 }}>
          <div>{formatQuantity(row.dailyConsumptionRate)}/dia ({row.windowDays}d)</div>
          <div style={{ color: "var(--color-text-muted)" }}>
            {row.activeProjects?.length ? `${row.activeProjects.length} obra(s) ativa(s), ${formatQuantity(row.pendingProjectDemand)} pendente` : "Sem obra ativa pedindo"}
          </div>
        </div>
      ),
    },
    {
      key: "lead",
      label: "Lead time",
      width: "11%",
      render: (row) => `${row.leadTimeDays} d (${LEAD_SOURCE_LABELS[row.leadTimeSource] || row.leadTimeSource})`,
    },
    {
      key: "suggested",
      label: "Sugerido",
      width: "12%",
      render: (row) => (
        <div>
          <strong>{formatQuantity(row.suggestedQuantity)} {row.unitOfMeasure || ""}</strong>
          {row.estimatedCost != null ? <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>≈ {formatBRL(row.estimatedCost)}</div> : null}
        </div>
      ),
    },
    {
      key: "risk",
      label: "Situação",
      width: "12%",
      render: (row) =>
        row.status === "PENDING" ? (
          <Badge tone={RISK_TONE[row.riskLevel]}>{RISK_LABELS[row.riskLevel] || row.riskLevel}</Badge>
        ) : (
          <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status] || row.status}</Badge>
        ),
    },
    {
      key: "actions",
      label: "",
      width: "16%",
      render: (row) =>
        row.status === "PENDING" && perms.canDecide ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button size="sm" onClick={() => openApprove(row)}>Aprovar e criar pedido</Button>
            <Button size="sm" variant="secondary" onClick={() => { setRejectTarget(row); setRejectReason(""); setActionError(""); }}>Rejeitar</Button>
          </div>
        ) : row.decision?.purchaseRequestId ? (
          <Link href="/painel/compras" style={{ fontSize: 13 }}>Ver em Compras</Link>
        ) : null,
    },
  ];

  const anomalyColumns = [
    { key: "case", label: "Caso", width: "14%", render: (row) => <code>{row.lossCaseId.slice(0, 8)}</code> },
    { key: "status", label: "Status do caso", width: "14%", render: (row) => <Badge tone={row.status === "OPEN" ? "warning" : "neutral"}>{row.status === "OPEN" ? "Em análise" : row.status === "APPROVED" ? "Aprovada" : "Rejeitada"}</Badge> },
    { key: "value", label: "Valor", width: "12%", render: (row) => (row.value != null ? formatBRL(row.value) : "—") },
    {
      key: "flags",
      label: "Indícios (NAY)",
      width: "60%",
      render: (row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(row.flags || []).map((f) => (
            <div key={f.code} style={{ fontSize: 13 }}>
              <Badge tone={f.severity === "HIGH" ? "danger" : "warning"}>{FLAG_LABELS[f.code] || f.code}</Badge> {f.message}
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Sugestões da NAY — Estoque" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar">{loadError}</Alert> : null}
      {actionError ? (
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}
      {notice ? (
        <Alert tone={notice.tone}>
          {notice.text} {notice.link ? <Link href={notice.link}>Abrir Compras</Link> : null}
        </Alert>
      ) : null}

      <Alert tone="info" title="A NAY sugere, você decide">
        Sugestões calculadas por regras auditáveis (consumo recente, obras ativas, lead time e estoque mínimo). Nenhuma compra é criada sem a sua aprovação — e a requisição criada ainda passa pela aprovação de Compras.
      </Alert>

      <div className={styles.grid}>
        <StatTile label="Sugestões pendentes" value={statusFilter === "PENDING" ? pending.length : "—"} tone="neutral" icon="chart" />
        <StatTile label="Risco de falta" value={statusFilter === "PENDING" ? highRisk : "—"} tone={highRisk > 0 ? "danger" : "success"} icon="bell" />
        <StatTile label="Custo estimado (pendentes)" value={statusFilter === "PENDING" ? formatBRL(estimatedTotal) : "—"} tone="neutral" icon="money" />
        <StatTile label="Casos de perda com indício" value={flaggedCases.length} tone={flaggedCases.length > 0 ? "warning" : "success"} icon="check" />
      </div>

      <Card title="Sugestões de compra" subtitle={`Por item e almoxarifado${suggestions[0]?.computedAt ? ` — último cálculo ${formatDateTime(suggestions[0].computedAt)}` : ""}`}>
        <div className={styles.toolbar}>
          <Select className={styles.filter} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="PENDING">Pendentes</option>
            <option value="ACCEPTED">Aprovadas</option>
            <option value="REJECTED">Rejeitadas</option>
            <option value="EXPIRED">Expiradas</option>
            <option value="ALL">Todas</option>
          </Select>
        </div>
        <Table
          columns={columns}
          rows={loading ? [] : suggestions}
          loading={loading}
          emptyMessage={statusFilter === "PENDING" ? "Nenhuma sugestão pendente. Use \"Recalcular\" para a NAY analisar o estoque agora." : "Nenhuma sugestão neste filtro."}
        />
      </Card>

      <Card title="Indícios em casos de perda" subtitle={`Recorrência e valor fora do padrão nos últimos ${anomalies?.parameters?.windowDays || 90} dias`}>
        <Alert tone="warning">
          {anomalies?.disclaimer || "Sugestão da NAY: indícios para apoiar a decisão humana. Não atribui culpa, não decide o caso e não gera cobrança."}{" "}
          A decisão continua em <Link href="/painel/estoque/perdas">Perdas &amp; Extravios</Link>.
        </Alert>
        <Table columns={anomalyColumns} rows={loading ? [] : flaggedCases} loading={loading} emptyMessage="Nenhum indício de anomalia nos casos de perda da janela." />
      </Card>

      {perms.canReadSettings ? (
        <Card title="Parâmetro: lead time padrão" subtitle="Usado só para itens sem histórico real de reposição (pedido → recebimento)">
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <FormField label="Lead time padrão (dias)" helper={leadTime.saved == null ? "Não configurado — a NAY usa 7 dias e sinaliza isso na sugestão." : `Atual: ${leadTime.saved} dia(s).`}>
              <DecimalInput value={leadTime.value} onChange={(e) => setLeadTime((p) => ({ ...p, value: e.target.value }))} placeholder="Ex.: 10" disabled={!perms.canUpdateSettings} />
            </FormField>
            {perms.canUpdateSettings ? (
              <Button variant="secondary" onClick={handleSaveLeadTime} loading={leadTime.saving} disabled={!leadTimeValid || leadTimeNumber === leadTime.saved}>Salvar</Button>
            ) : null}
          </div>
          {leadTime.value && !leadTimeValid ? <p style={{ color: "var(--color-danger)", fontSize: 13 }}>Informe um número inteiro de dias entre 0 e 365.</p> : null}
        </Card>
      ) : null}

      {perms.canGenerate ? (
        <StickyActionBar>
          <Button onClick={handleGenerate} loading={generating}>
            <Icon name="chart" size={18} /> Recalcular sugestões
          </Button>
        </StickyActionBar>
      ) : null}

      <Modal
        open={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        title="Aprovar sugestão e criar requisição de compra"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveTarget(null)}>Cancelar</Button>
            <Button onClick={handleApprove} loading={deciding} disabled={!approveValid}>Aprovar e criar pedido</Button>
          </>
        }
      >
        {approveTarget ? (
          <>
            <p style={{ marginTop: 0 }}>
              <strong>{approveTarget.itemName}</strong> — {approveTarget.locationName}
            </p>
            <ul style={{ margin: "0 0 var(--space-4)", paddingLeft: 18, fontSize: 14 }}>
              {(approveTarget.reasons || []).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <FormField label={`Quantidade (${approveTarget.unitOfMeasure || "un"})`} required helper={`Sugerido pela NAY: ${formatQuantity(approveTarget.suggestedQuantity)}. Você pode ajustar.`}>
              <DecimalInput value={approveForm.quantity} onChange={(e) => setApproveForm((p) => ({ ...p, quantity: e.target.value }))} />
            </FormField>
            <FormField label="Observações">
              <Input value={approveForm.notes} onChange={(e) => setApproveForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Opcional" />
            </FormField>
            <Alert tone="info">A requisição nasce como “Solicitada” e segue o fluxo normal de aprovação, cotação e pedido em Compras.</Alert>
          </>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Rejeitar sugestão"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleReject} loading={deciding}>Rejeitar</Button>
          </>
        }
      >
        <FormField label="Motivo" helper="Opcional — fica registrado na sugestão e na auditoria.">
          <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ex.: item será substituído" />
        </FormField>
      </Modal>
    </AppShell>
  );
}
