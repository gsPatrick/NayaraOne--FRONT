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
import { formatDateTime, isOverdue } from "@/lib/format";
import styles from "./page.module.css";

const CLOSED_STAGES = ["ganho", "perdido"];
const VISIT_TONE = { DONE: "success", SCHEDULED: "info", CONFIRMED: "info", CANCELED: "danger", NO_SHOW: "danger" };

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

  const personName = (id) => people.find((p) => p.id === id)?.legalName || "—";
  const propertyName = (id) => properties.find((p) => p.id === id)?.name || "—";
  const repName = (id) => users.find((u) => u.id === id)?.name || "—";

  function loadOpportunities() {
    setLoading(true);
    setLoadError("");
    return Promise.all([listOpportunities(), listPeople(), listProperties(), apiFetch("/users")])
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
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a oportunidade.");
    }
  }

  async function handleMoveItem(itemId, newStageKey) {
    const previous = opportunities;
    setOpportunities((prev) => prev.map((o) => (o.id === itemId ? { ...o, stage: newStageKey } : o)));
    try {
      await updateOpportunity(itemId, { stage: newStageKey });
    } catch (err) {
      setOpportunities(previous);
      setActionError(err?.message || "Não foi possível mover a oportunidade de etapa.");
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

function CreateOpportunityModal({ open, onClose, onCreate, stages, initialStageKey, properties, users }) {
  const [personName, setPersonName] = useState("");
  const [personId, setPersonId] = useState(null);
  const [stageKey, setStageKey] = useState(initialStageKey || stages[0]?.key || "");
  const [propertyId, setPropertyId] = useState(properties[0]?.id || "");
  const [ownerUserId, setOwnerUserId] = useState(users[0]?.id || "");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDueAt, setNextActionDueAt] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStageKey(initialStageKey || stages[0]?.key || "");
      setPropertyId(properties[0]?.id || "");
      setOwnerUserId(users[0]?.id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialStageKey]);

  function reset() {
    setPersonName("");
    setPersonId(null);
    setStageKey(initialStageKey || stages[0]?.key || "");
    setPropertyId(properties[0]?.id || "");
    setOwnerUserId(users[0]?.id || "");
    setNextAction("");
    setNextActionDueAt("");
    setErrors({});
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    const nextErrors = {};
    if (!personId) nextErrors.personName = "Selecione o contato (cliente/lead).";
    if (!CLOSED_STAGES.includes(stageKey)) {
      if (!nextAction.trim()) nextErrors.nextAction = "Toda oportunidade ativa precisa de uma próxima ação.";
      if (!nextActionDueAt) nextErrors.nextActionDueAt = "Informe o prazo da próxima ação.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    await onCreate({
      stage: stageKey,
      personId,
      propertyId: propertyId || undefined,
      ownerUserId: ownerUserId || undefined,
      nextAction: nextAction.trim(),
      nextActionDueAt: nextActionDueAt ? new Date(nextActionDueAt).toISOString() : undefined,
    });
    reset();
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
          <Input id="o-next-due" type="datetime-local" value={nextActionDueAt} onChange={(e) => setNextActionDueAt(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}
