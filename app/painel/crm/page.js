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
import { PROPERTIES } from "@/lib/mock/properties";
import { STAGES, OPPORTUNITIES as SEED_OPPORTUNITIES } from "@/lib/mock/opportunities";
import { formatDateTime, isOverdue } from "@/lib/format";
import styles from "./page.module.css";

const CLOSED_STAGES = ["ganho", "perdido"];
const VISIT_TONE = { Realizada: "success", Agendada: "info", Cancelada: "danger" };

export default function CrmPage() {
  const [opportunities, setOpportunities] = useState(SEED_OPPORTUNITIES);
  const [stages, setStages] = useState(STAGES);
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStageKey, setCreateStageKey] = useState(null);
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");

  function openCreateForStage(stageKey) {
    setCreateStageKey(stageKey);
    setCreateOpen(true);
  }

  const getItems = (stageKey) => opportunities.filter((o) => o.stage === stageKey);

  const overdueCount = useMemo(
    () => opportunities.filter((o) => !CLOSED_STAGES.includes(o.stage) && isOverdue(o.nextActionDueAt)).length,
    [opportunities]
  );

  function handleCreate(newOpportunity) {
    setOpportunities((prev) => [newOpportunity, ...prev]);
    setCreateOpen(false);
  }

  function handleMoveItem(itemId, newStageKey) {
    setOpportunities((prev) => prev.map((o) => (o.id === itemId ? { ...o, stage: newStageKey } : o)));
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

      <KanbanBoard
        columns={stages}
        getItems={getItems}
        emptyLabel="Nenhuma oportunidade nesta etapa"
        renderItem={(item) => (
          <OpportunityCard key={item.id} opportunity={item} onClick={setSelected} />
        )}
        onMoveItem={handleMoveItem}
        onAddColumn={handleAddColumn}
        onRenameColumn={handleRenameColumn}
        onReorderColumns={handleReorderColumns}
        onAddItem={openCreateForStage}
        addItemLabel="Nova oportunidade"
      />

      <OpportunityDetailModal opportunity={selected} stages={stages} onClose={() => setSelected(null)} />
      <CreateOpportunityModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        stages={stages}
        initialStageKey={createStageKey}
      />
    </AppShell>
  );
}

function OpportunityDetailModal({ opportunity, stages, onClose }) {
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
            {opportunity.visits.length === 0 ? (
              <p className={styles.mutedNote}>Nenhuma visita registrada.</p>
            ) : (
              opportunity.visits.map((visit) => (
                <div className={styles.visitRow} key={visit.id}>
                  <span>{visit.propertyName} · {formatDateTime(visit.scheduledAt)}</span>
                  <Badge tone={VISIT_TONE[visit.status] || "neutral"}>{visit.status}</Badge>
                </div>
              ))
            )}
          </div>

          <div className={styles.detailSection}>
            <p className={styles.detailSectionTitle}>Histórico de mensagens</p>
            <div className={styles.thread}>
              {opportunity.messages.map((msg) => (
                <div className={styles.messageBubble} key={msg.id}>
                  <span className={styles.messageFrom}>
                    {msg.from}
                    <span className={styles.messageTime}>{formatDateTime(msg.sentAt)}</span>
                  </span>
                  <p className={styles.messageText}>{msg.text}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </Modal>
  );
}

function CreateOpportunityModal({ open, onClose, onCreate, stages, initialStageKey }) {
  const [personName, setPersonName] = useState("");
  const [personId, setPersonId] = useState(null);
  const [stageKey, setStageKey] = useState(initialStageKey || stages[0]?.key || "");
  const [propertyId, setPropertyId] = useState(PROPERTIES[0]?.id || "");
  const [repName, setRepName] = useState("Renata Souza");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDueAt, setNextActionDueAt] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) setStageKey(initialStageKey || stages[0]?.key || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialStageKey]);

  function reset() {
    setPersonName("");
    setPersonId(null);
    setStageKey(initialStageKey || stages[0]?.key || "");
    setPropertyId(PROPERTIES[0]?.id || "");
    setRepName("Renata Souza");
    setNextAction("");
    setNextActionDueAt("");
    setErrors({});
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    const nextErrors = {};
    if (!personName.trim()) nextErrors.personName = "Selecione o contato (cliente/lead).";
    if (!CLOSED_STAGES.includes(stageKey)) {
      if (!nextAction.trim()) nextErrors.nextAction = "Toda oportunidade ativa precisa de uma próxima ação.";
      if (!nextActionDueAt) nextErrors.nextActionDueAt = "Informe o prazo da próxima ação.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const property = PROPERTIES.find((p) => p.id === propertyId);
    onCreate({
      id: `opp-${Date.now()}`,
      stage: stageKey,
      personName: personName.trim(),
      personId,
      propertyName: property?.name || "—",
      repName,
      nextAction: nextAction.trim(),
      nextActionDueAt: new Date(nextActionDueAt).toISOString(),
      createdAt: new Date().toISOString(),
      visits: [],
      messages: [],
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
          <Button onClick={handleSubmit}>Criar oportunidade</Button>
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
            {PROPERTIES.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </FormField>
        <div className={styles.span2}>
          <FormField label="Vendedor responsável" htmlFor="o-rep">
            <Select id="o-rep" value={repName} onChange={(e) => setRepName(e.target.value)}>
              <option>Renata Souza</option>
              <option>João Pereira</option>
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
