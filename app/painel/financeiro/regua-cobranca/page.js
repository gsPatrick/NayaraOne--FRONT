"use client";

// Régua de cobrança de locação (REG-LOC-004, Motor de Regras). O backend (collectionCadence.service.js)
// já executava a régua via job, mas sem tela: aqui o gestor vê a versão vigente, edita as etapas
// (dia relativo ao vencimento + ação), publica uma nova versão com confirmação e acompanha as
// etapas executadas por competência. Uma versão nova só vale para competências que ainda não
// começaram a cadência — as já em andamento continuam na versão em que começaram.

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import { getCollectionCadence, publishCollectionCadence } from "@/lib/api/billing";
import { listContracts } from "@/lib/api/legal";
import { ApiError, getBaseUrl, refreshSessionSilently } from "@/lib/api/client";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatBRL, formatDate, formatDateTime, formatContractLabel } from "@/lib/format";
import styles from "./page.module.css";

const ACTION_LABELS = {
  NOTIFY: "Notificação interna",
  TASK: "Tarefa de cobrança",
  ESCALATE_LEGAL: "Escalonar ao jurídico",
};
const OUTCOME_LABELS = { EXECUTED: "Executada", SKIPPED_SUPERSEDED: "Pulada (superada)" };
const PAGE_SIZE = 20;
const CODE_PATTERN = /^[A-Z0-9_-]{2,40}$/;
const INT_PATTERN = /^-?\d+$/;

// Ajuste local (19/10/2026): o apiFetch compartilhado devolve só `data` e descarta o bloco
// `pagination` da API — sem ele a tela não sabia o total de páginas. Em vez de mudar o
// client.js (usado por todas as telas), esta busca lê o envelope completo aqui.
async function fetchStepsPage(params, retried = false) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  const qs = new URLSearchParams(clean).toString();
  const session = getSession();
  let response;
  try {
    response = await fetch(`${getBaseUrl()}/billing/collection-cadence/steps${qs ? `?${qs}` : ""}`, {
      headers: { "Content-Type": "application/json", ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}) },
    });
  } catch {
    throw new ApiError("Não foi possível falar com o servidor. Verifique sua conexão.", { code: "NETWORK_ERROR" });
  }
  if (response.status === 401 && !retried) {
    await refreshSessionSilently();
    return fetchStepsPage(params, true);
  }
  const parsed = await response.json().catch(() => null);
  if (!response.ok || !parsed?.success) {
    const error = parsed?.error || {};
    throw new ApiError(error.message || "Erro inesperado ao comunicar com a API.", { code: error.code || "UNKNOWN_ERROR", status: response.status });
  }
  return { rows: parsed.data || [], total: Number(parsed.pagination?.total ?? (parsed.data || []).length) };
}

function describeOffset(days) {
  if (days < 0) return `${Math.abs(days)} dia(s) antes do vencimento`;
  return `${days} dia(s) após o vencimento`;
}

function toEditable(steps) {
  return (steps || []).map((s) => ({ code: s.code, offsetDays: String(s.offsetDays), action: s.action }));
}

function validateDraft(draft, limits) {
  if (draft.length === 0) return "A régua precisa ter ao menos uma etapa.";
  if (draft.length > (limits?.maxSteps || 20)) return `A régua pode ter no máximo ${limits?.maxSteps || 20} etapas.`;
  const codes = new Set();
  const offsets = new Set();
  for (const step of draft) {
    const code = step.code.trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) return `Código inválido: "${step.code}" (use A-Z, 0-9, _ ou -, de 2 a 40 caracteres).`;
    if (!INT_PATTERN.test(step.offsetDays.trim())) return `A etapa ${code} precisa de um dia inteiro (ex.: -3 ou 5).`;
    const offset = Number.parseInt(step.offsetDays.trim(), 10);
    const min = limits?.minOffset ?? -30;
    const max = limits?.maxOffset ?? 365;
    if (offset < min || offset > max) return `A etapa ${code} precisa ficar entre ${min} e ${max} dias.`;
    if (offset === 0) return `A etapa ${code} não pode ser no próprio dia do vencimento.`;
    if (!ACTION_LABELS[step.action]) return `Escolha a ação da etapa ${code}.`;
    if (codes.has(code) || offsets.has(offset)) return "Códigos e dias das etapas não podem se repetir.";
    codes.add(code);
    offsets.add(offset);
  }
  return "";
}

