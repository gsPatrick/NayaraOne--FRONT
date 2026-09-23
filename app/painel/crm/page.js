"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Avatar from "@/components/atoms/Avatar/Avatar";
import FormField from "@/components/molecules/FormField/FormField";
import Modal from "@/components/organisms/Modal/Modal";
import KanbanBoard from "@/components/organisms/KanbanBoard/KanbanBoard";
import OpportunityCard from "@/components/molecules/OpportunityCard/OpportunityCard";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { SkeletonKanban } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { STAGES } from "@/lib/mock/opportunities";
import { listOpportunities, createOpportunity, updateOpportunity, listVisits, listMessages } from "@/lib/api/crm";
import { listProperties } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, isOverdue, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE } from "@/lib/format";
import styles from "./page.module.css";

const CLOSED_STAGES = ["ganho", "perdido"];
const VISIT_TONE = { DONE: "success", SCHEDULED: "info", CONFIRMED: "info", CANCELED: "danger", NO_SHOW: "danger" };

// A API (opportunityOutcomeReason.validator.js) exige um motivo ESTRUTURADO sempre que a
// oportunidade entra num estágio de desfecho — sem ele, POST/PATCH volta 422
// (OPPORTUNITY_OUTCOME_REASON_REQUIRED). O funil da tela só expõe "ganho"/"perdido" (não há
// coluna de desistência), então só precisamos cobrir wonReason/lostReason aqui.
const OUTCOME_REASON_FIELD = { ganho: "wonReason", perdido: "lostReason" };
const OUTCOME_REASON_OPTIONS = {
  ganho: [
    { value: "PRICE_ACCEPTED", label: "Preço aceito" },
    { value: "FAST_DECISION", label: "Decisão rápida" },
    { value: "REFERRAL", label: "Indicação" },
    { value: "OTHER", label: "Outro" },
  ],
  perdido: [
    { value: "PRICE_TOO_HIGH", label: "Preço muito alto" },
    { value: "COMPETITOR", label: "Foi para um concorrente" },
    { value: "FINANCING_DENIED", label: "Financiamento negado" },
    { value: "LOCATION", label: "Localização não atendeu" },
    { value: "OTHER", label: "Outro" },
  ],
};

