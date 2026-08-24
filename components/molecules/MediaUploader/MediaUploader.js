"use client";

import { useRef, useState } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./MediaUploader.module.css";

const GRADIENTS = [
  "linear-gradient(135deg, #17130F 0%, #3A2E14 100%)",
  "linear-gradient(135deg, #0F0C0A 0%, #8A6620 100%)",
  "linear-gradient(135deg, #3A2E14 0%, #BE9130 100%)",
  "linear-gradient(135deg, #17130F 0%, #A97D28 100%)",
];

function hashCode(str = "") {
  let hash = 0;
  for (let i = 0; i < String(str).length; i++) {
    hash = (hash << 5) - hash + String(str).charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

let localIdSeq = 0;
function nextLocalId() {
  localIdSeq += 1;
  return `upload-${Date.now()}-${localIdSeq}`;
}

// items: [{ id, type: 'image'|'video', label, previewUrl? }]
// Itens sem previewUrl (mídia mockada pré-existente do imóvel) exibem um placeholder em
// gradiente, no mesmo padrão visual usado em PropertyCard — sem upload real a servidor.
export default function MediaUploader({ items = [], onChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  const photoCount = items.filter((item) => item.type === "image").length;
  const videoCount = items.filter((item) => item.type === "video").length;

  const safeBannerIndex = items.length > 0 ? Math.min(bannerIndex, items.length - 1) : 0;
  const bannerItem = items[safeBannerIndex];

  function prevBanner() {
    setBannerIndex((i) => (i - 1 + items.length) % items.length);
  }

  function nextBanner() {
    setBannerIndex((i) => (i + 1) % items.length);
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const added = files.map((file) => {
      const isVideo = file.type.startsWith("video/");
      return {
        id: nextLocalId(),
        type: isVideo ? "video" : "image",
        label: file.name,
        previewUrl: URL.createObjectURL(file),
      };
    });
    onChange?.([...items, ...added]);
    setBannerIndex(items.length);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    addFiles(event.dataTransfer.files);
  }

  function handleRemove(id) {
    const target = items.find((item) => item.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    onChange?.(items.filter((item) => item.id !== id));
    setBannerIndex((i) => Math.max(0, Math.min(i, items.length - 2)));
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.bannerLabel}>
        <Icon name="image" size={14} /> Pré-visualização — é assim que a mídia aparece para quem visitar o imóvel
      </p>

      <div
        className={[styles.banner, dragOver ? styles.bannerDragOver : ""].filter(Boolean).join(" ")}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {bannerItem ? (
          <>
            {bannerItem.type === "video" ? (
              bannerItem.previewUrl ? (
                <video
                  key={bannerItem.id}
                  src={bannerItem.previewUrl}
                  className={styles.bannerMedia}
                  controls
                  playsInline
                />
              ) : (
                <div
                  className={styles.bannerPlaceholder}
                  style={{ background: GRADIENTS[Math.abs(hashCode(bannerItem.id)) % GRADIENTS.length] }}
                >
                  <Icon name="video" size={32} />
                </div>
              )
            ) : bannerItem.previewUrl ? (
              <img src={bannerItem.previewUrl} alt={bannerItem.label} className={styles.bannerMedia} />
            ) : (
              <div
                className={styles.bannerPlaceholder}
                style={{ background: GRADIENTS[Math.abs(hashCode(bannerItem.id)) % GRADIENTS.length] }}
              >
                <Icon name="image" size={32} />
              </div>
            )}

            {bannerItem.type === "video" ? (
              <span className={styles.bannerVideoBadge}>
                <Icon name="video" size={12} /> Vídeo
              </span>
            ) : null}

            {items.length > 1 ? (
              <>
                <button type="button" className={[styles.bannerNav, styles.bannerNavPrev].join(" ")} onClick={prevBanner} aria-label="Mídia anterior">
                  <Icon name="chevronRight" size={18} className={styles.bannerNavIconPrev} />
                </button>
                <button type="button" className={[styles.bannerNav, styles.bannerNavNext].join(" ")} onClick={nextBanner} aria-label="Próxima mídia">
                  <Icon name="chevronRight" size={18} />
                </button>
                <div className={styles.bannerDots} aria-hidden="true">
                  {items.map((_, i) => (
                    <span key={i} className={[styles.bannerDot, i === safeBannerIndex ? styles.bannerDotActive : ""].filter(Boolean).join(" ")} />
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div
            className={styles.bannerEmpty}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            <Icon name="upload" size={28} />
            <span>Arraste fotos e vídeos aqui, ou clique para selecionar</span>
          </div>
        )}
      </div>

      <div className={styles.thumbRow}>
        {items.map((item, index) => {
          const gradient = GRADIENTS[Math.abs(hashCode(item.id)) % GRADIENTS.length];
          return (
            <div
              className={[styles.thumb, index === safeBannerIndex ? styles.thumbActive : ""].filter(Boolean).join(" ")}
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => setBannerIndex(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setBannerIndex(index);
                }
              }}
              aria-label={`Mostrar ${item.label} na pré-visualização`}
            >
              {item.previewUrl && item.type === "image" ? (
                <img src={item.previewUrl} alt={item.label} className={styles.thumbImage} />
              ) : (
                <div className={styles.thumbPlaceholder} style={{ background: gradient }}>
                  <Icon name={item.type === "video" ? "video" : "image"} size={14} />
                </div>
              )}
              {item.type === "video" ? (
                <span className={styles.thumbVideoBadge}>
                  <Icon name="video" size={9} />
                </span>
              ) : null}
              <button
                type="button"
                className={styles.thumbRemove}
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemove(item.id);
                }}
                aria-label={`Remover ${item.label}`}
              >
                <Icon name="close" size={10} />
              </button>
            </div>
          );
        })}

        <button type="button" className={styles.thumbAdd} onClick={() => inputRef.current?.click()} aria-label="Adicionar mídia">
          <Icon name="plus" size={18} />
          <span>Adicionar</span>
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className={styles.hiddenInput}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <p className={styles.counter}>
        {photoCount} foto{photoCount === 1 ? "" : "s"}, {videoCount} vídeo{videoCount === 1 ? "" : "s"} selecionado{items.length === 1 ? "" : "s"}
        {" · "}Formatos aceitos: imagens e vídeos.
      </p>
    </div>
  );
}
