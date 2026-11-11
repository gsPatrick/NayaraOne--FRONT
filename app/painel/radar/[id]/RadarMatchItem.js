"use client";

// Um imóvel compatível com o radar: cartão do imóvel, score do match (vem do `radarMatch` da listagem) e, sob demanda,
// a explicação por critério lida de GET /radar/:id/matches/:propertyId/explain (M3-15).
import { useState } from "react";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import PropertyCard from "@/components/molecules/PropertyCard/PropertyCard";
import RadarExplanationPanel from "@/components/organisms/RadarMatchExplanation/RadarExplanationPanel";
import { RadarScoreBadge } from "@/components/organisms/RadarMatchExplanation/RadarMatchExplanation";
import styles from "./page.module.css";

export default function RadarMatchItem({ radarId, criteriaJson, property, radarMatch, onOpen }) {
  const [open, setOpen] = useState(false);
  const panelId = `radar-explicacao-${property.id}`;
  return (
    <div className={[styles.matchItem, open ? styles.matchItemOpen : ""].filter(Boolean).join(" ")} data-radar-match={property.id}>
      <PropertyCard property={property} onClick={onOpen} />
      <div className={styles.matchBar}>
        <RadarScoreBadge explanation={radarMatch} />
        <Button variant="ghost" size="sm" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
          <Icon name={open ? "minus" : "eye"} size={14} /> {open ? "Ocultar explicação" : "Ver explicação"}
        </Button>
      </div>
      {open ? (
        <div id={panelId} className={styles.explanation}>
          <RadarExplanationPanel radarId={radarId} propertyId={property.id} criteriaJson={criteriaJson} />
        </div>
      ) : null}
    </div>
  );
}
