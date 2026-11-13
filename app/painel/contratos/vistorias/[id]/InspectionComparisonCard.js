"use client";

import { useState } from "react";
import Button from "@/components/atoms/Button/Button";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { CONDITION_LABELS, INSPECTION_TYPE_LABELS } from "@/lib/labels/juridico";
import { splitItemName } from "@/lib/legal/inspectionCodes";
import { formatDate } from "@/lib/format";
import { compareInspectionsWithNay } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { comparisonRows, nayComparisonView } from "@/lib/legal/inspectionNay";
import InspectionNayPanel from "./InspectionNayPanel";
import styles from "./page.module.css";

const conditionText = (code) => (code ? CONDITION_LABELS[code] || "Estado não informado" : "Item ausente");

// Comparação entrada x saída (Guia §10): pareada por ambiente + item. É apoio à decisão — responsabilidade e cobrança
// continuam com validação humana (requiresHumanValidation), nada é cobrado automaticamente. "Comparar com a NAY" pede a
// sugestão da NAY (com fontes) por cima da mesma comparação (InspectionNayPanel).
export default function InspectionComparisonCard({ entry, exit, comparison, onViewMedia, onError }) {
  const [nayView, setNayView] = useState(null);
  const [nayBusy, setNayBusy] = useState(false);
  const rows = comparisonRows(comparison);

  async function handleNay() {
    onError("");
    setNayBusy(true);
    try {
      setNayView(nayComparisonView(await compareInspectionsWithNay(entry.id, exit.id)));
    } catch (err) {
      onError(legalErrorMessage(err, "Não foi possível comparar com a NAY."));
    } finally {
      setNayBusy(false);
    }
  }

  const changedCount = rows.filter((r) => r.changed).length;
  return (
    <Card
      title="Comparação de vistorias"
      subtitle={`${changedCount} item(ns) com diferença entre ${INSPECTION_TYPE_LABELS[entry.inspectionType].toLowerCase()} (${formatDate(entry.scheduledAt)}) e ${INSPECTION_TYPE_LABELS[exit.inspectionType].toLowerCase()} (${formatDate(exit.scheduledAt)})`}
      actions={
        <Button size="sm" variant="secondary" onClick={handleNay} loading={nayBusy} disabled={nayBusy}>
          {nayView ? "Comparar com a NAY de novo" : "Comparar com a NAY"}
        </Button>
      }
    >
      <div data-testid="inspection-comparison">
        <Alert tone="warning" title="Comparação de apoio">
          Responsabilidade e cobrança dependem de validação humana: confira cada diferença com as fotos antes de decidir.
        </Alert>
        {nayView ? <InspectionNayPanel key={nayView.runId || "item-a-item"} view={nayView} onError={onError} /> : null}
        {rows.length === 0 ? (
          <EmptyState icon="check" title="Sem itens para comparar" description="As duas vistorias não têm itens registrados." />
        ) : (
          <div className={styles.compareGrid} style={{ gridTemplateColumns: "1fr" }}>
            <div className={styles.compareCol}>
              {rows.map((r, idx) => {
                const names = splitItemName(r.itemName);
                return (
                  <div
                    key={`${r.roomCode || ""}-${r.itemCode || r.itemName}-${idx}`}
                    className={[styles.compareRow, r.changed ? styles.compareRowChanged : ""].filter(Boolean).join(" ")}
                    data-testid="comparison-row"
                  >
                    <span className={styles.compareItemName}>{names.room ? `${names.room} — ${names.item}` : names.item}</span>
                    <span className={styles.compareItemMeta}>
                      {INSPECTION_TYPE_LABELS[entry.inspectionType]}: {conditionText(r.before)} · {INSPECTION_TYPE_LABELS[exit.inspectionType]}: {conditionText(r.after)}
                    </span>
                    <span>
                      {r.changed ? <Badge tone="warning">Mudou</Badge> : <Badge tone="success">Sem mudança</Badge>}
                    </span>
                    {(r.mediaRefs || []).length > 0 ? (
                      <span className={styles.mediaList}>
                        {r.mediaRefs.map((fileId, i) => (
                          <button key={fileId} type="button" className={styles.mediaViewBtn} onClick={() => onViewMedia({ id: fileId })}>
                            Ver mídia {i + 1}
                          </button>
                        ))}
                      </span>
                    ) : (
                      <span className={styles.compareItemMeta}>Sem fotos/vídeos nos dois lados</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
