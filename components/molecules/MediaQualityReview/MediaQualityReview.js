"use client";

import { useState } from "react";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import { reviewPropertyMediaQuality } from "@/lib/api/properties";
import { MEDIA_QUALITY_LABELS, MEDIA_QUALITY_TONE } from "@/lib/mediaQuality";
import styles from "./MediaQualityReview.module.css";

/**
 * Revisão de qualidade da foto/vídeo do imóvel (livro do Marco 3 §6/§7): só mídia APROVADA conta para publicar e aparece
 * no carrinho/site. Recusar exige o motivo (pessoa na foto, placa, documento exposto, baixa qualidade). A foto original
 * não muda: só o status de qualidade.
 */
export default function MediaQualityReview({ propertyId, media, onReviewed }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!media || !media.id) return null;
  const status = media.qualityStatus || "PENDING";

  async function review(qualityStatus) {
    setBusy(true);
    setError("");
    try {
      const updated = await reviewPropertyMediaQuality(propertyId, media.id, { qualityStatus, reason: qualityStatus === "REJECTED" ? reason : undefined });
      setRejecting(false);
      setReason("");
      onReviewed?.(media.id, updated?.qualityStatus || qualityStatus);
    } catch (e) {
      setError(e?.message || "Não foi possível revisar a mídia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <Badge tone={MEDIA_QUALITY_TONE[status] || "neutral"}>{MEDIA_QUALITY_LABELS[status] || status}</Badge>
        {status !== "APPROVED" ? (
          <Button size="sm" variant="secondary" loading={busy} onClick={() => review("APPROVED")}>Aprovar</Button>
        ) : null}
        {status !== "REJECTED" ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting((v) => !v)}>Recusar</Button>
        ) : null}
      </div>
      {rejecting ? (
        <div className={styles.row}>
          <Input
            id={`media-reject-${media.id}`}
            placeholder="Motivo da recusa (ex.: pessoa na foto)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button size="sm" variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={() => review("REJECTED")}>Confirmar recusa</Button>
        </div>
      ) : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
