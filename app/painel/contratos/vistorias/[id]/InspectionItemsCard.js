"use client";

import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FormField from "@/components/molecules/FormField/FormField";
import { attachInspectionItemMedia, listInspectionItemMedia, uploadFile } from "@/lib/api/legal";
import { CONDITION_LABELS, CONDITION_TONE } from "@/lib/labels/juridico";
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_TONE, RESPONSIBLE_PARTY_LABELS } from "@/lib/mock/legal";
import { splitItemName } from "@/lib/legal/inspectionCodes";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatDateTime, formatBRL } from "@/lib/format";
import styles from "./page.module.css";

// Rótulo da mídia sem identificador interno: "Foto 1", "Vídeo 2".
export function mediaLabel(media, index) {
  const kind = media.purpose === "VIDEO" || media.mediaType === "VIDEO" ? "VIDEO" : "PHOTO";
  return `${MEDIA_TYPE_LABELS[kind]} ${index + 1}`;
}

// Itens estruturados por ambiente (Caderno §11) com as fotos/vídeos de cada item. A mídia vira
// legal.inspection_media com o SHA-256 do arquivo; depois da primeira assinatura nada muda (a API recusa).
export default function InspectionItemsCard({ items, mediaByItem, onMediaChange, canAttach, onView }) {
  const [formItemId, setFormItemId] = useState(null);
  const [form, setForm] = useState({ file: null, mediaType: "PHOTO" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Integridade devolvida pelo anexo (sha256 + data/hora do registro), por arquivo.
  const [integrity, setIntegrity] = useState({});

  function openForm(itemId) {
    setError("");
    setForm({ file: null, mediaType: "PHOTO" });
    setFormItemId(itemId);
  }

  async function handleAttach(itemId) {
    if (!form.file) {
      setError("Selecione um arquivo de foto ou vídeo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const uploaded = await uploadFile(form.file);
      const link = await attachInspectionItemMedia(itemId, { fileId: uploaded.id, mediaType: form.mediaType });
      if (link?.sha256) setIntegrity((prev) => ({ ...prev, [uploaded.id]: { sha256: link.sha256, capturedAt: link.capturedAt } }));
      const media = await listInspectionItemMedia(itemId);
      onMediaChange(itemId, Array.isArray(media) ? media : []);
      setFormItemId(null);
    } catch (err) {
      setError(legalErrorMessage(err, "Erro ao anexar mídia."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Itens vistoriados" subtitle={`${items.length} item(ns) registrado(s), por ambiente`}>
      {items.length === 0 ? (
        <EmptyState icon="document" title="Sem itens" description="Nenhum item registrado nesta vistoria." />
      ) : (
        items.map((item) => {
          const media = mediaByItem[item.id] || [];
          const names = splitItemName(item.itemName);
          return (
            <div key={item.id} className={styles.itemBlock} data-testid="inspection-item">
              <div className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{names.room ? `${names.room} — ${names.item}` : names.item}</span>
                  {item.description ? <span className={styles.itemNotes}>{item.description}</span> : null}
                  {item.notes ? <span className={styles.itemNotes}>Observação: {item.notes}</span> : null}
                  {item.condition === "DAMAGED" && item.damageDescription ? (
                    <span className={styles.itemNotes}>
                      Dano: {item.damageDescription}
                      {item.responsibleParty ? ` — Responsável: ${RESPONSIBLE_PARTY_LABELS[item.responsibleParty] || "a apurar"}` : ""}
                      {item.estimatedBudget !== null && item.estimatedBudget !== undefined ? ` — Orçamento: ${formatBRL(item.estimatedBudget)}` : ""}
                    </span>
                  ) : null}
                </div>
                {item.condition ? <Badge tone={CONDITION_TONE[item.condition]}>{CONDITION_LABELS[item.condition] || "Estado não informado"}</Badge> : <Badge tone="neutral">Estado não informado</Badge>}
              </div>

              <div className={styles.mediaSection}>
                {media.length > 0 ? (
                  <div className={styles.mediaList}>
                    {media.map((m, idx) => {
                      const proof = integrity[m.fileId] || (m.sha256 ? { sha256: m.sha256, capturedAt: m.capturedAt } : null);
                      const when = (proof && proof.capturedAt) || m.createdAt || m.created_at;
                      return (
                        <span key={m.id} className={styles.mediaItem}>
                          <Badge tone={MEDIA_TYPE_TONE[m.purpose] || "neutral"}>
                            <Icon name={m.purpose === "VIDEO" ? "video" : "image"} size={14} />
                            {mediaLabel(m, idx)}
                          </Badge>
                          {when ? <span className={styles.itemNotes}>{formatDateTime(when)}</span> : null}
                          {proof ? <span className={styles.itemNotes} title={`SHA-256: ${proof.sha256}`}>integridade registrada</span> : null}
                          <button type="button" className={styles.mediaViewBtn} onClick={() => onView({ id: m.fileId })}>
                            <Icon name="eye" size={14} /> Visualizar
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className={styles.itemNotes}>Nenhuma foto/vídeo anexado a este item.</span>
                )}

                {canAttach && formItemId === item.id ? (
                  <div className={styles.mediaForm}>
                    <FormField label="Arquivo" htmlFor={`f-media-file-${item.id}`} helper="Foto ou vídeo do item (máx. 8MB).">
                      <input
                        id={`f-media-file-${item.id}`}
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                      />
                    </FormField>
                    <select
                      className={styles.mediaTypeSelect}
                      aria-label="Tipo da mídia"
                      value={form.mediaType}
                      onChange={(e) => setForm((prev) => ({ ...prev, mediaType: e.target.value }))}
                    >
                      {Object.entries(MEDIA_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={() => handleAttach(item.id)} loading={busy} disabled={busy}>Anexar</Button>
                    <Button variant="secondary" size="sm" onClick={() => !busy && setFormItemId(null)} disabled={busy}>Cancelar</Button>
                  </div>
                ) : canAttach ? (
                  <Button variant="secondary" size="sm" onClick={() => openForm(item.id)}>
                    <Icon name="upload" size={14} /> Anexar foto/vídeo
                  </Button>
                ) : null}
                {formItemId === item.id && error ? <Alert tone="danger">{error}</Alert> : null}
              </div>
            </div>
          );
        })
      )}
    </Card>
  );
}
