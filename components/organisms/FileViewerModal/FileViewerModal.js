"use client";

// Visualizador universal de arquivos — recebe um fileId (ou objeto { id, fileName, mimeType }
// já conhecido) e busca o metadado + bytes via API autenticada (GET /files/:id e
// GET /files/:id/content), decidindo a renderização pelo mimeType. Os bytes nunca vão pra um
// serviço externo (sem Google Docs Viewer / Office Online) — tipos não renderizáveis
// nativamente caem num fallback com botão de download.
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import { getFileMeta, fetchFileContent } from "@/lib/api/files";
import styles from "./FileViewerModal.module.css";

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function kindFromMime(mimeType) {
  if (!mimeType) return "unknown";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "unknown";
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

export default function FileViewerModal({ file, fileId, blobLoader, open, onClose }) {
  const resolvedId = fileId || file?.id;

  const [meta, setMeta] = useState(file?.fileName && file?.mimeType ? file : null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  useEffect(() => {
    if (!open || (!resolvedId && !blobLoader)) return;
    let cancelled = false;
    let localUrl = null;

    async function load() {
      setLoading(true);
      setError("");
      setZoom(1);
      setPan({ x: 0, y: 0 });
      try {
        // blobLoader cobre casos sem registro em /files (ex.: relatório de vistoria gerado
        // sob demanda por GET /legal/inspections/:id/report) — a UI já sabe fileName/mimeType.
        if (blobLoader) {
          const blob = await blobLoader();
          if (cancelled) return;
          localUrl = URL.createObjectURL(blob);
          setMeta(file);
          setBlobUrl(localUrl);
        } else if (file?.fileName && file?.mimeType) {
          const { blob } = await fetchFileContent(resolvedId);
          if (cancelled) return;
          localUrl = URL.createObjectURL(blob);
          setMeta(file);
          setBlobUrl(localUrl);
        } else {
          // GET /files/:id/content já manda Content-Type/Content-Disposition/Content-Length —
          // usamos como metadado de reserva se GET /files/:id (dedicado) não estiver disponível
          // no ambiente, pra não deixar o visualizador quebrado por causa só do endpoint de
          // metadado.
          const { blob, meta: fallbackMeta } = await fetchFileContent(resolvedId);
          if (cancelled) return;
          localUrl = URL.createObjectURL(blob);
          setBlobUrl(localUrl);
          try {
            const metaResult = await getFileMeta(resolvedId);
            if (!cancelled) setMeta(metaResult);
          } catch {
            if (!cancelled) setMeta(fallbackMeta);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Não foi possível carregar o arquivo.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resolvedId]);

  useEffect(() => {
    if (!open) {
      setMeta(file?.fileName && file?.mimeType ? file : null);
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    onClose?.();
  }

  function handleDownload() {
    if (!blobUrl || !meta) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = meta.fileName || "arquivo";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function zoomIn() {
    setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  }
  function zoomOut() {
    setZoom((z) => {
      const next = Math.max(ZOOM_MIN, z - ZOOM_STEP);
      if (next === ZOOM_MIN) setPan({ x: 0, y: 0 });
      return next;
    });
  }
  function zoomReset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleWheel(e) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }

  function handlePointerDown(e) {
    if (zoom <= 1) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }
  function handlePointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }
  function handlePointerUp() {
    dragRef.current = null;
  }

  const kind = kindFromMime(meta?.mimeType);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={meta?.fileName || "Visualizar arquivo"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Fechar</Button>
          <Button onClick={handleDownload} disabled={!blobUrl}>
            <Icon name="arrowDownCircle" size={16} /> Baixar
          </Button>
        </>
      }
    >
      <div className={styles.wrap}>
        {meta ? (
          <div className={styles.metaRow}>
            <span className={styles.metaName}>{meta.fileName}</span>
            <span className={styles.metaSize}>{formatBytes(meta.sizeBytes)}</span>
          </div>
        ) : null}

        {loading ? (
          <div className={styles.loading}>
            <span className={styles.spinner} aria-hidden="true" />
            <span>Carregando arquivo…</span>
          </div>
        ) : error ? (
          <Alert tone="danger" title="Não foi possível abrir o arquivo">{error}</Alert>
        ) : kind === "image" ? (
          <>
            <div className={styles.zoomToolbar}>
              <button className={styles.zoomBtn} onClick={zoomOut} disabled={zoom <= ZOOM_MIN} aria-label="Diminuir zoom">
                <Icon name="minus" size={16} />
              </button>
              <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
              <button className={styles.zoomBtn} onClick={zoomIn} disabled={zoom >= ZOOM_MAX} aria-label="Aumentar zoom">
                <Icon name="plus" size={16} />
              </button>
              <button className={styles.zoomBtn} onClick={zoomReset} disabled={zoom === 1} aria-label="Resetar zoom">
                <Icon name="refreshCcw" size={16} />
              </button>
            </div>
            <div
              className={styles.imageViewport}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{ cursor: zoom > 1 ? (dragRef.current ? "grabbing" : "grab") : "default" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blobUrl}
                alt={meta?.fileName || "Imagem"}
                className={styles.image}
                draggable={false}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              />
            </div>
          </>
        ) : kind === "pdf" ? (
          <iframe title={meta?.fileName || "PDF"} src={blobUrl} className={styles.pdfFrame} />
        ) : kind === "audio" ? (
          <div className={styles.mediaCenter}>
            <Icon name="music" size={48} className={styles.mediaIcon} />
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={blobUrl} className={styles.audio} />
          </div>
        ) : kind === "video" ? (
          <div className={styles.mediaCenter}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video controls src={blobUrl} className={styles.video} />
          </div>
        ) : (
          <div className={styles.fallback}>
            <Icon name="fileUnknown" size={48} className={styles.fallbackIcon} />
            <p className={styles.fallbackText}>
              Preview não disponível para este tipo de arquivo{meta?.mimeType ? ` (${meta.mimeType})` : ""}.
            </p>
            <Button onClick={handleDownload} disabled={!blobUrl}>
              <Icon name="arrowDownCircle" size={16} /> Baixar arquivo
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