export default function CrmPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [people, setPeople] = useState([]);
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [stages, setStages] = useState(STAGES);
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStageKey, setCreateStageKey] = useState(null);
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reasonPrompt, setReasonPrompt] = useState(null); // { itemId, stageKey } | null

  const personName = (id) => people.find((p) => p.id === id)?.legalName || "—";
  const propertyName = (id) => properties.find((p) => p.id === id)?.name || "—";
  const repName = (id) => users.find((u) => u.id === id)?.name || "—";

  function loadOpportunities() {
    setLoading(true);
    setLoadError("");
    // FIX (reportado pela cliente 18/09/2026): usuário suspenso podia ser pré-selecionado
    // como vendedor padrão — agora só busca usuários ACTIVE.
    return Promise.all([listOpportunities(), listPeople(), listProperties(), apiFetch("/users?status=ACTIVE")])
      .then(([opps, apiPeople, apiProperties, apiUsers]) => {
        setOpportunities(opps);
        setPeople(apiPeople || []);
        setProperties(apiProperties);
        setUsers(apiUsers || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar o funil de oportunidades."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let cancelled = false;
    loadOpportunities().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateForStage(stageKey) {
    setCreateStageKey(stageKey);
    setCreateOpen(true);
  }

  const getItems = (stageKey) => opportunities.filter((o) => o.stage === stageKey);

  const overdueCount = useMemo(
    () => opportunities.filter((o) => !CLOSED_STAGES.includes(o.stage) && isOverdue(o.nextActionDueAt)).length,
    [opportunities]
  );

  async function handleCreate(payload) {
    setActionError("");
    try {
      const created = await createOpportunity(payload);
      setOpportunities((prev) => [created, ...prev]);
      setCreateOpen(false);
      return true;
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a oportunidade.");
      return false;
    }
  }

  function handleMoveItem(itemId, newStageKey) {
    // FIX: a API exige um motivo estruturado (wonReason/lostReason) para fechar uma
    // oportunidade como "ganho"/"perdido" (OPPORTUNITY_OUTCOME_REASON_REQUIRED). Antes disso,
    // o drag-and-drop mandava só {stage}, a API recusava com 422 e o card voltava sozinho pro
    // lugar sem o usuário ter como saber o que fazer — não existia nenhum campo na tela para
    // informar esse motivo. Agora, ao soltar numa coluna de desfecho, perguntamos o motivo
    // antes de mover de verdade.
    if (OUTCOME_REASON_FIELD[newStageKey]) {
      setReasonPrompt({ itemId, stageKey: newStageKey });
      return;
    }
    moveItem(itemId, { stage: newStageKey });
  }

  async function moveItem(itemId, patch) {
    const previous = opportunities;
    setOpportunities((prev) => prev.map((o) => (o.id === itemId ? { ...o, ...patch } : o)));
    try {
      await updateOpportunity(itemId, patch);
      return true;
    } catch (err) {
      setOpportunities(previous);
      setActionError(err?.message || "Não foi possível mover a oportunidade de etapa.");
      return false;
    }
  }

  function handleAddColumn(label) {
    // crm.opportunities.stage é uma coluna STRING livre (sem ENUM/CHECK no Caderno) — etapas
    // não são fixas, a equipe pode criar novas conforme o funil da operação.
    const key = label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `etapa-${Date.now()}`;
    setStages((prev) => [...prev, { key, label }]);
  }

  function handleRenameColumn(key, label) {
    setStages((prev) => prev.map((s) => (s.key === key ? { ...s, label } : s)));
  }

  function handleReorderColumns(draggedKey, targetKey) {
    setStages((prev) => {
      const dragged = prev.find((s) => s.key === draggedKey);
      if (!dragged) return prev;
      const withoutDragged = prev.filter((s) => s.key !== draggedKey);
      const targetIndex = withoutDragged.findIndex((s) => s.key === targetKey);
      const next = [...withoutDragged];
      next.splice(targetIndex, 0, dragged);
      return next;
    });
  }

  function commitNewStage() {
    if (newStageName.trim()) handleAddColumn(newStageName.trim());
    setNewStageName("");
    setAddStageOpen(false);
  }

  return (
    <AppShell title="CRM">
      <div className={styles.toolbar}>
        <span className={styles.toolbarInfo}>
          {opportunities.length} oportunidades no funil
          {overdueCount > 0 ? ` · ${overdueCount} com próxima ação vencida` : ""}
        </span>
        <div className={styles.toolbarActions}>
          {addStageOpen ? (
            <input
              className={styles.newStageInput}
              placeholder="Nome da nova etapa..."
              value={newStageName}
              autoFocus
              onChange={(e) => setNewStageName(e.target.value)}
              onBlur={commitNewStage}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNewStage();
                if (e.key === "Escape") setAddStageOpen(false);
              }}
            />
          ) : (
            <Button variant="secondary" onClick={() => setAddStageOpen(true)}>
              <Icon name="plus" size={16} /> Nova etapa
            </Button>
          )}
          <Button onClick={() => openCreateForStage(null)}>
            <Icon name="plus" size={16} /> Nova oportunidade
          </Button>
        </div>
      </div>

      {loadError ? <Alert tone="danger" title="Não foi possível carregar o funil">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      {loading ? (
        <SkeletonKanban />
      ) : (
        <KanbanBoard
          columns={stages}
          getItems={getItems}
          emptyLabel="Nenhuma oportunidade nesta etapa"
          renderItem={(item) => (
            <OpportunityCard
              key={item.id}
              opportunity={{
                ...item,
                personName: personName(item.personId),
                propertyName: propertyName(item.propertyId),
                repName: repName(item.ownerUserId),
              }}
              onClick={setSelected}
            />
          )}
          onMoveItem={handleMoveItem}
          onAddColumn={handleAddColumn}
          onRenameColumn={handleRenameColumn}
          onReorderColumns={handleReorderColumns}
          onAddItem={openCreateForStage}
          addItemLabel="Nova oportunidade"
        />
      )}

      <OpportunityDetailModal
        opportunity={
          selected
            ? {
                ...selected,
                personName: personName(selected.personId),
                propertyName: propertyName(selected.propertyId),
                repName: repName(selected.ownerUserId),
              }
            : null
        }
        stages={stages}
        onClose={() => setSelected(null)}
      />
      <CreateOpportunityModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        stages={stages}
        initialStageKey={createStageKey}
        properties={properties}
        users={users}
      />
      <ReasonPromptModal
        prompt={reasonPrompt}
        stages={stages}
        onClose={() => setReasonPrompt(null)}
        onConfirm={async (reason) => {
          const { itemId, stageKey } = reasonPrompt;
          const field = OUTCOME_REASON_FIELD[stageKey];
          const ok = await moveItem(itemId, { stage: stageKey, [field]: reason });
          if (ok) setReasonPrompt(null);
        }}
      />
    </AppShell>
  );
}

function OpportunityDetailModal({ opportunity, stages, onClose }) {
  const [visits, setVisits] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!opportunity) return;
    let cancelled = false;
    setLoadingHistory(true);
    Promise.all([
      listVisits({ opportunityId: opportunity.id }).catch(() => []),
      listMessages({ opportunityId: opportunity.id }).catch(() => []),
    ]).then(([v, m]) => {
      if (cancelled) return;
      setVisits(v);
      setMessages(m);
      setLoadingHistory(false);
    });
    return () => {
      cancelled = true;
    };
  }, [opportunity]);

  const isClosed = opportunity ? CLOSED_STAGES.includes(opportunity.stage) : false;
  const overdue = opportunity && !isClosed && isOverdue(opportunity.nextActionDueAt);
  const stageLabel = opportunity ? stages.find((s) => s.key === opportunity.stage)?.label : "";

  return (
    <Modal open={Boolean(opportunity)} onClose={onClose} title={opportunity?.personName}>
      {opportunity ? (
        <>
          <div className={styles.detailHeader}>
            <Badge tone={isClosed ? (opportunity.stage === "ganho" ? "success" : "danger") : "info"}>{stageLabel}</Badge>
            <Badge tone="neutral">{opportunity.propertyName}</Badge>
          </div>
          <p className={styles.detailMeta}>
            Responsável: {opportunity.repName} · Criada em {formatDateTime(opportunity.createdAt)}
          </p>

          {!isClosed ? (
            <div className={[styles.nextActionBox, overdue ? styles.overdue : ""].join(" ")}>
              <p className={styles.nextActionLabel}>Próxima ação</p>
              <p className={styles.nextActionText}>{opportunity.nextAction}</p>
              <p className={styles.nextActionDue}>
                Prazo: {formatDateTime(opportunity.nextActionDueAt)}{overdue ? " · vencida" : ""}
              </p>
            </div>
          ) : null}

          <div className={styles.detailSection}>
            <p className={styles.detailSectionTitle}>Histórico de visitas</p>
            {loadingHistory ? (
              <Spinner size="sm" />
            ) : visits.length === 0 ? (
              <EmptyState icon="calendar" title="Sem visitas" description="Nenhuma visita registrada." />
            ) : (
              visits.map((visit) => (
                <div className={styles.visitRow} key={visit.id}>
                  <span>{formatDateTime(visit.scheduledAt)}</span>
                  <Badge tone={VISIT_TONE[visit.status] || "neutral"}>{visit.status}</Badge>
                </div>
              ))
            )}
          </div>

          <div className={styles.detailSection}>
            <p className={styles.detailSectionTitle}>Histórico de mensagens</p>
            <div className={styles.thread}>
              {loadingHistory ? (
                <Spinner size="sm" />
              ) : messages.length === 0 ? (
                <EmptyState icon="mail" title="Sem mensagens" description="Nenhuma mensagem registrada." />
              ) : (
                messages.map((msg) => (
                  <div className={styles.messageBubble} key={msg.id}>
                    <span className={styles.messageFrom}>
                      {msg.direction === "INBOUND" ? "Cliente" : "Equipe"}
                      <span className={styles.messageTime}>{formatDateTime(msg.createdAt)}</span>
                    </span>
                    <p className={styles.messageText}>{msg.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </Modal>
  );
}

function ReasonPromptModal({ prompt, stages, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setReason("");
    setError("");
    setSubmitting(false);
  }, [prompt]);

  if (!prompt) return null;
  const options = OUTCOME_REASON_OPTIONS[prompt.stageKey] || [];
  const stageLabel = stages.find((s) => s.key === prompt.stageKey)?.label || prompt.stageKey;

  async function handleConfirm() {
    if (!reason) {
      setError("Selecione o motivo antes de confirmar.");
      return;
    }
    setSubmitting(true);
    await onConfirm(reason);
    setSubmitting(false);
  }

  return (
    <Modal
      open={Boolean(prompt)}
      onClose={onClose}
      title={`Motivo — ${stageLabel}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} loading={submitting}>Confirmar</Button>
        </>
      }
    >
      <FormField label="Motivo" htmlFor="reason-select" required error={error}>
        <Select id="reason-select" value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }}>
          <option value="">Selecionar…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </FormField>
      <p className={styles.nextActionDue}>
        Mover para "{stageLabel}" exige um motivo estruturado (usado nos relatórios de motivos mais comuns).
      </p>
    </Modal>
  );
}

function CreateOpportunityModal({ open, onClose, onCreate, stages, initialStageKey, properties, users }) {
  const [personName, setPersonName] = useState("");
  const [personId, setPersonId] = useState(null);
  const [stageKey, setStageKey] = useState(initialStageKey || stages[0]?.key || "");
  const [propertyId, setPropertyId] = useState(properties[0]?.id || "");
  // FIX (padrão do seletor de responsável): nenhum usuário vem pré-selecionado por padrão.
  const [ownerUserId, setOwnerUserId] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDueAt, setNextActionDueAt] = useState("");
  const [nextActionDueAtInvalid, setNextActionDueAtInvalid] = useState(false);
  const [outcomeReason, setOutcomeReason] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStageKey(initialStageKey || stages[0]?.key || "");
      setPropertyId(properties[0]?.id || "");
      setOwnerUserId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialStageKey]);

  // FIX: o motivo escolhido não vale mais quando o usuário troca de etapa (as opções são
  // diferentes por desfecho — WON_REASONS != LOST_REASONS).
  useEffect(() => {
    setOutcomeReason("");
  }, [stageKey]);

  function reset() {
    setPersonName("");
    setPersonId(null);
    setStageKey(initialStageKey || stages[0]?.key || "");
    setPropertyId(properties[0]?.id || "");
    setOwnerUserId("");
    setNextAction("");
    setNextActionDueAt("");
    setNextActionDueAtInvalid(false);
    setOutcomeReason("");
    setErrors({});
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const reasonField = OUTCOME_REASON_FIELD[stageKey];
  const reasonOptions = OUTCOME_REASON_OPTIONS[stageKey] || [];

  async function handleSubmit() {
    const nextErrors = {};
    if (!personId) nextErrors.personName = "Selecione o contato (cliente/lead).";
    if (!CLOSED_STAGES.includes(stageKey)) {
      if (!nextAction.trim()) nextErrors.nextAction = "Toda oportunidade ativa precisa de uma próxima ação.";
      if (!nextActionDueAt) nextErrors.nextActionDueAt = "Informe o prazo da próxima ação.";
      else if (nextActionDueAtInvalid) nextErrors.nextActionDueAt = DATE_INPUT_ERROR_MESSAGE;
    } else if (reasonField && !outcomeReason) {
      // FIX: criar já direto como "ganho"/"perdido" exige motivo estruturado
      // (OPPORTUNITY_OUTCOME_REASON_REQUIRED na API) — sem esse campo a criação sempre voltava
      // 422 e o modal resetava o formulário inteiro, perdendo tudo que o usuário tinha digitado.
      nextErrors.outcomeReason = "Selecione o motivo.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const ok = await onCreate({
      stage: stageKey,
      personId,
      propertyId: propertyId || undefined,
      ownerUserId: ownerUserId || undefined,
      nextAction: nextAction.trim(),
      nextActionDueAt: nextActionDueAt ? new Date(nextActionDueAt).toISOString() : undefined,
      ...(reasonField && outcomeReason ? { [reasonField]: outcomeReason } : {}),
    });
    // FIX: só limpa o formulário quando a criação realmente deu certo — antes o reset()
    // rodava sempre, mesmo com erro 422/400, e o usuário perdia contato/etapa/dados digitados.
    if (ok) reset();
    else setSubmitting(false);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nova oportunidade"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}>Criar oportunidade</Button>
        </>
      }
    >
      <div className={styles.formGrid}>
        <div className={styles.span2}>
          <FormField label="Contato (cliente/lead)" htmlFor="o-person" required error={errors.personName}>
            <PersonPicker
              id="o-person"
              value={personName}
              personId={personId}
              placeholder="Buscar contato pelo nome..."
              onSelect={({ name, personId: pid }) => {
                setPersonName(name);
                setPersonId(pid);
              }}
            />
          </FormField>
        </div>
        <FormField label="Etapa" htmlFor="o-stage">
          <Select id="o-stage" value={stageKey} onChange={(e) => setStageKey(e.target.value)}>
            {stages.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Imóvel de interesse" htmlFor="o-property">
          <Select id="o-property" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </FormField>
        <div className={styles.span2}>
          <FormField label="Vendedor responsável" htmlFor="o-rep">
            <Select id="o-rep" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
              <option value="">Selecionar…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField
          label="Próxima ação"
          htmlFor="o-next-action"
          required={!CLOSED_STAGES.includes(stageKey)}
          error={errors.nextAction}
          helper={CLOSED_STAGES.includes(stageKey) ? "Opcional para etapas fechadas (Ganho/Perdido)." : "Obrigatória: toda oportunidade ativa precisa de uma próxima ação definida."}
        >
          <Input id="o-next-action" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Ex.: Ligar para qualificar interesse" />
        </FormField>
        <FormField label="Prazo da próxima ação" htmlFor="o-next-due" required={!CLOSED_STAGES.includes(stageKey)} error={errors.nextActionDueAt}>
          <Input
            id="o-next-due"
            type="datetime-local"
            min="1900-01-01T00:00"
            max="2100-12-31T23:59"
            error={nextActionDueAtInvalid}
            value={nextActionDueAt}
            onChange={(e) => {
              setNextActionDueAtInvalid(isDateInputInvalid(e.target.validity));
              setNextActionDueAt(e.target.value);
            }}
            onBlur={(e) => setNextActionDueAtInvalid(isDateInputInvalid(e.target.validity))}
          />
        </FormField>
        {reasonField ? (
          <div className={styles.span2}>
            <FormField
              label={stageKey === "ganho" ? "Motivo do ganho" : "Motivo da perda"}
              htmlFor="o-outcome-reason"
              required
              error={errors.outcomeReason}
              helper="Obrigatório: toda oportunidade fechada precisa de um motivo estruturado."
            >
              <Select id="o-outcome-reason" value={outcomeReason} onChange={(e) => setOutcomeReason(e.target.value)}>
                <option value="">Selecionar…</option>
                {reasonOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </FormField>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
