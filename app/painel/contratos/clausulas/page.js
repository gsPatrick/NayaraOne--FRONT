"use client";

// GAP REAL CORRIGIDO (varredura completa do Marco 5 contra o Caderno Técnico, 12/10/2026):
// JUR-002 ("Modelo versionado — cláusulas/modelos possuem versão e responsável jurídico") teve
// as 5 rotas criadas numa rodada anterior desta mesma sessão (createClause/createClauseVersion/
// listClauses/listClauseVersions/deactivateClause), mas NENHUMA tela chamava — a função de
// cliente nem existia em lib/api/legal.js. Igual aconteceu com várias features do Marco 4:
// backend pronto e testado, mas invisível para qualquer usuário fora de uma chamada direta à
// API. Cada cláusula é append-only — criar uma versão nova preserva a anterior.

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { SkeletonList } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import {
  listClauses,
  createClause,
  listClauseVersions,
  createClauseVersion,
  deactivateClause,
  approveClauseCondition,
  getClauseTemplateUsage,
  upgradeTemplateClause,
} from "@/lib/api/legal";
import { hasPermission } from "@/lib/rbac/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import ClauseConditionEditor, {
  toConditionPayload,
  fromConditionJson,
  isConditionStateValid,
  describeCondition,
} from "./ClauseConditionEditor";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const CATEGORIES = ["GENERAL", "PAYMENT", "GUARANTEE", "TERMINATION", "PENALTY", "OBLIGATION", "OTHER"];
const CATEGORY_LABELS = { GENERAL: "Geral", PAYMENT: "Pagamento", GUARANTEE: "Garantia", TERMINATION: "Rescisão", PENALTY: "Multa", OBLIGATION: "Obrigação", OTHER: "Outra" };

// M1/M3 (revisão F01, 19/10): o botão só aparece onde a API vai aceitar — versão vigente, com
// condição pendente, para quem tem legal:approve e não é o autor da versão. A API continua sendo
// a fonte de verdade (recusa os mesmos casos).
function canApproveCondition(clause) {
  if (!clause?.conditionJson || clause.conditionStatus === "APPROVED" || !clause.isActive) return false;
  if (!hasPermission("legal:approve")) return false;
  const me = getCurrentUser();
  return Boolean(me?.id) && Boolean(clause.createdBy) && String(clause.createdBy) !== String(me.id);
}

