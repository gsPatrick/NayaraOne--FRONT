"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Modal from "@/components/organisms/Modal/Modal";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import {
  QUALITY_STATUS_LABELS,
  QUALITY_STATUS_TONE,
  NONCONFORMITY_SEVERITY_LABELS,
  NONCONFORMITY_SEVERITY_TONE,
  NONCONFORMITY_STATUS_LABELS,
  NONCONFORMITY_STATUS_TONE,
} from "@/lib/mock/construction";
import {
  getProject,
  listProjectStages,
  listQualityItems,
  createQualityItem,
  checkQualityItem,
  removeQualityItem,
  listNonconformities,
  createNonconformity,
  closeNonconformity,
} from "@/lib/api/construction";
import { apiFetch } from "@/lib/api/client";
import { uploadFile } from "@/lib/api/legal";
import { formatDate, dateOnlyInputToIso } from "@/lib/format";
import { QUALITY_CATEGORIES } from "../_components/obraShared";
import styles from "./page.module.css";

export default function QualidadeObraPage({ params }) {
  const [project, setProject] = useState(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [users, setUsers] = useState([]);
  const [stages, setStages] = useState([]);
  const [qualityItems, setQualityItems] = useState([]);
  const [nonconformities, setNonconformities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [viewerFileId, setViewerFileId] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const [qualityOpen, setQualityOpen] = useState(false);
  const [qualityBusyId, setQualityBusyId] = useState(null);
  const [qualityRejecting, setQualityRejecting] = useState(null);
  const [qualityRejectNotes, setQualityRejectNotes] = useState("");
  const [qualityForm, setQualityForm] = useState({ item: "", projectStageId: "", category: "OUTROS" });
  const [savingQuality, setSavingQuality] = useState(false);

  const [ncOpen, setNcOpen] = useState(false);
  const [ncForm, setNcForm] = useState({
    description: "",
    severity: "MEDIUM",
    responsibleUserId: "",
    slaDueAt: "",
    requiresAcceptance: false,
    beforeFileId: "",
    beforeFileName: "",
  });
  const [ncBeforeUploading, setNcBeforeUploading] = useState(false);
  const [ncBeforeUploadError, setNcBeforeUploadError] = useState("");
  const [savingNc, setSavingNc] = useState(false);

  // Modal de fechamento de NC — REGRA FAIL-CLOSED replicada aqui: o botão de confirmar só
  // habilita depois que a evidência "depois" terminar de subir com sucesso (mesma regra que
  // o backend aplica em nonconformities.service.js closeNonconformity).
  const [closingNc, setClosingNc] = useState(null);
  const [ncAfterFileId, setNcAfterFileId] = useState("");
  const [ncAfterFileName, setNcAfterFileName] = useState("");
  const [ncAfterUploading, setNcAfterUploading] = useState(false);
  const [ncAfterUploadError, setNcAfterUploadError] = useState("");
  const [ncAcceptedByUserId, setNcAcceptedByUserId] = useState("");
  const [savingNcClose, setSavingNcClose] = useState(false);

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      getProject(params.id).catch((err) => {
        if (err?.status === 404) {
          setNotFoundFlag(true);
          return null;
        }
        throw err;
      }),
      apiFetch("/users?status=ACTIVE").catch(() => []),
    ])
      .then(([p, u]) => {
        if (cancelled || !p) return;
        setProject(p);
        setUsers(u || []);
        return Promise.all([
          listProjectStages(p.id),
          listQualityItems(p.id),
          listNonconformities(p.id),
        ]).then(([st, qi, ncs]) => {
          if (cancelled) return;
          setStages(st || []);
          setQualityItems(qi || []);
          setNonconformities(ncs || []);
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar a qualidade da obra.");
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
      <AppShell title="Qualidade" backHref={`/painel/obras/lista/${params.id}`}>
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  if (loadError && !project) {
    return (
      <AppShell title="Qualidade" backHref={`/painel/obras/lista/${params.id}`}>
        <Alert tone="danger" title="Não foi possível carregar a qualidade da obra">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="Qualidade" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  // FIX (auditoria pós-merge Marco 6, 30/09/2026): a API aceita {status, notes} em
  // checkQualityItem, mas a tela nunca oferecia campo pra registrar o motivo ao marcar "Não OK"
  // — dado se perdia em silêncio (Categoria 3 do catálogo de bugs). "OK" continua direto (sem
  // motivo a justificar); "Não OK" abre o modal de observação obrigatória.
  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 51, 2026-10-05): marcar um item
  // NOT_OK dispara createNonconformity automaticamente no backend (R19 — "falha abre
  // nonconformity"), mas a aba de Não Conformidades só era recarregada no load inicial da
  // página — a NC nova existia no banco mas ficava invisível na tela até um F5 manual.
  async function handleQualityQuickAction(item, status, notes) {
    if (qualityBusyId) return;
    setActionError("");
    setQualityBusyId(item.id);
    try {
      const updated = await checkQualityItem(item.id, { status, notes: notes || undefined });
      setQualityItems((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setQualityRejecting(null);
      setQualityRejectNotes("");
      if (status === "NOT_OK") {
        const refreshedNcs = await listNonconformities(params.id);
        setNonconformities(refreshedNcs || []);
      }
    } catch (err) {
      setActionError(err?.message || "Não foi possível atualizar o item de qualidade.");
    } finally {
      setQualityBusyId(null);
    }
  }

  function openQualityModal() {
    setQualityForm({ item: "", projectStageId: "", category: "OUTROS" });
    setQualityOpen(true);
  }
  async function handleCreateQualityItem() {
    // BUG REAL CORRIGIDO (auditoria E2E ao vivo, Marco 6, Ciclo 8, 2026-10-06): mesma classe de
    // duplo-clique nativo criando registro duplicado (sem checagem de duplicidade no backend).
    if (savingQuality) return;
    if (!qualityForm.item.trim()) return;
    setSavingQuality(true);
    setActionError("");
    try {
      const created = await createQualityItem(project.id, {
        item: qualityForm.item.trim(),
        projectStageId: qualityForm.projectStageId || undefined,
        category: qualityForm.category || "OUTROS",
      });
      setQualityItems((prev) => [...prev, created]);
      setQualityOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o item de checklist.");
    } finally {
      setSavingQuality(false);
    }
  }

  // LACUNA REAL CORRIGIDA (auditoria Marco 6, Ciclo 9): havia create+check para item de
  // checklist de qualidade, mas nenhuma forma de remover um item cadastrado por engano (ex.:
  // categoria/texto errado) antes de qualquer verificação — só restava "resolver" marcando
  // OK/NOT_OK, poluindo o checklist real da obra pra sempre. DELETE só é aceito pelo backend
  // enquanto o item ainda está PENDING (removeQualityItem).
  async function handleDeleteQualityItem(item) {
    if (qualityBusyId) return;
    const ok = await confirm({
      title: "Excluir item de checklist?",
      message: `O item "${item.item}" será removido. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setActionError("");
    setQualityBusyId(item.id);
    try {
      await removeQualityItem(item.id);
      setQualityItems((prev) => prev.filter((q) => q.id !== item.id));
    } catch (err) {
      setActionError(err?.message || "Não foi possível excluir o item de checklist.");
    } finally {
      setQualityBusyId(null);
    }
  }

  function openNcModal() {
    setNcForm({
      description: "",
      severity: "MEDIUM",
      responsibleUserId: "",
      slaDueAt: "",
      requiresAcceptance: false,
      beforeFileId: "",
      beforeFileName: "",
    });
    setNcBeforeUploadError("");
    setNcOpen(true);
  }

  async function handleUploadBeforeEvidence(file) {
    if (!file) return;
    setNcBeforeUploading(true);
    setNcBeforeUploadError("");
    try {
      const uploaded = await uploadFile(file);
      setNcForm((p) => ({ ...p, beforeFileId: uploaded.id, beforeFileName: file.name }));
    } catch (err) {
      setNcBeforeUploadError(err?.message || "Erro ao enviar evidência.");
    } finally {
      setNcBeforeUploading(false);
    }
  }

  async function handleCreateNonconformity() {
    // BUG REAL CORRIGIDO (auditoria E2E ao vivo, Marco 6, Ciclo 8, 2026-10-06): mesma classe de
    // duplo-clique nativo criando registro duplicado (sem checagem de duplicidade no backend).
    if (savingNc) return;
    if (!ncForm.description.trim()) return;
    setSavingNc(true);
    setActionError("");
    try {
      const created = await createNonconformity(project.id, {
        description: ncForm.description.trim(),
        severity: ncForm.severity,
        responsibleUserId: ncForm.responsibleUserId || undefined,
        slaDueAt: dateOnlyInputToIso(ncForm.slaDueAt) || undefined,
        requiresAcceptance: ncForm.requiresAcceptance,
        beforeEvidenceFileIds: ncForm.beforeFileId ? [ncForm.beforeFileId] : [],
      });
      setNonconformities((prev) => [created, ...prev]);
      setNcOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar a não conformidade.");
    } finally {
      setSavingNc(false);
    }
  }

  function openCloseNcModal(nc) {
    setClosingNc(nc);
    setNcAfterFileId("");
    setNcAfterFileName("");
    setNcAfterUploadError("");
    setNcAcceptedByUserId("");
  }

  async function handleUploadAfterEvidence(file) {
    if (!file) return;
    setNcAfterUploading(true);
    setNcAfterUploadError("");
    try {
      const uploaded = await uploadFile(file);
      setNcAfterFileId(uploaded.id);
      setNcAfterFileName(file.name);
    } catch (err) {
      setNcAfterUploadError(err?.message || "Erro ao enviar evidência.");
    } finally {
      setNcAfterUploading(false);
    }
  }

  // REGRA FAIL-CLOSED replicada na UI (não só confiar no erro 422 da API): o botão de
  // confirmar fechamento fica desabilitado até existir uma evidência "depois" já enviada
  // (ncAfterFileId preenchido) e, se a NC exigir aceite, até um responsável pelo aceite ser
  // selecionado. Mesmas duas condições de nonconformities.service.js closeNonconformity.
  async function handleCloseNonconformity() {
    if (!closingNc || !ncAfterFileId) return;
    if (closingNc.requiresAcceptance && !ncAcceptedByUserId) return;
    setSavingNcClose(true);
    setActionError("");
    try {
      const updated = await closeNonconformity(closingNc.id, {
        afterEvidenceFileIds: [ncAfterFileId],
        acceptedByUserId: ncAcceptedByUserId || undefined,
      });
      setNonconformities((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setClosingNc(null);
    } catch (err) {
      setActionError(err?.message || "Não foi possível fechar a não conformidade.");
    } finally {
      setSavingNcClose(false);
    }
  }

  return (
    <AppShell title={`Qualidade — ${project.name}`} backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}

        <Card
          title="Qualidade"
          subtitle="Checklist de qualidade"
          actions={<Button size="sm" variant="secondary" onClick={openQualityModal}>
            <Icon name="plus" size={14} /> Novo item de checklist
          </Button>}
        >
          {qualityItems.length === 0 ? (
            <EmptyState icon="check" title="Sem itens de checklist" description="Nenhum item de qualidade cadastrado para esta obra." />
          ) : (
            <div className={styles.rowList}>
              {qualityItems.map((q) => {
                const checkedBy = q.checkedByUserId ? users.find((u) => u.id === q.checkedByUserId) : null;
                return (
                  <div key={q.id} className={styles.rowStatic}>
                    <div className={styles.rowInfo}>
                      <span className={styles.rowTitle}>
                        {q.item}
                        {" "}
                        <Badge tone="neutral">{QUALITY_CATEGORIES.find((c) => c.value === q.category)?.label || q.category}</Badge>
                      </span>
                      <span className={styles.rowSubtitle}>
                        {checkedBy ? `Verificado por ${checkedBy.name}` : "Ainda não verificado"}
                      </span>
                      {/* FIX (2ª varredura final do Front do Marco 6, 30/09/2026): o motivo
                          digitado ao marcar "Não OK" era salvo (checkQualityItem já grava
                          "notes"), mas nunca era exibido em lugar nenhum — ficava impossível
                          saber por que um item foi reprovado depois que o modal fechava. */}
                      {q.status === "NOT_OK" && q.notes ? (
                        <span className={styles.rejectionReason}>Motivo: {q.notes}</span>
                      ) : null}
                    </div>
                    <div className={styles.rowRight}>
                      <Badge tone={QUALITY_STATUS_TONE[q.status]}>{QUALITY_STATUS_LABELS[q.status]}</Badge>
                      {/* FIX (auditoria E2E de browser, ciclo 3, 02/10/2026): os botões
                          OK/Não OK só apareciam com status PENDING — depois do primeiro
                          veredito não havia NENHUMA forma de corrigir um engano (ex.: marcar
                          "OK" sem querer). checkQualityItem no backend já aceita re-verificar
                          livremente (sem trava de status atual), então a UI é quem artificialmente
                          travava — agora os botões sempre aparecem, com rótulo "Revisar" quando
                          já verificado. */}
                      <div className={styles.quickActions}>
                        <Button
                          size="sm"
                          variant={q.status === "OK" ? "ghost" : "secondary"}
                          loading={qualityBusyId === q.id}
                          disabled={qualityBusyId === q.id || q.status === "OK"}
                          onClick={() => handleQualityQuickAction(q, "OK")}
                        >
                          {q.status === "PENDING" ? "OK" : "Marcar OK"}
                        </Button>
                        {q.status === "PENDING" ? (
                          <button
                            type="button"
                            className={styles.rowEditBtn}
                            aria-label={`Excluir item ${q.item}`}
                            disabled={qualityBusyId === q.id}
                            onClick={() => handleDeleteQualityItem(q)}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        ) : null}
                        <Button
                          size="sm"
                          variant={q.status === "NOT_OK" ? "ghost" : "danger"}
                          disabled={qualityBusyId === q.id || q.status === "NOT_OK"}
                          onClick={() => {
                            setQualityRejecting(q);
                            setQualityRejectNotes("");
                          }}
                        >
                          {q.status === "PENDING" ? "Não OK" : "Marcar não conforme"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div id="nao-conformidades">
        <Card
          title="Não Conformidades"
          subtitle="Ocorrências de qualidade/segurança em aberto ou fechadas"
          actions={<Button size="sm" variant="secondary" onClick={openNcModal}>
            <Icon name="plus" size={14} /> Nova não conformidade
          </Button>}
        >
          {nonconformities.length === 0 ? (
            <EmptyState icon="shield" title="Sem não conformidades" description="Nenhuma não conformidade registrada para esta obra." />
          ) : (
            <div className={styles.rowList}>
              {nonconformities.map((nc) => {
                const respUser = nc.responsibleUserId ? users.find((u) => u.id === nc.responsibleUserId) : null;
                return (
                  <div key={nc.id} className={styles.rowStatic}>
                    <div className={styles.rowInfo}>
                      <span className={styles.rowTitle}>{nc.description}</span>
                      <span className={styles.rowSubtitle}>
                        {respUser ? `Responsável: ${respUser.name}` : "Sem responsável definido"}
                        {nc.slaDueAt ? ` · Prazo: ${formatDate(nc.slaDueAt)}` : ""}
                        {nc.requiresAcceptance ? " · Exige aceite para fechar" : ""}
                      </span>
                      {nc.beforeEvidenceFileIds?.length || nc.afterEvidenceFileIds?.length ? (
                        <span className={styles.rowSubtitle}>
                          {(nc.beforeEvidenceFileIds || []).map((fid, idx) => (
                            <button
                              key={fid}
                              type="button"
                              style={{ background: "none", border: "none", padding: 0, marginRight: 8, color: "var(--color-brand)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
                              onClick={() => setViewerFileId(fid)}
                            >
                              ver evidência (antes) {idx + 1}
                            </button>
                          ))}
                          {(nc.afterEvidenceFileIds || []).map((fid, idx) => (
                            <button
                              key={fid}
                              type="button"
                              style={{ background: "none", border: "none", padding: 0, marginRight: 8, color: "var(--color-brand)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
                              onClick={() => setViewerFileId(fid)}
                            >
                              ver evidência (depois) {idx + 1}
                            </button>
                          ))}
                        </span>
                      ) : null}
                    </div>
                    <div className={styles.rowRight}>
                      {/* BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 51, 2026-10-05):
                          o backend calcula e persiste evidenceReuseFlagged (M6-59 — alerta
                          anti-fraude de foto reaproveitada entre NCs diferentes), mas a tela
                          nunca exibia isso — o alerta ficava funcionalmente invisível. */}
                      {nc.evidenceReuseFlagged ? (
                        <span title="A mesma evidência (foto) já foi usada em outra não conformidade — possível reuso indevido.">
                          <Badge tone="danger">Evidência reutilizada</Badge>
                        </span>
                      ) : null}
                      <Badge tone={NONCONFORMITY_SEVERITY_TONE[nc.severity]}>{NONCONFORMITY_SEVERITY_LABELS[nc.severity] || nc.severity}</Badge>
                      <Badge tone={NONCONFORMITY_STATUS_TONE[nc.status]}>{NONCONFORMITY_STATUS_LABELS[nc.status] || nc.status}</Badge>
                      {nc.status === "OPEN" ? (
                        <Button size="sm" variant="secondary" onClick={() => openCloseNcModal(nc)}>
                          Fechar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        </div>
      </div>

      <Modal
        open={qualityOpen}
        onClose={() => setQualityOpen(false)}
        title="Novo item de checklist"
        footer={
          <>
            <Button variant="secondary" onClick={() => setQualityOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateQualityItem} loading={savingQuality} disabled={!qualityForm.item.trim()}>Criar item</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Descrição do item" htmlFor="m-quality-item" required>
              <Input id="m-quality-item" value={qualityForm.item} onChange={(e) => setQualityForm((p) => ({ ...p, item: e.target.value }))} placeholder="Ex: Verificar prumo e nível da fundação" />
            </FormField>
          </div>
          <FormField label="Categoria" htmlFor="m-quality-category" required helper="Reprovação em Estrutura/Hidráulica/Elétrica abre não conformidade crítica e bloqueia a entrega da obra.">
            <Select id="m-quality-category" value={qualityForm.category} onChange={(e) => setQualityForm((p) => ({ ...p, category: e.target.value }))}>
              {QUALITY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Etapa vinculada" htmlFor="m-quality-stage" helper="Opcional">
            <Select id="m-quality-stage" value={qualityForm.projectStageId} onChange={(e) => setQualityForm((p) => ({ ...p, projectStageId: e.target.value }))}>
              <option value="">Obra toda</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.sequence}. {s.name}</option>
              ))}
            </Select>
          </FormField>
        </div>
      </Modal>

      <Modal
        open={!!qualityRejecting}
        onClose={() => {
          setQualityRejecting(null);
          setQualityRejectNotes("");
        }}
        title="Marcar item como Não OK"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setQualityRejecting(null); setQualityRejectNotes(""); }}>Cancelar</Button>
            <Button
              variant="danger"
              loading={qualityBusyId === qualityRejecting?.id}
              disabled={!qualityRejectNotes.trim()}
              onClick={() => handleQualityQuickAction(qualityRejecting, "NOT_OK", qualityRejectNotes.trim())}
            >
              Confirmar Não OK
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Motivo / observação" htmlFor="m-quality-reject-notes" required helper="Obrigatório — explique o que foi encontrado para registrar no histórico do item.">
              <textarea
                id="m-quality-reject-notes"
                className={styles.textarea}
                value={qualityRejectNotes}
                onChange={(e) => setQualityRejectNotes(e.target.value)}
                placeholder="Ex: infiltração visível na parede leste, precisa de correção antes de prosseguir"
                rows={4}
              />
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={ncOpen}
        onClose={() => setNcOpen(false)}
        title="Nova não conformidade"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNcOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateNonconformity} loading={savingNc} disabled={!ncForm.description.trim()}>
              Registrar
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Descrição" htmlFor="m-nc-description" required>
              <textarea
                id="m-nc-description"
                className={styles.textarea}
                rows={3}
                value={ncForm.description}
                onChange={(e) => setNcForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Descreva a não conformidade encontrada"
              />
            </FormField>
          </div>
          <FormField label="Severidade" htmlFor="m-nc-severity" required>
            <Select id="m-nc-severity" value={ncForm.severity} onChange={(e) => setNcForm((p) => ({ ...p, severity: e.target.value }))}>
              {Object.entries(NONCONFORMITY_SEVERITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Responsável" htmlFor="m-nc-responsible" helper="Opcional">
            <Select id="m-nc-responsible" value={ncForm.responsibleUserId} onChange={(e) => setNcForm((p) => ({ ...p, responsibleUserId: e.target.value }))}>
              <option value="">Sem responsável</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Prazo (SLA)" htmlFor="m-nc-sla" helper="Opcional">
            <Input
              id="m-nc-sla"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              value={ncForm.slaDueAt}
              onChange={(e) => setNcForm((p) => ({ ...p, slaDueAt: e.target.value }))}
            />
          </FormField>
          <FormField label="Exige aceite para fechar?" htmlFor="m-nc-requires-acceptance">
            <Select
              id="m-nc-requires-acceptance"
              value={ncForm.requiresAcceptance ? "yes" : "no"}
              onChange={(e) => setNcForm((p) => ({ ...p, requiresAcceptance: e.target.value === "yes" }))}
            >
              <option value="no">Não</option>
              <option value="yes">Sim</option>
            </Select>
          </FormField>
          <div className={styles.span2}>
            <FormField label="Evidência 'antes'" htmlFor="m-nc-before-file">
              <FileDropInput
                id="m-nc-before-file"
                accept="image/*,application/pdf"
                uploading={ncBeforeUploading}
                error={ncBeforeUploadError || undefined}
                fileNames={ncForm.beforeFileName ? [ncForm.beforeFileName] : []}
                onFiles={(files) => handleUploadBeforeEvidence(files[0])}
                onRemove={() => setNcForm((p) => ({ ...p, beforeFileId: "", beforeFileName: "" }))}
                helper="Foto do problema encontrado (opcional)."
              />
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(closingNc)}
        onClose={() => setClosingNc(null)}
        title="Fechar não conformidade"
        footer={
          <>
            <Button variant="secondary" onClick={() => setClosingNc(null)}>Cancelar</Button>
            <Button
              onClick={handleCloseNonconformity}
              loading={savingNcClose}
              disabled={!ncAfterFileId || (closingNc?.requiresAcceptance && !ncAcceptedByUserId)}
            >
              Confirmar fechamento
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <Alert tone="warning">
              Para fechar esta não conformidade é obrigatório enviar uma evidência "depois" —
              o botão de confirmar só habilita depois do envio ser concluído com sucesso.
            </Alert>
          </div>
          <div className={styles.span2}>
            <FormField label="Evidência 'depois'" htmlFor="m-nc-after-file" required>
              <FileDropInput
                id="m-nc-after-file"
                accept="image/*,application/pdf"
                uploading={ncAfterUploading}
                error={ncAfterUploadError || undefined}
                fileNames={ncAfterFileName ? [ncAfterFileName] : []}
                onFiles={(files) => handleUploadAfterEvidence(files[0])}
                onRemove={() => { setNcAfterFileId(""); setNcAfterFileName(""); }}
                helper="Foto comprovando a correção do problema — obrigatório."
              />
            </FormField>
          </div>
          {closingNc?.requiresAcceptance ? (
            <div className={styles.span2}>
              <FormField label="Aceite por" htmlFor="m-nc-accepted-by" helper="Esta NC exige aceite — obrigatório para fechar." required>
                <Select id="m-nc-accepted-by" value={ncAcceptedByUserId} onChange={(e) => setNcAcceptedByUserId(e.target.value)}>
                  <option value="">Selecione quem aceitou</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </FormField>
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog />

      <FileViewerModal
        open={!!viewerFileId}
        onClose={() => setViewerFileId(null)}
        fileId={viewerFileId}
      />
    </AppShell>
  );
}
