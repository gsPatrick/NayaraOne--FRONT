"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import Modal from "@/components/organisms/Modal/Modal";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { getProperty } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import {
  getInspection,
  getContract,
  listInspectionItems,
  listInspections,
  completeInspection,
  compareInspections,
  signInspection,
  listInspectionSignatures,
  attachInspectionItemMedia,
  listInspectionItemMedia,
  uploadFile,
  generateInspectionReport,
  getInspectionReportBlob,
} from "@/lib/api/legal";
import {
  INSPECTION_TYPE_LABELS,
  INSPECTION_TYPE_TONE,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONE,
  CONDITION_LABELS,
  CONDITION_TONE,
  PARTY_ROLE_LABELS,
  MEDIA_TYPE_LABELS,
  MEDIA_TYPE_TONE,
} from "@/lib/mock/legal";

const SIGNATURE_PARTY_ROLES = ["LANDLORD", "TENANT"];
import { formatDate, formatDateTime, formatContractLabel } from "@/lib/format";
import styles from "./page.module.css";

export default function VistoriaDetailPage({ params }) {
  const [inspection, setInspection] = useState(null);
  const [property, setProperty] = useState(null);
  const [contract, setContract] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [counterpart, setCounterpart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [signModalRole, setSignModalRole] = useState(null);
  const [signInput, setSignInput] = useState("");
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [mfaOpen, setMfaOpen] = useState(false);
  const [mediaByItem, setMediaByItem] = useState({});
  const [mediaFormItemId, setMediaFormItemId] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [mediaForm, setMediaForm] = useState({ file: null, mediaType: "PHOTO" });
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([getInspection(params.id), listInspectionItems(params.id), apiFetch("/users"), listInspections()])
      .then(async ([inspectionRes, itemsRes, usersRes, allInspections]) => {
        if (cancelled) return;
        setInspection(inspectionRes);
        setItems(itemsRes || []);
        setUsers(usersRes || []);

        if ((itemsRes || []).length > 0) {
          try {
            const mediaEntries = await Promise.all(
              itemsRes.map((item) => listInspectionItemMedia(item.id).then((media) => [item.id, media || []]).catch(() => [item.id, []]))
            );
            if (!cancelled) setMediaByItem(Object.fromEntries(mediaEntries));
          } catch {
            // Mídia é auxiliar — não bloqueia a exibição da vistoria se falhar.
          }
        }

        if (inspectionRes?.propertyId) {
          try {
            const prop = await getProperty(inspectionRes.propertyId);
            if (!cancelled) setProperty(prop);
          } catch {
            // Imóvel pode não estar disponível.
          }
        }
        if (inspectionRes?.contractId) {
          try {
            const c = await getContract(inspectionRes.contractId);
            if (!cancelled) setContract(c);
          } catch {
            // Contrato pode não estar disponível.
          }
        }

        if (inspectionRes?.status === "COMPLETED") {
          try {
            const sigs = await listInspectionSignatures(inspectionRes.id);
            if (!cancelled) setSignatures(sigs || []);
          } catch {
            // Assinaturas podem não estar disponíveis ainda.
          }
        }

        const counterpartType = inspectionRes.inspectionType === "CHECK_IN" ? "CHECK_OUT" : inspectionRes.inspectionType === "CHECK_OUT" ? "CHECK_IN" : null;
        if (counterpartType) {
          const found = (allInspections || []).find(
            (i) => i.propertyId === inspectionRes.propertyId && i.inspectionType === counterpartType && i.id !== inspectionRes.id
          );
          if (!cancelled) setCounterpart(found || null);
        }
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar vistoria."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  function userName(id) {
    return users.find((u) => u.id === id)?.name || "—";
  }

  if (loading) {
    return (
      <AppShell title="Vistoria" backHref="/painel/contratos/vistorias">
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="Vistoria" backHref="/painel/contratos/vistorias">
        <Alert tone="danger">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!inspection) return notFound();

  const counterpartType = inspection.inspectionType === "CHECK_IN" ? "CHECK_OUT" : inspection.inspectionType === "CHECK_OUT" ? "CHECK_IN" : null;
  const divergenceCount = comparison ? comparison.divergences.length : 0;

  async function handleComplete() {
    setActionError("");
    setBusy(true);
    try {
      const updated = await completeInspection(inspection.id);
      setInspection(updated);
      // Vistoria acabou de ser concluída — ainda não deve haver nenhuma assinatura registrada.
      try {
        const sigs = await listInspectionSignatures(updated.id);
        setSignatures(sigs || []);
      } catch {
        setSignatures([]);
      }
    } catch (err) {
      setActionError(err.message || "Erro ao concluir vistoria.");
    } finally {
      setBusy(false);
    }
  }

  function openSignModal(partyRole) {
    setSignError("");
    setSignInput("");
    setSignModalRole(partyRole);
  }

  function closeSignModal() {
    if (signing) return;
    setSignModalRole(null);
    setSignInput("");
    setSignError("");
  }

  async function handleConfirmSign() {
    if (!signInput.trim()) {
      setSignError("Digite o nome completo para confirmar a assinatura.");
      return;
    }
    setSigning(true);
    setSignError("");
    try {
      await signInspection(inspection.id, {
        partyRole: signModalRole,
        signaturePayload: signInput.trim(),
      });
      const sigs = await listInspectionSignatures(inspection.id);
      setSignatures(sigs || []);
      setSignModalRole(null);
      setSignInput("");
    } catch (err) {
      // Assinar vistoria é step-up MFA obrigatório no backend (requireRecentMfa em
      // /legal/inspections/:id/sign) — mesmo padrão já usado em Liquidar lançamento e
      // Decidir aprovação: pedimos o código MFA e, uma vez verificado, repetimos a
      // chamada de assinatura automaticamente.
      if (err?.code === "MFA_STEP_UP_REQUIRED") {
        setMfaOpen(true);
      } else {
        setSignError(err.message || "Erro ao registrar assinatura.");
      }
    } finally {
      setSigning(false);
    }
  }

  function signatureFor(partyRole) {
    return signatures.find((s) => s.partyRole === partyRole) || null;
  }

  function openMediaForm(itemId) {
    setMediaError("");
    setMediaForm({ file: null, mediaType: "PHOTO" });
    setMediaFormItemId(itemId);
  }

  function closeMediaForm() {
    if (mediaBusy) return;
    setMediaFormItemId(null);
    setMediaError("");
  }

  async function handleAttachMedia(itemId) {
    if (!mediaForm.file) {
      setMediaError("Selecione um arquivo de foto ou vídeo.");
      return;
    }
    setMediaBusy(true);
    setMediaError("");
    try {
      const uploaded = await uploadFile(mediaForm.file);
      await attachInspectionItemMedia(itemId, { fileId: uploaded.id, mediaType: mediaForm.mediaType });
      const media = await listInspectionItemMedia(itemId);
      setMediaByItem((prev) => ({ ...prev, [itemId]: media || [] }));
      setMediaFormItemId(null);
      setMediaForm({ file: null, mediaType: "PHOTO" });
    } catch (err) {
      setMediaError(err.message || "Erro ao anexar mídia.");
    } finally {
      setMediaBusy(false);
    }
  }

  async function handleGenerateReport() {
    setReportError("");
    setReportBusy(true);
    try {
      const result = await generateInspectionReport(inspection.id);
      setInspection((prev) => ({ ...prev, reportHash: result.reportHash, reportGeneratedAt: result.reportGeneratedAt }));
    } catch (err) {
      setReportError(err.message || "Erro ao gerar relatório.");
    } finally {
      setReportBusy(false);
    }
  }

  async function handleDownloadReport() {
    setReportError("");
    setReportBusy(true);
    try {
      const blob = await getInspectionReportBlob(inspection.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vistoria-${inspection.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setReportError(err.message || "Erro ao baixar relatório.");
    } finally {
      setReportBusy(false);
    }
  }

  async function handleToggleCompare() {
    if (compareOpen) {
      setCompareOpen(false);
      return;
    }
    setActionError("");
    setBusy(true);
    try {
      const entryId = inspection.inspectionType === "CHECK_IN" ? inspection.id : counterpart.id;
      const exitId = inspection.inspectionType === "CHECK_OUT" ? inspection.id : counterpart.id;
      const result = await compareInspections(entryId, exitId);
      setComparison(result);
      setCompareOpen(true);
    } catch (err) {
      setActionError(err.message || "Erro ao comparar vistorias.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={property?.name || "Vistoria"} backHref="/painel/contratos/vistorias">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={INSPECTION_TYPE_TONE[inspection.inspectionType]}>{INSPECTION_TYPE_LABELS[inspection.inspectionType]}</Badge>
            <Badge tone={INSPECTION_STATUS_TONE[inspection.status]}>{INSPECTION_STATUS_LABELS[inspection.status]}</Badge>
          </div>
          <div className={styles.actions}>
            {inspection.status === "SCHEDULED" ? (
              <Button onClick={handleComplete} disabled={busy}><Icon name="check" size={16} /> Concluir vistoria</Button>
            ) : null}
            {counterpart ? (
              <Button variant="secondary" onClick={handleToggleCompare} disabled={busy}>
                <Icon name="swapHorizontal" size={16} />
                {compareOpen ? "Ocultar comparação" : `Comparar com vistoria de ${INSPECTION_TYPE_LABELS[counterpartType].toLowerCase()}`}
              </Button>
            ) : null}
            {inspection.status === "COMPLETED" && !inspection.reportHash ? (
              <Button variant="secondary" onClick={handleGenerateReport} loading={reportBusy} disabled={reportBusy}>
                <Icon name="document" size={16} /> Gerar relatório
              </Button>
            ) : null}
            {inspection.status === "COMPLETED" && inspection.reportHash ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setViewerFile({
                    fileName: `vistoria-${inspection.id}.pdf`,
                    mimeType: "application/pdf",
                    blobLoader: () => getInspectionReportBlob(inspection.id),
                  })}
                >
                  <Icon name="eye" size={16} /> Visualizar relatório
                </Button>
                <Button variant="secondary" onClick={handleDownloadReport} loading={reportBusy} disabled={reportBusy}>
                  <Icon name="arrowDownCircle" size={16} /> Baixar relatório
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {actionError ? <Alert tone="danger" className={styles.notice}>{actionError}</Alert> : null}
        {reportError ? <Alert tone="danger" className={styles.notice}>{reportError}</Alert> : null}

        <Card title="Detalhes da vistoria">
          <dl className={styles.detailList}>
            <div className={styles.detailRow}><dt>Imóvel</dt><dd>{property?.name || "—"}</dd></div>
            <div className={styles.detailRow}><dt>Contrato vinculado</dt><dd>{contract ? formatContractLabel(contract) : "—"}</dd></div>
            <div className={styles.detailRow}><dt>Inspetor</dt><dd>{inspection.inspectorUserId ? userName(inspection.inspectorUserId) : "—"}</dd></div>
            <div className={styles.detailRow}><dt>Agendada para</dt><dd>{formatDate(inspection.scheduledAt)}</dd></div>
            <div className={styles.detailRow}><dt>Concluída em</dt><dd>{inspection.completedAt ? formatDateTime(inspection.completedAt) : "—"}</dd></div>
          </dl>
        </Card>

        <Card title="Itens vistoriados" subtitle={`${items.length} item(ns) registrado(s)`}>
          {items.length === 0 ? (
            <EmptyState icon="document" title="Sem itens" description="Nenhum item registrado — vistoria ainda não concluída." />
          ) : (
            items.map((item) => {
              const media = mediaByItem[item.id] || [];
              return (
                <div key={item.id} className={styles.itemBlock}>
                  <div className={styles.itemRow}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{item.itemName}</span>
                      {item.notes ? <span className={styles.itemNotes}>{item.notes}</span> : null}
                      {item.condition === "DAMAGED" && item.damageDescription ? (
                        <span className={styles.itemNotes}>Dano: {item.damageDescription}</span>
                      ) : null}
                    </div>
                    <Badge tone={CONDITION_TONE[item.condition]}>{CONDITION_LABELS[item.condition]}</Badge>
                  </div>

                  <div className={styles.mediaSection}>
                    {media.length > 0 ? (
                      <div className={styles.mediaList}>
                        {media.map((m) => (
                          <span key={m.id} className={styles.mediaItem}>
                            <Badge tone={MEDIA_TYPE_TONE[m.purpose] || "neutral"}>
                              <Icon name={m.purpose === "VIDEO" ? "video" : "image"} size={14} />
                              {MEDIA_TYPE_LABELS[m.purpose] || m.purpose} — {String(m.fileId).slice(0, 8)}
                            </Badge>
                            <button
                              type="button"
                              className={styles.mediaViewBtn}
                              onClick={() => setViewerFile({ id: m.fileId })}
                            >
                              <Icon name="eye" size={14} /> Visualizar
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.itemNotes}>Nenhuma foto/vídeo anexado a este item.</span>
                    )}

                    {mediaFormItemId === item.id ? (
                      <div className={styles.mediaForm}>
                        <FormField label="Arquivo" htmlFor={`f-media-file-${item.id}`} helper="Foto ou vídeo do item (máx. 8MB).">
                          <input
                            id={`f-media-file-${item.id}`}
                            type="file"
                            accept="image/*,video/*"
                            onChange={(e) => setMediaForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                            autoFocus
                          />
                        </FormField>
                        <select
                          className={styles.mediaTypeSelect}
                          value={mediaForm.mediaType}
                          onChange={(e) => setMediaForm((prev) => ({ ...prev, mediaType: e.target.value }))}
                        >
                          {Object.entries(MEDIA_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <Button size="sm" onClick={() => handleAttachMedia(item.id)} loading={mediaBusy} disabled={mediaBusy}>
                          Anexar
                        </Button>
                        <Button variant="secondary" size="sm" onClick={closeMediaForm} disabled={mediaBusy}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => openMediaForm(item.id)}>
                        <Icon name="upload" size={14} /> Anexar foto/vídeo
                      </Button>
                    )}
                    {mediaFormItemId === item.id && mediaError ? <Alert tone="danger">{mediaError}</Alert> : null}
                  </div>
                </div>
              );
            })
          )}
        </Card>

        {inspection.status === "COMPLETED" ? (
          <Card
            title="Assinaturas"
            subtitle={
              signatures.length >= SIGNATURE_PARTY_ROLES.length
                ? "Vistoria assinada por locador e locatário."
                : "Colete a assinatura do locador e do locatário para liberar a entrega de chaves."
            }
          >
            <div>
              {SIGNATURE_PARTY_ROLES.map((role) => {
                const sig = signatureFor(role);
                return (
                  <div key={role} className={styles.itemRow}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{PARTY_ROLE_LABELS[role] || role}</span>
                      {sig ? (
                        <span className={styles.itemNotes}>
                          Assinado{sig.signedAt ? ` em ${formatDateTime(sig.signedAt)}` : ""}
                        </span>
                      ) : (
                        <span className={styles.itemNotes}>Assinatura pendente</span>
                      )}
                    </div>
                    {sig ? (
                      <Badge tone="success"><Icon name="check" size={14} /> Assinado</Badge>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => openSignModal(role)}>
                        <Icon name="pencil" size={16} /> Assinar como {PARTY_ROLE_LABELS[role] || role}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            {signatures.length >= SIGNATURE_PARTY_ROLES.length ? (
              <p className={styles.divergenceNote}>
                <Icon name="check" size={14} /> Ambas as partes assinaram esta vistoria — a entrega de chaves pode ser liberada.
              </p>
            ) : null}
          </Card>
        ) : null}

        {compareOpen && counterpart && comparison ? (
          <Card
            title="Comparação de vistorias"
            subtitle={`${divergenceCount} divergência(s) encontrada(s) entre as vistorias de ${INSPECTION_TYPE_LABELS[inspection.inspectionType].toLowerCase()} e ${INSPECTION_TYPE_LABELS[counterpart.inspectionType].toLowerCase()}`}
          >
            <div className={styles.compareGrid}>
              <div className={styles.compareCol}>
                <span className={styles.compareColHead}>{INSPECTION_TYPE_LABELS[inspection.inspectionType]} — {formatDate(inspection.scheduledAt)}</span>
                {comparison.divergences.map((c) => (
                  <div key={`div-a-${c.itemName}`} className={[styles.compareRow, styles.compareRowChanged].join(" ")}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.entryCondition] || c.entryCondition}</span>
                  </div>
                ))}
                {comparison.onlyInEntry.map((c) => (
                  <div key={`only-a-${c.itemName}`} className={styles.compareRow}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.entryCondition] || c.entryCondition}</span>
                  </div>
                ))}
              </div>
              <div className={styles.compareCol}>
                <span className={styles.compareColHead}>{INSPECTION_TYPE_LABELS[counterpart.inspectionType]} — {formatDate(counterpart.scheduledAt)}</span>
                {comparison.divergences.map((c) => (
                  <div key={`div-b-${c.itemName}`} className={[styles.compareRow, styles.compareRowChanged].join(" ")}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.exitCondition] || c.exitCondition}</span>
                  </div>
                ))}
                {comparison.onlyInExit.map((c) => (
                  <div key={`only-b-${c.itemName}`} className={styles.compareRow}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.exitCondition] || c.exitCondition}</span>
                  </div>
                ))}
              </div>
            </div>
            {divergenceCount > 0 ? (
              <p className={styles.divergenceNote}>
                <Icon name="filter" size={14} /> Itens destacados mudaram de condição entre as duas vistorias.
              </p>
            ) : (
              <EmptyState icon="check" title="Sem divergências" description="Nenhuma divergência encontrada entre as duas vistorias." />
            )}
          </Card>
        ) : null}
      </div>

      <Modal
        open={!!signModalRole}
        onClose={closeSignModal}
        title={`Assinar como ${signModalRole ? PARTY_ROLE_LABELS[signModalRole] || signModalRole : ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={closeSignModal} disabled={signing}>Cancelar</Button>
            <Button onClick={handleConfirmSign} loading={signing}>Confirmar assinatura</Button>
          </>
        }
      >
        <p className={styles.itemNotes}>
          Ao confirmar, esta pessoa declara estar de acordo com o laudo de vistoria registrado acima.
        </p>
        <FormField
          label="Nome completo"
          htmlFor="f-signature"
          required
          error={signError || undefined}
          helper="Digite o nome completo para confirmar a assinatura."
        >
          <Input
            id="f-signature"
            value={signInput}
            error={!!signError}
            onChange={(e) => setSignInput(e.target.value)}
            placeholder="Ex: João da Silva"
            autoFocus
          />
        </FormField>
      </Modal>

      <MfaVerifyModal
        open={mfaOpen}
        onClose={() => setMfaOpen(false)}
        actionLabel="assinar esta vistoria"
        onVerified={async () => {
          setMfaOpen(false);
          await handleConfirmSign();
        }}
      />

      <FileViewerModal
        open={!!viewerFile}
        onClose={() => setViewerFile(null)}
        file={viewerFile}
        fileId={viewerFile?.id}
        blobLoader={viewerFile?.blobLoader}
      />
    </AppShell>
  );
}
