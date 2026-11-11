"use client";

// GAP REAL CORRIGIDO (varredura completa do Marco 5 contra o Caderno Técnico, 12/10/2026):
// "Notificações formais" (seção 13 do Caderno — "canal, destinatário, conteúdo/arquivo, data e
// evidência de envio/recebimento") tinha as 8 rotas e o service inteiro prontos desde uma
// rodada anterior (notices.service.js), mas nenhuma função de cliente nem tela chamava nada —
// feature inteira invisível, mesmo padrão repetido do Marco 4.

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import {
  listNotices,
  createNotice,
  listContracts,
  submitNoticeForReview,
  approveNotice,
  rejectNotice,
  sendNotice,
  registerNoticeDeliveryEvidence,
  uploadFile,
} from "@/lib/api/legal";
import { apiFetch } from "@/lib/api/client";
import { lookupFallback } from "@/lib/asyncState/lookup";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { NoticeCorrectionModal, NoticeVersionsModal, NOTICE_EDITABLE_STATUSES } from "./NoticeVersions";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { useLocalCopy } from "@/lib/asyncState/localCopy";
import { NOTICE_CHANNEL_LABELS, NOTICE_STATUS_LABELS, NOTICE_STATUS_TONE } from "@/lib/mock/legal";
import { formatDateTime, formatContractLabel } from "@/lib/format";
import styles from "./page.module.css";

