"use client";

// Busca a explicação do match em GET /radar/:id/matches/:propertyId/explain (M3-15) e a desenha no padrão de estados (M9-D850).
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { explainRadarMatch } from "@/lib/api/radar";
import { RadarExplanationView } from "./RadarMatchExplanation";

const semCriterios = (data) => !data || !data.criteria || Object.keys(data.criteria).length === 0;

export default function RadarExplanationPanel({ radarId, propertyId, criteriaJson }) {
  const query = useAsyncState(() => explainRadarMatch(radarId, propertyId), { deps: [radarId, propertyId], isEmpty: semCriterios });
  return <RadarExplanationView result={query} criteriaJson={criteriaJson} />;
}
