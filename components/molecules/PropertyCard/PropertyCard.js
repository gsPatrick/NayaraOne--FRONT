"use client";

import { useState } from "react";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import { formatBRL } from "@/lib/format";
import { AVAILABILITY_STATUS_LABELS, PUBLICATION_STATUS_LABELS, OFFER_TYPE_LABELS } from "@/lib/mock/properties";
import styles from "./PropertyCard.module.css";

const AVAILABILITY_TONE = {
  AVAILABLE: "success",
  RENTED: "info",
  SOLD: "brand",
  WITHDRAWN: "neutral",
};

const GRADIENTS = [
  "linear-gradient(135deg, #17130F 0%, #3A2E14 100%)",
  "linear-gradient(135deg, #0F0C0A 0%, #8A6620 100%)",
  "linear-gradient(135deg, #3A2E14 0%, #BE9130 100%)",
  "linear-gradient(135deg, #17130F 0%, #A97D28 100%)",
];

export default function PropertyCard({ property, onClick }) {
  const baseHash = Math.abs(hashCode(property.id));
  const photoCount = 2 + (baseHash % 4);
  const [photoIndex, setPhotoIndex] = useState(0);
  const gradient = GRADIENTS[(baseHash + photoIndex) % GRADIENTS.length];
  const offer = property.activeOffer;
  const historyCount = property.priceHistory?.length || 0;

  function prevPhoto(event) {
    event.stopPropagation();
    setPhotoIndex((i) => (i - 1 + photoCount) % photoCount);
  }

  function nextPhoto(event) {
    event.stopPropagation();
    setPhotoIndex((i) => (i + 1) % photoCount);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.(property);
    }
  }

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(property)}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.media} style={{ background: gradient }}>
        <Icon name="building" size={22} className={styles.mediaIcon} />

        {photoCount > 1 ? (
          <>
            <button type="button" className={[styles.navBtn, styles.navPrev].join(" ")} onClick={prevPhoto} aria-label="Foto anterior">
              <Icon name="chevronRight" size={14} className={styles.navIconPrev} />
            </button>
            <button type="button" className={[styles.navBtn, styles.navNext].join(" ")} onClick={nextPhoto} aria-label="Próxima foto">
              <Icon name="chevronRight" size={14} />
            </button>
          </>
        ) : null}

        {photoCount > 1 ? (
          <div className={styles.dots} aria-hidden="true">
            {Array.from({ length: photoCount }).map((_, i) => (
              <span key={i} className={[styles.dot, i === photoIndex ? styles.dotActive : ""].filter(Boolean).join(" ")} />
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles.body}>
        <p className={styles.name}>{property.name}</p>
        <p className={styles.meta}>
          <span className={styles.internalCode}>Cód. {property.internalCode}</span> · {property.neighborhood}, {property.city}
        </p>
        <div className={styles.specs}>
          <span>{property.type}</span>
          <span>{property.areaM2} m²</span>
          {property.bedrooms ? <span>{property.bedrooms} dorm.</span> : null}
          {property.parkingSpots ? <span>{property.parkingSpots} vaga(s)</span> : null}
        </div>
        <div className={styles.footer}>
          <div>
            <span className={styles.price}>{offer ? formatBRL(offer.askingPrice) : "—"}</span>
            {offer?.offerType === "RENT" ? <span className={styles.priceSuffix}>/mês</span> : null}
          </div>
          <span className={styles.offerType}>{offer ? OFFER_TYPE_LABELS[offer.offerType] : "Sem oferta"}</span>
        </div>
        <div className={styles.statusRow}>
          <Badge tone={AVAILABILITY_TONE[property.availabilityStatus] || "neutral"}>
            {AVAILABILITY_STATUS_LABELS[property.availabilityStatus] || property.availabilityStatus}
          </Badge>
          <span className={styles.publicationBadge}>{PUBLICATION_STATUS_LABELS[property.publicationStatus] || property.publicationStatus}</span>
          {historyCount > 1 ? <Badge tone="neutral">{historyCount} ofertas</Badge> : null}
        </div>
      </div>
    </div>
  );
}

function hashCode(str = "") {
  let hash = 0;
  for (let i = 0; i < String(str).length; i++) {
    hash = (hash << 5) - hash + String(str).charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