export default function NotificacoesPage() {
  const [actionError, setActionError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ contractId: "", channel: "EMAIL", recipientDescription: "", content: "" });
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [evidenceTarget, setEvidenceTarget] = useState(null);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceBusy, setEvidenceBusy] = useState(false);

  const [mfaOpen, setMfaOpen] = useState(false);
  const [pendingSendId, setPendingSendId] = useState(null);
  const [correctTarget, setCorrectTarget] = useState(null);
  const [versionsTarget, setVersionsTarget] = useState(null);

  // M9-D940: carregando, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  // A lista é editada no lugar (criar/aprovar/enviar), então o vazio fica dentro da tela e a leitura só alimenta `notices`.
  const listQuery = useAsyncState(async () => {
    const [noticesRes, contractsRes, usersRes] = await Promise.all([listNotices(), listContracts(), apiFetch("/users").catch(lookupFallback("os usuários"))]);
    return { notices: noticesRes || [], contracts: contractsRes || [], users: Array.isArray(usersRes) ? usersRes : [] };
  }, { key: "contratos-notificacoes", isEmpty: () => false });
  const loaded = listQuery.data;
  const contracts = useMemo(() => loaded?.contracts || [], [loaded]);
  const users = useMemo(() => loaded?.users || [], [loaded]);
  const userName = (id) => users.find((u) => u.id === id)?.name || "usuário da empresa";
  const [notices, setNotices] = useLocalCopy(loaded?.notices, []); // derivada do dado lido: sem flash de lista vazia no 1º render

  function contractOf(id) {
    return contracts.find((c) => c.id === id) || null;
  }

  const filtered = useMemo(() => {
    if (!statusFilter) return notices;
    return notices.filter((n) => n.status === statusFilter);
  }, [notices, statusFilter]);

  async function handleCreate() {
    if (!createForm.contractId || !createForm.content.trim()) return;
    setCreateBusy(true);
    setCreateError("");
    try {
      const created = await createNotice({
        contractId: createForm.contractId,
        channel: createForm.channel,
        recipientDescription: createForm.recipientDescription.trim() || undefined,
        content: createForm.content.trim(),
      });
      setNotices((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      setCreateForm({ contractId: "", channel: "EMAIL", recipientDescription: "", content: "" });
    } catch (err) {
      setCreateError(legalErrorMessage(err, "Erro ao criar notificação."));
    } finally {
      setCreateBusy(false);
    }
  }

  async function runAction(id, fn) {
    setActionError("");
    try {
      const updated = await fn(id);
      setNotices((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao atualizar notificação."));
    }
  }

  async function handleSend(id) {
    setActionError("");
    try {
      const updated = await sendNotice(id);
      setNotices((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch (err) {
      if (err?.code === "MFA_STEP_UP_REQUIRED") {
        setPendingSendId(id);
        setMfaOpen(true);
      } else {
        setActionError(legalErrorMessage(err, "Erro ao enviar notificação."));
      }
    }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    await runAction(rejectTarget.id, (id) => rejectNotice(id, rejectReason.trim()));
    setRejectTarget(null);
    setRejectReason("");
  }

  async function handleRegisterEvidence() {
    if (!evidenceTarget || !evidenceFile) return;
    setEvidenceBusy(true);
    setActionError("");
    try {
      const uploaded = await uploadFile(evidenceFile);
      const updated = await registerNoticeDeliveryEvidence(evidenceTarget.id, { deliveryEvidenceFileId: uploaded.id });
      setNotices((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setEvidenceTarget(null);
      setEvidenceFile(null);
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao registrar evidência de entrega."));
    } finally {
      setEvidenceBusy(false);
    }
  }

  return (
    <AppShell title="Notificações" backHref="/painel/contratos">
      {actionError ? (
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <Card
        title="Notificações formais"
        subtitle="Canal, destinatário, conteúdo e evidência de envio e recebimento. Corrigir cria nova versão; só a versão aprovada é enviada"
        actions={<Button size="sm" onClick={() => setCreateModalOpen(true)}><Icon name="plus" size={16} /> Nova notificação</Button>}
      >
        <div className={styles.toolbar}>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todas as situações</option>
            {Object.entries(NOTICE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>

        <AsyncState result={listQuery} loadingLabel="Carregando notificações...">
        {filtered.length === 0 ? (
          <EmptyState icon="document" title="Nenhuma notificação" description="Crie a primeira notificação formal vinculada a um contrato." />
        ) : (
          <div className={styles.list}>
            {filtered.map((n) => {
              const contract = contractOf(n.contractId);
              return (
                <div key={n.id} className={styles.row}>
                  <div className={styles.name}>
                    <div>{contract ? formatContractLabel(contract) : "Sem contrato vinculado"} · {NOTICE_CHANNEL_LABELS[n.channel] || "Outro canal"}</div>
                    <span className={styles.meta}>{n.recipientDescription || "Sem destinatário descrito"} · {formatDateTime(n.createdAt)}</span>
                    <span className={styles.meta}>
                      Versão {n.currentVersion || 1}
                      {n.approvedVersion ? (n.approvedVersion === n.currentVersion ? " · aprovada para envio" : ` · aprovada: versão ${n.approvedVersion}`) : " · ainda sem versão aprovada"}
                    </span>
                  </div>
                  <Badge tone={NOTICE_STATUS_TONE[n.status] || "neutral"}>{NOTICE_STATUS_LABELS[n.status] || "Situação desconhecida"}</Badge>
                  <div className={styles.actions}>
                    {NOTICE_EDITABLE_STATUSES.includes(n.status) ? (
                      <Button size="sm" variant="ghost" onClick={() => setCorrectTarget(n)}>Corrigir (nova versão)</Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => setVersionsTarget(n)}>Ver versões</Button>
                    {n.status === "DRAFT" ? (
                      <Button size="sm" variant="secondary" onClick={() => runAction(n.id, submitNoticeForReview)}>Enviar p/ revisão</Button>
                    ) : null}
                    {n.status === "PENDING_REVIEW" ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => runAction(n.id, approveNotice)}>Aprovar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejectTarget(n)}>Rejeitar</Button>
                      </>
                    ) : null}
                    {n.status === "APPROVED" ? (
                      <Button size="sm" onClick={() => handleSend(n.id)}>Enviar</Button>
                    ) : null}
                    {n.status === "SENT" ? (
                      <Button size="sm" variant="secondary" onClick={() => setEvidenceTarget(n)}>Registrar entrega</Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </AsyncState>
      </Card>

      <StickyActionBar>
        <ContractsNavMenu />
      </StickyActionBar>

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nova notificação"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)} disabled={createBusy}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createBusy} disabled={createBusy || !createForm.contractId || !createForm.content.trim()}>Criar como rascunho</Button>
          </>
        }
      >
        {createError ? <Alert tone="danger" className={styles.notice}>{createError}</Alert> : null}
        <div className={styles.form}>
          <FormField label="Contrato" htmlFor="f-contract" required>
            <Select id="f-contract" value={createForm.contractId} onChange={(e) => setCreateForm((p) => ({ ...p, contractId: e.target.value }))}>
              <option value="">Selecione...</option>
              {contracts.map((c) => <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>)}
            </Select>
          </FormField>
          <FormField label="Canal" htmlFor="f-channel" required>
            <Select id="f-channel" value={createForm.channel} onChange={(e) => setCreateForm((p) => ({ ...p, channel: e.target.value }))}>
              {Object.entries(NOTICE_CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormField>
          <FormField label="Destinatário" htmlFor="f-recipient" helper={"Descrição livre (ex.: Locatário — João Silva)."}>
            <Input id="f-recipient" value={createForm.recipientDescription} onChange={(e) => setCreateForm((p) => ({ ...p, recipientDescription: e.target.value }))} />
          </FormField>
          <FormField label="Conteúdo" htmlFor="f-content" required>
            <textarea id="f-content" className={styles.textarea} rows={6} value={createForm.content} onChange={(e) => setCreateForm((p) => ({ ...p, content: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Rejeitar notificação"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectReason.trim()}>Rejeitar</Button>
          </>
        }
      >
        <FormField label="Motivo" htmlFor="f-reject-reason" required>
          <Input id="f-reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(evidenceTarget)}
        onClose={() => setEvidenceTarget(null)}
        title="Registrar evidência de entrega"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEvidenceTarget(null)} disabled={evidenceBusy}>Cancelar</Button>
            <Button onClick={handleRegisterEvidence} loading={evidenceBusy} disabled={evidenceBusy || !evidenceFile}>Registrar</Button>
          </>
        }
      >
        <FormField label="Comprovante" htmlFor="f-evidence-file" required helper="Ex.: AR dos Correios, print do WhatsApp, confirmação de e-mail.">
          <input id="f-evidence-file" type="file" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
        </FormField>
      </Modal>

      <NoticeCorrectionModal
        notice={correctTarget}
        onClose={() => setCorrectTarget(null)}
        onSaved={(updated) => {
          setNotices((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          setCorrectTarget(null);
        }}
      />
      <NoticeVersionsModal notice={versionsTarget} userName={userName} onClose={() => setVersionsTarget(null)} />

      <MfaVerifyModal
        open={mfaOpen}
        onClose={() => setMfaOpen(false)}
        actionLabel="enviar esta notificação"
        onVerified={async () => {
          setMfaOpen(false);
          if (pendingSendId) await handleSend(pendingSendId);
          setPendingSendId(null);
        }}
      />
    </AppShell>
  );
}