export default function ReguaCobrancaPage() {
  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const [draft, setDraft] = useState([]);
  const [draftError, setDraftError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const [filters, setFilters] = useState({ period: "", outcome: "", action: "", contractId: "" });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [page, setPage] = useState(1);
  const [stepsTotal, setStepsTotal] = useState(0);
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    listContracts()
      .then((list) => setContracts(list || []))
      .catch(() => setContracts([]));
  }, []);
  const [steps, setSteps] = useState([]);
  const [stepsLoading, setStepsLoading] = useState(true);

  useEffect(() => {
    setCanManage(hasPermission("billing:cadence:manage"));
  }, []);

  const loadRule = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCollectionCadence();
      setRule(data);
      setDraft(toEditable(data?.current?.steps || data?.defaultSteps));
    } catch (err) {
      setActionError(err?.message || "Não foi possível carregar a régua de cobrança.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSteps = useCallback(async () => {
    setStepsLoading(true);
    try {
      const { rows, total } = await fetchStepsPage({ ...appliedFilters, page, pageSize: PAGE_SIZE });
      setSteps(rows);
      setStepsTotal(total);
    } catch (err) {
      setActionError(err?.message || "Não foi possível carregar as etapas executadas.");
    } finally {
      setStepsLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    loadRule();
  }, [loadRule]);

  useEffect(() => {
    loadSteps();
  }, [loadSteps]);

  function updateStep(index, field, value) {
    setDraft((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addStep() {
    setDraft((prev) => [...prev, { code: "", offsetDays: "", action: "NOTIFY" }]);
  }

  function removeStep(index) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePublishClick() {
    setSuccess("");
    const message = validateDraft(draft, rule?.limits);
    setDraftError(message);
    if (!message) setConfirmOpen(true);
  }

  async function runPublish() {
    setPublishing(true);
    setActionError("");
    try {
      const payload = draft.map((s) => ({
        code: s.code.trim().toUpperCase(),
        offsetDays: Number.parseInt(s.offsetDays.trim(), 10),
        action: s.action,
      }));
      const version = await publishCollectionCadence(payload);
      setConfirmOpen(false);
      setSuccess(`Versão ${version?.versionNumber ?? ""} da régua publicada.`);
      await loadRule();
    } catch (err) {
      setActionError(err?.message || "Falha ao publicar a nova versão da régua.");
    } finally {
      setPublishing(false);
    }
  }

  // O8 (M45): mudar um select (ou o mês) já aplica o filtro — sem precisar clicar em "Filtrar".
  function changeFilter(key, value) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      setPage(1);
      setAppliedFilters(next);
      return next;
    });
  }

  function applyFilters(e) {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  const totalPages = Math.max(1, Math.ceil(stepsTotal / PAGE_SIZE));
  const current = rule?.current;
  const sortedPreview = [...draft]
    .filter((s) => INT_PATTERN.test(s.offsetDays.trim()))
    .sort((a, b) => Number.parseInt(a.offsetDays, 10) - Number.parseInt(b.offsetDays, 10));

  const versionColumns = [
    { key: "versionNumber", label: "Versão", render: (row) => `v${row.versionNumber}` },
    { key: "effectiveFrom", label: "Vigente desde", render: (row) => formatDateTime(row.effectiveFrom) },
    { key: "effectiveUntil", label: "Até", render: (row) => (row.effectiveUntil ? formatDateTime(row.effectiveUntil) : "—") },
    {
      key: "steps",
      label: "Etapas",
      render: (row) => (row.steps || []).map((s) => `${s.offsetDays > 0 ? "D+" : "D"}${s.offsetDays} ${ACTION_LABELS[s.action] || s.action}`).join(" · "),
    },
    {
      key: "status",
      label: "Situação",
      render: (row) => (row.isCurrent ? <Badge tone="success">Vigente</Badge> : <Badge tone="neutral">Encerrada</Badge>),
    },
  ];

  const stepColumns = [
    { key: "businessDate", label: "Data", render: (row) => formatDate(row.businessDate) },
    { key: "period", label: "Competência", render: (row) => row.period || "—" },
    { key: "dueDate", label: "Vencimento", render: (row) => (row.dueDate ? formatDate(row.dueDate) : "—") },
    { key: "stepCode", label: "Etapa", render: (row) => `${row.stepCode} (${describeOffset(row.offsetDays)})` },
    { key: "action", label: "Ação", render: (row) => ACTION_LABELS[row.action] || row.action },
    { key: "balanceAtStep", label: "Saldo na etapa", render: (row) => formatBRL(row.balanceAtStep) },
    {
      key: "outcome",
      label: "Resultado",
      render: (row) => (
        <Badge tone={row.outcome === "EXECUTED" ? "success" : "neutral"}>{OUTCOME_LABELS[row.outcome] || row.outcome}</Badge>
      ),
    },
  ];

  return (
    <AppShell title="Régua de cobrança" backHref="/painel/financeiro">
      <div className={styles.wrap}>
        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}

        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Versão vigente</h2>
          {loading ? (
            <p className={styles.helper}>Carregando...</p>
          ) : current ? (
            <p className={styles.helper}>
              Versão v{current.versionNumber}, vigente desde {formatDateTime(current.effectiveFrom)}. Uma nova versão vale só para competências que ainda não iniciaram a cadência.
            </p>
          ) : (
            <Alert tone="warning">Nenhuma versão publicada: a régua não está rodando. As etapas abaixo são a sugestão padrão.</Alert>
          )}

          <h3 className={styles.sectionTitle}>Etapas</h3>
          <p className={styles.helper}>
            Dia relativo ao vencimento: negativo = antes (lembrete), positivo = depois (atraso). Nenhuma etapa envia nada para fora do sistema.
          </p>
          {draft.map((step, index) => (
            <div key={index} className={styles.stepRow}>
              <FormField label="Código" htmlFor={`code-${index}`}>
                <Input
                  id={`code-${index}`}
                  value={step.code}
                  disabled={!canManage}
                  onChange={(e) => updateStep(index, "code", e.target.value.toUpperCase())}
                />
              </FormField>
              <FormField label="Dia" htmlFor={`offset-${index}`}>
                <Input
                  id={`offset-${index}`}
                  inputMode="numeric"
                  value={step.offsetDays}
                  disabled={!canManage}
                  onChange={(e) => updateStep(index, "offsetDays", e.target.value.replace(/[^0-9-]/g, ""))}
                />
              </FormField>
              <FormField label="Ação" htmlFor={`action-${index}`}>
                <Select id={`action-${index}`} value={step.action} disabled={!canManage} onChange={(e) => updateStep(index, "action", e.target.value)}>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormField>
              {canManage ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => removeStep(index)}>
                  Remover
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))}

          {draftError ? <Alert tone="danger">{draftError}</Alert> : null}
          {success ? <Alert tone="success">{success}</Alert> : null}

          {canManage ? (
            <div className={styles.actionsRow}>
              <Button type="button" variant="ghost" onClick={addStep}>
                Adicionar etapa
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDraft(toEditable(current?.steps || rule?.defaultSteps))}>
                Descartar alterações
              </Button>
              <Button type="button" onClick={handlePublishClick} disabled={publishing || loading}>
                Publicar nova versão
              </Button>
            </div>
          ) : (
            <p className={styles.helper}>Você pode consultar a régua; publicar exige a permissão de gestão da régua de cobrança.</p>
          )}
        </Card>

        <Card>
          <h2 className={styles.sectionTitle}>Histórico de versões</h2>
          <Table columns={versionColumns} rows={rule?.versions || []} loading={loading} emptyMessage="Nenhuma versão publicada ainda." />
        </Card>

        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Etapas executadas</h2>
          <form onSubmit={applyFilters} className={styles.filters}>
            <FormField label="Competência" htmlFor="f-period">
              <Input id="f-period" type="month" value={filters.period} onChange={(e) => changeFilter("period", e.target.value)} />
            </FormField>
            <FormField label="Resultado" htmlFor="f-outcome">
              <Select id="f-outcome" value={filters.outcome} onChange={(e) => changeFilter("outcome", e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Ação" htmlFor="f-action">
              <Select id="f-action" value={filters.action} onChange={(e) => changeFilter("action", e.target.value)}>
                <option value="">Todas</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Contrato" htmlFor="f-contract">
              <Select id="f-contract" value={filters.contractId} onChange={(e) => changeFilter("contractId", e.target.value)}>
                <option value="">Todos</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatContractLabel(c)}
                  </option>
                ))}
              </Select>
            </FormField>
            <Button type="submit" variant="ghost">
              Filtrar
            </Button>
          </form>
          <Table columns={stepColumns} rows={steps} loading={stepsLoading} emptyMessage="Nenhuma etapa executada com esses filtros." />
          <div className={styles.paginationRow}>
            <Button type="button" size="sm" variant="ghost" disabled={page <= 1 || stepsLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </Button>
            <span className={styles.helper}>
              Página {page} de {totalPages} · {stepsTotal} etapa(s)
            </span>
            <Button type="button" size="sm" variant="ghost" disabled={page >= totalPages || stepsLoading} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => (publishing ? null : setConfirmOpen(false))}
        title="Publicar nova versão da régua?"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={publishing}>
              Cancelar
            </Button>
            <Button type="button" onClick={runPublish} disabled={publishing}>
              {publishing ? "Publicando..." : "Confirmar publicação"}
            </Button>
          </>
        }
      >
        <p className={styles.helper}>
          A versão vigente{current ? ` (v${current.versionNumber})` : ""} será encerrada agora. A nova vale para competências que ainda não iniciaram a cadência; as em andamento continuam na versão atual.
        </p>
        <ul>
          {sortedPreview.map((s) => (
            <li key={s.code + s.offsetDays}>
              {s.code.toUpperCase()}: {describeOffset(Number.parseInt(s.offsetDays, 10))} — {ACTION_LABELS[s.action]}
            </li>
          ))}
        </ul>
      </Modal>

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
