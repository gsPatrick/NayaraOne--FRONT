"use client";

import { useState } from "react";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import FormField from "@/components/molecules/FormField/FormField";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import Alert from "@/components/molecules/Alert/Alert";
import { uploadPropertyMedia, removePropertyMedia } from "@/lib/api/properties";
import { MEDIA_QUALITY_LABELS, MEDIA_QUALITY_TONE } from "@/lib/mediaQuality";
import styles from "./PropertyFilesPanel.module.css";

const MEDIA_TYPE_OPTIONS = { IMAGE: "Foto", VIDEO: "Vídeo", FLOORPLAN: "Planta", TOUR_360: "Tour 360" };
const ACCEPT = { IMAGE: "image/*", VIDEO: "video/*", FLOORPLAN: "image/*,application/pdf", TOUR_360: "image/*,video/*" };

// Mídia do imóvel com o ARQUIVO (Marco 3 §6/§7, verificação de 11/11/2026): envia foto, vídeo, planta ou tour (o arquivo passa
// pelo antivírus), mostra a qualidade (toda mídia nasce PENDENTE — só a revisão aprova) e remove. Remover o vídeo ou fotos de um
// imóvel publicado que deixa de cumprir o gate tira o imóvel do ar: a tela avisa.
export default function PropertyMediaManager({ propertyId, media = [], onAdded, onRemoved }) {
  const [mediaType, setMediaType] = useState("IMAGE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleFiles(files) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      for (const file of files) {
        const created = await uploadPropertyMedia(propertyId, file, { mediaType });
        onAdded?.(created);
      }
    } catch (e) {
      setError(e?.message || "Não foi possível enviar a mídia.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(item) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await removePropertyMedia(propertyId, item.id);
      onRemoved?.(item.id, result);
      if (result?.unpublished) setNotice("A mídia foi removida e o imóvel saiu do ar: sem ela, ele não cumpre mais as regras de publicação.");
    } catch (e) {
      setError(e?.message || "Não foi possível remover a mídia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="warning">{notice}</Alert> : null}
      {media.length > 0 ? (
        <ul className={styles.list}>
          {media.map((m) => (
            <li className={styles.item} key={m.id}>
              <div className={styles.info}>
                <span className={styles.name}>{m.label || "Mídia sem nome"}</span>
                <span className={styles.meta}>
                  {MEDIA_TYPE_OPTIONS[m.mediaType] || m.mediaType || "Foto"} ·{" "}
                  <Badge tone={MEDIA_QUALITY_TONE[m.qualityStatus] || "neutral"}>{MEDIA_QUALITY_LABELS[m.qualityStatus] || m.qualityStatus}</Badge>
                  {m.fileId ? null : <> · <Badge tone="warning">Sem arquivo (não conta para publicar)</Badge></>}
                </span>
              </div>
              <div className={styles.actions}>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => handleRemove(m)}>Remover</Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={styles.form}>
        <FormField label="Tipo da mídia" htmlFor="media-new-type">
          <Select id="media-new-type" value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
            {Object.entries(MEDIA_TYPE_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </FormField>
        <div className={styles.span2}>
          <FileDropInput
            id="media-new-file"
            ariaLabel="Arquivo da mídia"
            accept={ACCEPT[mediaType]}
            multiple
            uploading={busy}
            helper="Cada arquivo passa pelo antivírus e entra como pendente de revisão de qualidade."
            onFiles={handleFiles}
          />
        </div>
      </div>
    </div>
  );
}
