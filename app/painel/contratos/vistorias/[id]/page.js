"use client";

import { useMemo, useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import { PROPERTIES } from "@/lib/mock/properties";
import { USERS } from "@/lib/mock/users";
import {
  INSPECTIONS,
  CONTRACTS,
  INSPECTION_TYPE_LABELS,
  INSPECTION_TYPE_TONE,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONE,
  CONDITION_LABELS,
  CONDITION_TONE,
  itemsOf,
} from "@/lib/mock/legal";
import { formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

function propertyOf(id) {
  return PROPERTIES.find((p) => p.id === id) || null;
}

function userName(id) {
  return USERS.find((u) => u.id === id)?.name || "—";
}

// Mesma lógica ilustrativa do compareInspections() do backend: casa itens pelo nome e
// aponta divergência quando a condição registrada muda entre as duas vistorias do imóvel.
function compareInspections(base, other, baseItems, otherItems) {
  const names = Array.from(new Set([...baseItems.map((i) => i.itemName), ...otherItems.map((i) => i.itemName)]));
  return names.map((name) => {
    const a = baseItems.find((i) => i.itemName === name) || null;
    const b = otherItems.find((i) => i.itemName === name) || null;
    return { name, a, b, changed: a && b ? a.condition !== b.condition : Boolean(a) !== Boolean(b) };
  });
}

export default function VistoriaDetailPage({ params }) {
  const inspection = INSPECTIONS.find((i) => i.id === params.id);
  const [compareOpen, setCompareOpen] = useState(false);

  if (!inspection) return notFound();

  const property = propertyOf(inspection.propertyId);
  const contract = inspection.contractId ? CONTRACTS.find((c) => c.id === inspection.contractId) : null;
  const items = itemsOf(inspection.id);

  const counterpartType = inspection.inspectionType === "CHECK_IN" ? "CHECK_OUT" : inspection.inspectionType === "CHECK_OUT" ? "CHECK_IN" : null;
  const counterpart = useMemo(() => {
    if (!counterpartType) return null;
    return (
      INSPECTIONS.find(
        (i) => i.propertyId === inspection.propertyId && i.inspectionType === counterpartType && i.id !== inspection.id
      ) || null
    );
  }, [inspection, counterpartType]);

  const comparison = useMemo(() => {
    if (!counterpart) return [];
    return compareInspections(inspection, counterpart, items, itemsOf(counterpart.id));
  }, [inspection, counterpart, items]);

  const divergenceCount = comparison.filter((c) => c.changed).length;

  return (
    <AppShell title={property?.name || "Vistoria"} backHref="/painel/contratos/vistorias">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={INSPECTION_TYPE_TONE[inspection.inspectionType]}>{INSPECTION_TYPE_LABELS[inspection.inspectionType]}</Badge>
            <Badge tone={INSPECTION_STATUS_TONE[inspection.status]}>{INSPECTION_STATUS_LABELS[inspection.status]}</Badge>
          </div>
          {counterpart ? (
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => setCompareOpen((v) => !v)}>
                <Icon name="swapHorizontal" size={16} />
                {compareOpen ? "Ocultar comparação" : `Comparar com vistoria de ${INSPECTION_TYPE_LABELS[counterpartType].toLowerCase()}`}
              </Button>
            </div>
          ) : null}
        </div>

        <Card title="Detalhes da vistoria">
          <dl className={styles.detailList}>
            <div className={styles.detailRow}><dt>Imóvel</dt><dd>{property?.name || "—"}</dd></div>
            <div className={styles.detailRow}><dt>Contrato vinculado</dt><dd>{contract?.contractNumber || "—"}</dd></div>
            <div className={styles.detailRow}><dt>Inspetor</dt><dd>{inspection.inspectorUserId ? userName(inspection.inspectorUserId) : "—"}</dd></div>
            <div className={styles.detailRow}><dt>Agendada para</dt><dd>{formatDate(inspection.scheduledAt)}</dd></div>
            <div className={styles.detailRow}><dt>Concluída em</dt><dd>{inspection.completedAt ? formatDateTime(inspection.completedAt) : "—"}</dd></div>
          </dl>
        </Card>

        <Card title="Itens vistoriados" subtitle={`${items.length} item(ns) registrado(s)`}>
          {items.length === 0 ? (
            <p className={styles.emptyText}>Nenhum item registrado — vistoria ainda não concluída.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.itemName}</span>
                  {item.notes ? <span className={styles.itemNotes}>{item.notes}</span> : null}
                </div>
                <Badge tone={CONDITION_TONE[item.condition]}>{CONDITION_LABELS[item.condition]}</Badge>
              </div>
            ))
          )}
        </Card>

        {compareOpen && counterpart ? (
          <Card
            title="Comparação de vistorias"
            subtitle={`${divergenceCount} divergência(s) encontrada(s) entre as vistorias de ${INSPECTION_TYPE_LABELS[inspection.inspectionType].toLowerCase()} e ${INSPECTION_TYPE_LABELS[counterpart.inspectionType].toLowerCase()}`}
          >
            <div className={styles.compareGrid}>
              <div className={styles.compareCol}>
                <span className={styles.compareColHead}>{INSPECTION_TYPE_LABELS[inspection.inspectionType]} — {formatDate(inspection.scheduledAt)}</span>
                {comparison.map((c) => (
                  <div key={`a-${c.name}`} className={[styles.compareRow, c.changed ? styles.compareRowChanged : ""].filter(Boolean).join(" ")}>
                    <span className={styles.compareItemName}>{c.name}</span>
                    <span className={styles.compareItemMeta}>{c.a ? CONDITION_LABELS[c.a.condition] : "Não registrado"}</span>
                  </div>
                ))}
              </div>
              <div className={styles.compareCol}>
                <span className={styles.compareColHead}>{INSPECTION_TYPE_LABELS[counterpart.inspectionType]} — {formatDate(counterpart.scheduledAt)}</span>
                {comparison.map((c) => (
                  <div key={`b-${c.name}`} className={[styles.compareRow, c.changed ? styles.compareRowChanged : ""].filter(Boolean).join(" ")}>
                    <span className={styles.compareItemName}>{c.name}</span>
                    <span className={styles.compareItemMeta}>{c.b ? CONDITION_LABELS[c.b.condition] : "Não registrado"}</span>
                  </div>
                ))}
              </div>
            </div>
            {divergenceCount > 0 ? (
              <p className={styles.divergenceNote}>
                <Icon name="filter" size={14} /> Itens destacados mudaram de condição entre as duas vistorias.
              </p>
            ) : (
              <p className={styles.emptyText}>Nenhuma divergência encontrada entre as duas vistorias.</p>
            )}
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