export default function ClausulasPage() {
  const [clauses, setClauses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ code: "", title: "", bodyText: "", category: "GENERAL" });
  const [createCondition, setCreateCondition] = useState(fromConditionJson(null));
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  const [versionModal, setVersionModal] = useState(null); // clause
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [newVersionText, setNewVersionText] = useState("");
  const [versionCondition, setVersionCondition] = useState(fromConditionJson(null));
  const [versionBusy, setVersionBusy] = useState(false);
  const [versionError, setVersionError] = useState("");
  const [versionNotice, setVersionNotice] = useState("");
  const [templateUsage, setTemplateUsage] = useState([]);

  const { confirm, ConfirmDialog } = useConfirm();

  function load() {
    setLoading(true);
    setLoadError("");
    listClauses()
      .then((res) => setClauses(res || []))
      .catch((err) => setLoadError(err.message || "Erro ao carregar a biblioteca de cláusulas."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!query) return clauses;
    const q = query.toLowerCase();
    return clauses.filter((c) => c.code?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q));
  }, [clauses, query]);

  async function handleCreateClause() {
    if (!createForm.code.trim() || !createForm.title.trim() || !createForm.bodyText.trim()) return;
    if (!isConditionStateValid(createCondition)) return;
    setCreateBusy(true);
    setCreateError("");
    try {
      const created = await createClause({
        code: createForm.code.trim().toUpperCase(),
        title: createForm.title.trim(),
        bodyText: createForm.bodyText.trim(),
        category: createForm.category,
        condition: toConditionPayload(createCondition),
      });
      setClauses((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      setCreateForm({ code: "", title: "", bodyText: "", category: "GENERAL" });
      setCreateCondition(fromConditionJson(null));
    } catch (err) {
      setCreateError(err.message || "Erro ao criar cláusula.");
    } finally {
      setCreateBusy(false);
    }
  }

  function openVersions(clause) {
    setVersionModal(clause);
    setNewVersionText(clause.bodyText || "");
    setVersionCondition(fromConditionJson(clause.conditionJson));
    setVersionError("");
    setVersionNotice("");
    setVersionsLoading(true);
    Promise.all([listClauseVersions(clause.code), getClauseTemplateUsage(clause.code)])
      .then(([res, usage]) => {
        setVersions(res || []);
        setTemplateUsage(usage || []);
      })
      .catch((err) => setVersionError(err.message || "Erro ao carregar versões."))
      .finally(() => setVersionsLoading(false));
  }

  async function handleCreateVersion() {
    if (!versionModal || !newVersionText.trim() || !isConditionStateValid(versionCondition)) return;
    setVersionBusy(true);
    setVersionError("");
    try {
      const updated = await createClauseVersion(versionModal.code, {
        bodyText: newVersionText.trim(),
        condition: toConditionPayload(versionCondition),
      });
      setClauses((prev) => prev.map((c) => (c.code === updated.code ? updated : c)));
      openVersions(updated);
    } catch (err) {
      setVersionError(err.message || "Erro ao criar nova versão.");
    } finally {
      setVersionBusy(false);
    }
  }

  async function handleApproveCondition(clause) {
    const ok = await confirm({
      title: `Aprovar a condição de "${clause.title}" v${clause.versionNumber}?`,
      message: `Regra: ${describeCondition(clause.conditionJson)}. Depois de aprovada, ela passa a decidir se a cláusula entra nos contratos gerados.`,
      confirmLabel: "Aprovar condição",
    });
    if (!ok) return;
    // O erro aparece onde a ação foi disparada: dentro do modal de versões se ele estiver aberto
    // (antes ficava escondido atrás do modal, no topo da página).
    const showError = (message) => (versionModal ? setVersionError(message) : setLoadError(message));
    try {
      const approved = await approveClauseCondition(clause.id);
      setClauses((prev) => prev.map((c) => (c.id === approved.id ? approved : c)));
      setVersions((prev) => prev.map((v) => (v.id === approved.id ? approved : v)));
    } catch (err) {
      showError(err.message || "Erro ao aprovar a condição.");
    }
  }

  async function handleUpgradeTemplate(usage) {
    const ok = await confirm({
      title: `Atualizar o modelo "${usage.templateName}" para a v${usage.latestVersionNumber}?`,
      message: "Contratos já gerados continuam com o texto que tinham. Os próximos documentos deste modelo passam a usar a versão vigente — se ela tiver condição pendente, o modelo só volta a gerar depois da aprovação.",
      confirmLabel: "Atualizar modelo",
    });
    if (!ok) return;
    setVersionError("");
    try {
      await upgradeTemplateClause(usage.templateId, usage.contractClauseId);
      setTemplateUsage(await getClauseTemplateUsage(versionModal.code));
      setVersionNotice(`Modelo "${usage.templateName}" atualizado para a v${usage.latestVersionNumber}.`);
    } catch (err) {
      setVersionError(err.message || "Erro ao atualizar o modelo.");
    }
  }

  async function handleDeactivate(clause) {
    const ok = await confirm({
      title: `Desativar "${clause.title}"?`,
      message: "A cláusula para de ser oferecida para novos templates, mas o histórico de uso em contratos já assinados não muda — versões são append-only.",
      confirmLabel: "Desativar",
    });
    if (!ok) return;
    try {
      await deactivateClause(clause.id);
      setClauses((prev) => prev.map((c) => (c.id === clause.id ? { ...c, isActive: false } : c)));
    } catch (err) {
      setLoadError(err.message || "Erro ao desativar cláusula.");
    }
  }

  return (
    <AppShell title="Biblioteca de cláusulas" backHref="/painel/contratos">
      {loadError ? <Alert tone="danger">{loadError}</Alert> : null}

      <Card
        title="Cláusulas"
        subtitle="Componentes versionados e homologados, reutilizáveis em templates de contrato"
        actions={<Button size="sm" onClick={() => setCreateModalOpen(true)}><Icon name="plus" size={16} /> Nova cláusula</Button>}
      >
        <div className={styles.toolbar}>
          <SearchInput placeholder="Buscar por código ou título..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {loading ? (
          <SkeletonList />
        ) : filtered.length === 0 ? (
          <EmptyState icon="document" title="Nenhuma cláusula cadastrada" description="Crie a primeira cláusula da biblioteca." />
        ) : (
          <div className={styles.list}>
            {filtered.map((c) => (
              <div key={c.id} className={styles.row}>
                <span className={styles.code}>{c.code}</span>
                <div className={styles.name}>
                  <div>{c.title}</div>
                  <span className={styles.meta}>{CATEGORY_LABELS[c.category] || c.category} · v{c.versionNumber}</span>
                  {c.conditionJson ? <span className={styles.meta}>Condição: {describeCondition(c.conditionJson)}</span> : null}
                </div>
                {c.conditionJson ? (
                  <Badge tone={c.conditionStatus === "APPROVED" ? "success" : "warning"}>
                    {c.conditionStatus === "APPROVED" ? "Condição aprovada" : "Condição pendente"}
                  </Badge>
                ) : null}
                <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Ativa" : "Inativa"}</Badge>
                {canApproveCondition(c) ? (
                  <Button size="sm" variant="secondary" onClick={() => handleApproveCondition(c)}>Aprovar condição</Button>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => openVersions(c)}>Versões</Button>
                {c.isActive ? (
                  <Button size="sm" variant="ghost" onClick={() => handleDeactivate(c)}>Desativar</Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <StickyActionBar>
        <ContractsNavMenu />
      </StickyActionBar>

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nova cláusula"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)} disabled={createBusy}>Cancelar</Button>
            <Button onClick={handleCreateClause} loading={createBusy} disabled={createBusy || !createForm.code.trim() || !createForm.title.trim() || !createForm.bodyText.trim() || !isConditionStateValid(createCondition)}>Criar</Button>
          </>
        }
      >
        {createError ? <Alert tone="danger" className={styles.notice}>{createError}</Alert> : null}
        <div className={styles.form}>
          <FormField label="Código" htmlFor="f-code" required helper="Identificador único, ex: PENALIDADE_ATRASO.">
            <Input id="f-code" value={createForm.code} onChange={(e) => setCreateForm((p) => ({ ...p, code: e.target.value }))} />
          </FormField>
          <FormField label="Título" htmlFor="f-title" required>
            <Input id="f-title" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} />
          </FormField>
          <FormField label="Categoria" htmlFor="f-category">
            <Select id="f-category" value={createForm.category} onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </Select>
          </FormField>
          <FormField label="Texto da cláusula" htmlFor="f-body" required>
            <textarea id="f-body" className={styles.textarea} rows={6} value={createForm.bodyText} onChange={(e) => setCreateForm((p) => ({ ...p, bodyText: e.target.value }))} />
          </FormField>
          <ClauseConditionEditor value={createCondition} onChange={setCreateCondition} idPrefix="f-create-cond" />
        </div>
      </Modal>

      <Modal
        open={Boolean(versionModal)}
        onClose={() => setVersionModal(null)}
        title={`Versões — ${versionModal?.code || ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVersionModal(null)}>Fechar</Button>
            <Button onClick={handleCreateVersion} loading={versionBusy} disabled={versionBusy || !newVersionText.trim() || !isConditionStateValid(versionCondition)}>Criar nova versão</Button>
          </>
        }
      >
        {versionError ? <Alert tone="danger" className={styles.notice}>{versionError}</Alert> : null}
        {versionNotice ? <Alert tone="info" className={styles.notice}>{versionNotice}</Alert> : null}
        {versionsLoading ? (
          <SkeletonList />
        ) : (
          <div className={styles.list}>
            {versions.map((v) => (
              <div key={v.id} className={styles.row}>
                <span className={styles.code}>v{v.versionNumber}</span>
                <div className={styles.name}>
                  <div>{v.title}</div>
                  <span className={styles.meta}>{formatDateTime(v.createdAt)}</span>
                  {v.conditionJson ? <span className={styles.meta}>Condição: {describeCondition(v.conditionJson)}</span> : null}
                </div>
                {v.conditionJson ? (
                  <Badge tone={v.conditionStatus === "APPROVED" ? "success" : "warning"}>
                    {v.conditionStatus === "APPROVED" ? "Condição aprovada" : "Condição pendente"}
                  </Badge>
                ) : null}
                <Badge tone={v.isActive ? "success" : "neutral"}>{v.isActive ? "Vigente" : "Histórico"}</Badge>
                {canApproveCondition(v) ? (
                  <Button size="sm" variant="secondary" onClick={() => handleApproveCondition(v)}>Aprovar condição</Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {!versionsLoading && templateUsage.length > 0 ? (
          <div className={styles.usage}>
            <p className={styles.usageTitle}>Modelos que usam esta cláusula</p>
            {templateUsage.map((u) => (
              <div key={`${u.templateId}-${u.contractClauseId}`} className={styles.row}>
                <div className={styles.name}>
                  <div>{u.templateName}</div>
                  <span className={styles.meta}>Usa a v{u.linkedVersionNumber}{u.superseded ? ` — vigente é a v${u.latestVersionNumber}` : ""}</span>
                </div>
                {u.superseded ? <Badge tone="warning">Modelo bloqueado até atualizar</Badge> : <Badge tone="success">Em dia</Badge>}
                {u.superseded && hasPermission("legal:create") ? (
                  <Button size="sm" variant="secondary" onClick={() => handleUpgradeTemplate(u)}>Atualizar para v{u.latestVersionNumber}</Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <FormField label="Texto da nova versão" htmlFor="f-new-version" required helper="A versão anterior é preservada, nunca sobrescrita (append-only). Modelos que usam a versão atual ficam bloqueados até serem atualizados para a nova.">
          <textarea id="f-new-version" className={styles.textarea} rows={5} value={newVersionText} onChange={(e) => setNewVersionText(e.target.value)} />
        </FormField>
        <ClauseConditionEditor value={versionCondition} onChange={setVersionCondition} idPrefix="f-version-cond" />
      </Modal>

      <ConfirmDialog />
    </AppShell>
  );
}
