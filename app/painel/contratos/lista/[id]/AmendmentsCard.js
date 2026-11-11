"use client";

// Aditivos (Caderno §13): numerados por contrato, imutáveis; cada signatário assina com a via assinada e o aditivo
// fica assinado quando todos os signatários exigidos assinaram.
import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import { getContractAmendment, signContractAmendment, uploadFile } from "@/lib/api/legal";
import { AMENDMENT_STATUS_LABELS, AMENDMENT_STATUS_TONE, PARTY_ROLE_LABELS } from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { reportLookupProblem } from "@/lib/asyncState/lookup";
import { formatDate, formatDateTime } from "@/lib/format";
import AmendmentModal from "./AmendmentModal";
import styles from "./page.module.css";

const FIELD_LABELS = { totalValue: "Valor total", startsAt: "Início da vigência", endsAt: "Fim da vigência", propertyId: "Imóvel" };

export default function AmendmentsCard({ contract, amendments, versions, parties, personOf, createOpen, onCreateOpenChange, onChanged, onNotice, onViewFile }) {
  const [signaturesById, setSignaturesById] = useState({});
  const [signTarget, setSignTarget] = useState(null); // { amendment, party }
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all(amendments.map((a) => getContractAmendment(a.id).then((d) => [a.id, (d && d.signatures) || []]).catch((err) => { reportLookupProblem("as assinaturas do aditivo", err); return [a.id, []]; })))
      .then((entries) => { if (alive) setSignaturesById(Object.fromEntries(entries)); });
    return () => { alive = false; };
  }, [amendments]);

  const versionNumber = (id) => versions.find((v) => v.id === id)?.versionNumber;
  const nameOf = (personId) => personOf(personId)?.legalName || "Signatário";

  async function handleSign() {
    if (!file || !signTarget) return;
    setError("");
    setBusy(true);
    try {
      const uploaded = await uploadFile(file);
      const updated = await signContractAmendment(signTarget.amendment.id, { personId: signTarget.party.personId, evidenceFileId: uploaded.id });
      setSignTarget(null);
      onNotice({ tone: "success", text: updated && updated.status === "SIGNED" ? `${signTarget.amendment.amendmentNumber}º aditivo assinado por todos os signatários.` : `Assinatura de ${nameOf(signTarget.party.personId)} registrada no aditivo.` });
      await onChanged();
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível registrar a assinatura do aditivo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Aditivos de contrato"
      subtitle="Numeração por contrato; cada aditivo é um fato novo, com versão base, vigência e assinatura de cada signatário"
      actions={<Button size="sm" variant="secondary" onClick={() => onCreateOpenChange(true)} data-testid="amendment-new"><Icon name="document" size={16} /> Novo aditivo</Button>}
    >
      {amendments.length === 0 ? (
        <EmptyState icon="document" title="Sem aditivos" description="Nenhum aditivo registrado para este contrato." />
      ) : (
        [...amendments].reverse().map((amendment) => {
          const sigs = signaturesById[amendment.id] || [];
          const signed = new Set(sigs.map((s) => s.personId));
          return (
            <div key={amendment.id} className={styles.versionRow} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
                <div className={styles.versionInfo}>
                  <span className={styles.versionTitle}>{amendment.amendmentNumber}º aditivo — {amendment.reason}</span>
                  <span className={styles.versionTemplate}>
                    {(amendment.changesJson || []).map((c) => FIELD_LABELS[c.field] || c.field).join(", ")}
                    {(amendment.changedClauses || []).length ? ` · ${amendment.changedClauses.length} cláusula(s) alterada(s)` : ""}
                  </span>
                  <span className={styles.versionTemplate}>
                    Vigência: {amendment.effectiveFrom ? formatDate(amendment.effectiveFrom) : "não informada"}
                    {amendment.effectiveUntil ? ` até ${formatDate(amendment.effectiveUntil)}` : ""}
                    {amendment.baseContractVersionId && versionNumber(amendment.baseContractVersionId) ? ` · sobre a versão ${versionNumber(amendment.baseContractVersionId)}` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {amendment.documentFileId ? (
                    <Button size="sm" variant="ghost" onClick={() => onViewFile({ id: amendment.documentFileId })}><Icon name="eye" size={14} /> Documento</Button>
                  ) : null}
                  <Badge tone={AMENDMENT_STATUS_TONE[amendment.status] || "neutral"}>{AMENDMENT_STATUS_LABELS[amendment.status] || "Rascunho"}</Badge>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {parties.map((party) => {
                  const sig = sigs.find((s) => s.personId === party.personId);
                  return (
                    <div key={party.id} className={styles.partyRow}>
                      <div className={styles.partyInfo}>
                        <span className={styles.partyName}>{nameOf(party.personId)}</span>
                        <span className={styles.partyRole}>
                          {PARTY_ROLE_LABELS[party.partyRole] || "Parte"} · {sig ? `assinou em ${formatDateTime(sig.signedAt)}` : "assinatura pendente"}
                        </span>
                      </div>
                      {!signed.has(party.personId) && amendment.status !== "SIGNED" ? (
                        <Button size="sm" variant="secondary" onClick={() => { setError(""); setFile(null); setSignTarget({ amendment, party }); }} data-testid={`amendment-sign-${party.personId}`}>
                          <Icon name="signature" size={14} /> Registrar assinatura
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <AmendmentModal
        open={createOpen}
        onClose={() => onCreateOpenChange(false)}
        contract={contract}
        versions={versions}
        onCreated={async (created) => {
          onCreateOpenChange(false);
          onNotice({ tone: "success", text: `${created.amendmentNumber}º aditivo criado em rascunho — registre a assinatura de cada signatário.` });
          await onChanged();
        }}
      />

      <Modal
        open={Boolean(signTarget)}
        onClose={() => setSignTarget(null)}
        title="Registrar assinatura do aditivo"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSignTarget(null)} disabled={busy}>Voltar</Button>
            <Button onClick={handleSign} loading={busy} disabled={!file || busy} data-testid="amendment-sign-confirm">Registrar assinatura</Button>
          </>
        }
      >
        {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
        <p className={styles.partyRole}>
          Signatário: <strong>{signTarget ? nameOf(signTarget.party.personId) : ""}</strong> — {signTarget ? `${signTarget.amendment.amendmentNumber}º aditivo` : ""}. Você fica registrado como quem coletou.
        </p>
        <div className={styles.formGrid}>
          <FormField label="Via assinada" htmlFor="f-am-sign-file" required helper="Arquivo da via do aditivo assinada por esta pessoa.">
            <input id="f-am-sign-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </FormField>
        </div>
      </Modal>
    </Card>
  );
}
