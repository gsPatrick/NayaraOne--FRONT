"use client";

// Notificação versionada (DoD M5 "Aditivos/notificações versionados"): corrigir cria uma versão nova (a anterior
// fica preservada) e a notificação volta para rascunho — precisa de nova revisão/aprovação; só a versão aprovada
// é enviada. Corrige-se em rascunho, em revisão ou rejeitada (EDITABLE de noticeVersions.service).
import { useEffect, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { createNoticeVersion, listNoticeVersions, uploadFile } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { hasNoticeRecipient, NOTICE_RECIPIENT_MESSAGE } from "@/lib/legal/noticeRecipient";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export const NOTICE_EDITABLE_STATUSES = ["DRAFT", "PENDING_REVIEW", "REJECTED"];

export function NoticeCorrectionModal({ notice, onClose, onSaved }) {
  const [form, setForm] = useState({ reason: "", content: "", recipientDescription: "", file: null });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (notice) setForm({ reason: "", content: notice.content || "", recipientDescription: notice.recipientDescription || "", file: null });
    setError("");
  }, [notice]);

  // Destinatário da nova versão: a descrição do formulário ou a pessoa já ligada à notificação.
  const recipientOk = hasNoticeRecipient({ recipientPersonId: notice?.recipientPersonId, recipientDescription: form.recipientDescription });

  async function handleSave() {
    if (!form.reason.trim() || !recipientOk) return;
    setError("");
    setBusy(true);
    try {
      const contentFileId = form.file ? (await uploadFile(form.file)).id : undefined;
      const result = await createNoticeVersion(notice.id, {
        reason: form.reason.trim(),
        content: form.content.trim() || undefined,
        recipientDescription: form.recipientDescription.trim() || undefined,
        ...(contentFileId ? { contentFileId } : {}),
      });
      onSaved(result.notice || result);
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível criar a nova versão."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(notice)}
      onClose={onClose}
      title="Corrigir notificação (nova versão)"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={handleSave} loading={busy} disabled={busy || !form.reason.trim() || !recipientOk}>Criar nova versão</Button>
        </>
      }
    >
      <Alert tone="info">A versão atual fica guardada. A nova versão volta a notificação para rascunho e precisa de nova revisão e aprovação; só a versão aprovada é enviada.</Alert>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className={styles.form}>
        <FormField label="Motivo da correção" htmlFor="f-version-reason" required>
          <Input id="f-version-reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Ex.: Valor do débito corrigido" />
        </FormField>
        <FormField
          label="Destinatário"
          htmlFor="f-version-recipient"
          required={!notice?.recipientPersonId}
          error={recipientOk ? undefined : NOTICE_RECIPIENT_MESSAGE}
          helper={notice?.recipientPersonId ? "A pessoa destinatária já ligada à notificação continua valendo." : "Obrigatório: descreva quem vai receber a notificação."}
        >
          <Input id="f-version-recipient" value={form.recipientDescription} onChange={(e) => setForm((p) => ({ ...p, recipientDescription: e.target.value }))} />
        </FormField>
        <FormField label="Conteúdo" htmlFor="f-version-content">
          <textarea id="f-version-content" className={styles.textarea} rows={6} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
        </FormField>
        <FormField label="Arquivo da notificação (opcional)" htmlFor="f-version-file" helper="Substitui o arquivo da versão anterior.">
          <input id="f-version-file" type="file" onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))} />
        </FormField>
      </div>
    </Modal>
  );
}

export function NoticeVersionsModal({ notice, userName, onClose }) {
  const [versions, setVersions] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!notice) return undefined;
    let alive = true;
    setVersions(null);
    setError("");
    listNoticeVersions(notice.id)
      .then((list) => alive && setVersions(Array.isArray(list) ? list : []))
      .catch((err) => alive && setError(legalErrorMessage(err, "Não foi possível carregar as versões.")));
    return () => {
      alive = false;
    };
  }, [notice]);

  return (
    <Modal open={Boolean(notice)} onClose={onClose} title="Versões da notificação" footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {versions && versions.length === 0 ? <EmptyState icon="document" title="Sem versões" description="Nenhuma versão registrada." /> : null}
      <div className={styles.list} data-testid="notice-versions">
        {(versions || []).map((v) => (
          <div key={v.id} className={styles.row}>
            <div className={styles.name}>
              <div>
                Versão {v.versionNumber}
                {notice && v.versionNumber === notice.approvedVersion ? " · aprovada" : ""}
                {notice && v.versionNumber === notice.currentVersion ? " · atual" : ""}
              </div>
              <span className={styles.meta}>
                {v.reason || "Sem motivo"} · {formatDateTime(v.createdAt)} (horário de Brasília){v.createdBy ? ` · por ${userName(v.createdBy)}` : ""}
                {v.draftedByAi ? " · rascunho feito pela NAY" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
