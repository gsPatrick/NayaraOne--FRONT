"use client";

// Minuta sugerida pela NAY Jurídica (Caderno M5 §17 "Sugere minuta usando biblioteca homologada"; JUR-008 "decisão jurídica é
// humana"). A NAY monta o texto só com versões de cláusula homologadas; nada muda no contrato até uma pessoa aceitar (vira versão
// em rascunho, que ainda precisa da aprovação da versão) ou descartar com motivo.
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { useHasPermission } from "@/lib/rbac/useHasPermission";
import { suggestContractDraft, listContractDraftSuggestions, acceptContractDraftSuggestion, discardContractDraftSuggestion, uploadFile } from "@/lib/api/legal";
import { draftMethodLabel, DRAFT_STATUS_LABELS, DRAFT_STATUS_TONE, canDecideDraft } from "@/lib/legal/nayDraft";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function NayDraftCard({ contract, onChanged, onNotice }) {
  const canCreate = useHasPermission("legal:create");
  const query = useAsyncState(async () => (await listContractDraftSuggestions(contract.id)) || [], { key: `nay-minutas-${contract.id}`, isEmpty: () => false });
  const items = query.data || [];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(null);
  const [discarding, setDiscarding] = useState(null);
  const [file, setFile] = useState(null);
  const [reason, setReason] = useState("");

  async function act(fn, success) {
    setBusy(true);
    setError("");
    try {
      await fn();
      if (success) onNotice({ tone: "info", text: success });
      await query.reload();
      return true;
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível concluir a ação."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const ask = () => act(() => suggestContractDraft(contract.id), "A NAY sugeriu uma minuta. Revise antes de aceitar.");
  async function accept() {
    const ok = await act(async () => {
      const uploaded = file ? await uploadFile(file) : null;
      await acceptContractDraftSuggestion(accepting.id, { documentFileId: uploaded ? uploaded.id : undefined, reason });
      await onChanged();
    }, "Minuta aceita: virou uma nova versão em rascunho, que ainda precisa ser aprovada.");
    if (ok) setAccepting(null);
  }
  async function discard() {
    const ok = await act(() => discardContractDraftSuggestion(discarding.id, reason), "Minuta descartada.");
    if (ok) setDiscarding(null);
  }
  const open = (setter, s) => { setError(""); setReason(""); setFile(null); setter(s); };

  return (
    <Card
      title="Minuta sugerida pela NAY"
      subtitle="Montada só com cláusulas homologadas; vira versão do contrato apenas com o seu aceite"
      actions={canCreate ? <Button size="sm" variant="secondary" onClick={ask} loading={busy} data-testid="nay-draft-suggest"><Icon name="document" size={16} /> Pedir minuta à NAY</Button> : null}
    >
      {error && !accepting && !discarding ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
      <AsyncState result={query} loadingLabel="Carregando minutas...">
        {items.length === 0 ? <p className={styles.versionDate}>Nenhuma minuta sugerida para este contrato.</p> : items.map((s) => (
          <div key={s.id} className={styles.versionRow} data-testid={`nay-draft-${s.id}`}>
            <div className={styles.versionInfo}>
              <Badge tone={DRAFT_STATUS_TONE[s.status] || "neutral"}>{DRAFT_STATUS_LABELS[s.status] || "Minuta"}</Badge>
              <span className={styles.versionDate}>{draftMethodLabel(s)} · {s.clauseVersionIds.length} cláusula(s) homologada(s) · {formatDateTime(s.criadoEm)}</span>
              <span className={styles.versionDate}>{s.aviso}</span>
              <pre className={styles.draftText}>{s.content}</pre>
            </div>
            {canDecideDraft(s, canCreate) ? (
              <div className={styles.versionActions}>
                <Button size="sm" onClick={() => open(setAccepting, s)} disabled={busy} data-testid="nay-draft-accept">Aceitar como nova versão</Button>
                <Button size="sm" variant="ghost" onClick={() => open(setDiscarding, s)} disabled={busy}>Descartar</Button>
              </div>
            ) : null}
          </div>
        ))}
      </AsyncState>

      <Modal open={Boolean(accepting)} onClose={() => setAccepting(null)} title="Aceitar a minuta da NAY"
        footer={<><Button variant="secondary" onClick={() => setAccepting(null)} disabled={busy}>Voltar</Button><Button onClick={accept} loading={busy} data-testid="nay-draft-accept-confirm">Criar versão em rascunho</Button></>}>
        {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
        <p>O texto da minuta vira a próxima versão do contrato, em rascunho. A aprovação da versão continua com quem tem a alçada.</p>
        <FormField label="Documento revisado" htmlFor="f-nay-file" helper="Arquivo do documento desta versão (exigido quando a empresa exige documento em toda versão).">
          <input id="f-nay-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </FormField>
        <FormField label="Observação (opcional)" htmlFor="f-nay-note">
          <Input id="f-nay-note" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </FormField>
      </Modal>

      <Modal open={Boolean(discarding)} onClose={() => setDiscarding(null)} title="Descartar a minuta"
        footer={<><Button variant="secondary" onClick={() => setDiscarding(null)} disabled={busy}>Voltar</Button><Button onClick={discard} loading={busy} disabled={reason.trim().length < 5}>Descartar</Button></>}>
        {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
        <FormField label="Motivo" htmlFor="f-nay-reason" required>
          <Input id="f-nay-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </FormField>
      </Modal>
    </Card>
  );
}
