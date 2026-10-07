"use client";

import { useCallback, useEffect, useState } from "react";
import { notFound } from "next/navigation";
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
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import {
  MATERIAL_REQUEST_STATUS_LABELS,
  MATERIAL_REQUEST_STATUS_TONE,
  LOSS_RECORD_STATUS_LABELS,
  LOSS_RECORD_STATUS_TONE,
  LOSS_RECORD_MOVEMENT_LABELS,
} from "@/lib/mock/construction";
import {
  getProject,
  listMaterialRequests,
  createMaterialRequest,
  receiveMaterialRequest,
  listLossRecords,
  createLossRecord,
  approveLossRecord,
  returnLossRecord,
  upsertApprovalThreshold,
} from "@/lib/api/construction";
import { formatBRL, formatQuantity, formatDate, toNumber } from "@/lib/format";
import { isInvalidNumber, isLossFullyReturned } from "../_components/obraShared";
import OfflineSyncBadge from "@/components/molecules/OfflineSyncBadge/OfflineSyncBadge";
import { enqueueOfflineRecord, generateIdempotencyKey } from "@/lib/offline/offlineQueue";
import { useOfflineSync } from "@/lib/offline/useOfflineSync";
import styles from "./page.module.css";

// Fila offline (Marco 6, contrato §13) — requisição de material.
const OFFLINE_QUEUE_NAME = "construction.material-requests";

export default function MateriaisObraPage({ params }) {
  const [project, setProject] = useState(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [lossRecords, setLossRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({ description: "", quantity: "", unit: "" });
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [receivingMaterialId, setReceivingMaterialId] = useState(null);

  // PWA/offline (Marco 6, contrato §13): se o POST de requisição falhar por rede, fica numa
  // fila local com o idempotencyKey já gerado no cliente, reenviada automaticamente quando a
  // conexão voltar (ou via botão "Sincronizar pendentes") — nunca duplicando no servidor.
  const sendQueuedMaterialRequest = useCallback(
    (payload, idempotencyKey) => createMaterialRequest(payload.projectId, { ...payload, idempotencyKey }),
    []
  );
  const { pendingCount, syncing, syncError, syncNow } = useOfflineSync(OFFLINE_QUEUE_NAME, sendQueuedMaterialRequest, () => load());

  // FIX (auditoria pós-merge Marco 6, 30/09/2026): createLossRecord/listLossRecords/
  // approveLossRecord/returnLossRecord já existiam na API, mas nenhuma tela chamava (Categoria
  // 8 do catálogo de bugs — funcionalidade existe só no papel).
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

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getProject(params.id)
      .catch((err) => {
        if (err?.status === 404) {
          setNotFoundFlag(true);
          return null;
        }
        throw err;
      })
      .then((p) => {
        if (cancelled || !p) return;
        setProject(p);
        return Promise.all([listMaterialRequests(p.id), listLossRecords(p.id)]).then(([mr, lr]) => {
          if (cancelled) return;
          setMaterialRequests(mr || []);
          setLossRecords(lr || []);
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar os materiais.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    const cancel = load();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (notFoundFlag) return notFound();

  if (loading) {
    return (
      <AppShell title="Materiais" backHref={`/painel/obras/lista/${params.id}`}>
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  if (loadError && !project) {
    return (
      <AppShell title="Materiais" backHref={`/painel/obras/lista/${params.id}`}>
        <Alert tone="danger" title="Não foi possível carregar os materiais">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="Materiais" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  function openMaterialModal() {
    setMaterialForm({ description: "", quantity: "", unit: "" });
    setMaterialOpen(true);
  }
  async function handleCreateMaterialRequest() {
    // BUG REAL CORRIGIDO (auditoria Marco 6, Ciclo 9): duplo-clique nativo criava 2 requisições
    // de material duplicadas — createMaterialRequest é um INSERT simples, sem checagem de
    // duplicidade no backend.
    if (savingMaterial) return;
    if (!materialForm.description.trim() || isInvalidNumber(materialForm.quantity) || !materialForm.unit.trim()) return;
    setSavingMaterial(true);
    setActionError("");
    const requestPayload = {
      description: materialForm.description.trim(),
      quantity: toNumber(materialForm.quantity),
      unit: materialForm.unit.trim(),
    };
    const idempotencyKey = generateIdempotencyKey();
    try {
      const created = await createMaterialRequest(project.id, { ...requestPayload, idempotencyKey });
      setMaterialRequests((prev) => [created, ...prev]);
      setMaterialOpen(false);
    } catch (err) {
      if (err?.code === "NETWORK_ERROR") {
        // Offline: guarda localmente com o MESMO idempotencyKey — reenvia quando a conexão
        // voltar, sem perder nem duplicar a requisição.
        enqueueOfflineRecord(OFFLINE_QUEUE_NAME, {
          idempotencyKey,
          label: `Requisição de ${requestPayload.description}`,
          payload: { ...requestPayload, projectId: project.id },
        });
        setMaterialOpen(false);
        setSavingMaterial(false);
        return;
      }
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
    // BUG REAL CORRIGIDO (auditoria Marco 6, Ciclo 9): duplo-clique nativo criava 2 registros
    // de perda de material duplicados — createLossRecord é um INSERT simples, sem checagem de
    // duplicidade no backend.
    if (savingLoss) return;
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
    const ok = await confirm({
      title: "Aprovar esta baixa de material?",
      message: "O registro de perda será aprovado e o estoque será baixado definitivamente.",
      confirmLabel: "Aprovar",
    });
    if (!ok) return;
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

  return (
    <AppShell title={`Materiais — ${project.name}`} backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}

        <OfflineSyncBadge pendingCount={pendingCount} syncing={syncing} syncError={syncError} onSyncNow={syncNow} />

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
      </div>

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

      <ConfirmDialog />
    </AppShell>
  );
}
