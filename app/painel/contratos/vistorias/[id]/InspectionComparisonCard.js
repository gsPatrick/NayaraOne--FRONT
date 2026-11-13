"use client";

import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { CONDITION_LABELS, INSPECTION_TYPE_LABELS } from "@/lib/labels/juridico";
import { splitItemName } from "@/lib/legal/inspectionCodes";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

const conditionText = (code) => (code ? CONDITION_LABELS[code] || "Estado não informado" : "Item ausente");

// Linhas da comparação: a resposta nova (items[]: ambiente/item, antes, depois, mudou, mídias); vistorias antigas sem
// `items` caem nas divergências.
function rowsOf(comparison) {
  if (Array.isArray(comparison.items)) return comparison.items;
  return (comparison.divergences || []).map((d) => ({ itemName: d.itemName, before: d.entryCondition, after: d.exitCondition, changed: true, mediaRefs: [] }));
}

// Comparação entrada x saída (Guia §10): pareada por ambiente + item. É apoio à decisão — responsabilidade e cobrança
// continuam com validação humana (requiresHumanValidation), nada é cobrado automaticamente.
export default function InspectionComparisonCard({ entry, exit, comparison, onViewMedia }) {
  const rows = rowsOf(comparison);
  const changedCount = rows.filter((r) => r.changed).length;
  return (
    <Card
      title="Comparação de vistorias"
      subtitle={`${changedCount} item(ns) com diferença entre ${INSPECTION_TYPE_LABELS[entry.inspectionType].toLowerCase()} (${formatDate(entry.scheduledAt)}) e ${INSPECTION_TYPE_LABELS[exit.inspectionType].toLowerCase()} (${formatDate(exit.scheduledAt)})`}
    >
      <div data-testid="inspection-comparison">
        <Alert tone="warning" title="Comparação de apoio">
          Responsabilidade e cobrança dependem de validação humana: confira cada diferença com as fotos antes de decidir.
        </Alert>
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
