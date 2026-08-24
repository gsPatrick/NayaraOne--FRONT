"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { getProperty } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import {
  getInspection,
  getContract,
  listInspectionItems,
  listInspections,
  completeInspection,
  compareInspections,
} from "@/lib/api/legal";
import {
  INSPECTION_TYPE_LABELS,
  INSPECTION_TYPE_TONE,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONE,
  CONDITION_LABELS,
  CONDITION_TONE,
} from "@/lib/mock/legal";
import { formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function VistoriaDetailPage({ params }) {
  const [inspection, setInspection] = useState(null);
  const [property, setProperty] = useState(null);
  const [contract, setContract] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [counterpart, setCounterpart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([getInspection(params.id), listInspectionItems(params.id), apiFetch("/users"), listInspections()])
      .then(async ([inspectionRes, itemsRes, usersRes, allInspections]) => {
        if (cancelled) return;
        setInspection(inspectionRes);
        setItems(itemsRes || []);
        setUsers(usersRes || []);

        if (inspectionRes?.propertyId) {
          try {
            const prop = await getProperty(inspectionRes.propertyId);
            if (!cancelled) setProperty(prop);
          } catch {
            // Imóvel pode não estar disponível.
          }
        }
        if (inspectionRes?.contractId) {
          try {
            const c = await getContract(inspectionRes.contractId);
            if (!cancelled) setContract(c);
          } catch {
            // Contrato pode não estar disponível.
          }
        }

        const counterpartType = inspectionRes.inspectionType === "CHECK_IN" ? "CHECK_OUT" : inspectionRes.inspectionType === "CHECK_OUT" ? "CHECK_IN" : null;
        if (counterpartType) {
          const found = (allInspections || []).find(
            (i) => i.propertyId === inspectionRes.propertyId && i.inspectionType === counterpartType && i.id !== inspectionRes.id
          );
          if (!cancelled) setCounterpart(found || null);
        }
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar vistoria."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  function userName(id) {
    return users.find((u) => u.id === id)?.name || "—";
  }

  if (loading) {
    return (
      <AppShell title="Vistoria" backHref="/painel/contratos/vistorias">
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="Vistoria" backHref="/painel/contratos/vistorias">
        <Alert tone="danger">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!inspection) return notFound();

  const counterpartType = inspection.inspectionType === "CHECK_IN" ? "CHECK_OUT" : inspection.inspectionType === "CHECK_OUT" ? "CHECK_IN" : null;
  const divergenceCount = comparison ? comparison.divergences.length : 0;

  async function handleComplete() {
    setActionError("");
    setBusy(true);
    try {
      const updated = await completeInspection(inspection.id);
      setInspection(updated);
    } catch (err) {
      setActionError(err.message || "Erro ao concluir vistoria.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleCompare() {
    if (compareOpen) {
      setCompareOpen(false);
      return;
    }
    setActionError("");
    setBusy(true);
    try {
      const entryId = inspection.inspectionType === "CHECK_IN" ? inspection.id : counterpart.id;
      const exitId = inspection.inspectionType === "CHECK_OUT" ? inspection.id : counterpart.id;
      const result = await compareInspections(entryId, exitId);
      setComparison(result);
      setCompareOpen(true);
    } catch (err) {
      setActionError(err.message || "Erro ao comparar vistorias.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={property?.name || "Vistoria"} backHref="/painel/contratos/vistorias">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={INSPECTION_TYPE_TONE[inspection.inspectionType]}>{INSPECTION_TYPE_LABELS[inspection.inspectionType]}</Badge>
            <Badge tone={INSPECTION_STATUS_TONE[inspection.status]}>{INSPECTION_STATUS_LABELS[inspection.status]}</Badge>
          </div>
          <div className={styles.actions}>
            {inspection.status === "SCHEDULED" ? (
              <Button onClick={handleComplete} disabled={busy}><Icon name="check" size={16} /> Concluir vistoria</Button>
            ) : null}
            {counterpart ? (
              <Button variant="secondary" onClick={handleToggleCompare} disabled={busy}>
                <Icon name="swapHorizontal" size={16} />
                {compareOpen ? "Ocultar comparação" : `Comparar com vistoria de ${INSPECTION_TYPE_LABELS[counterpartType].toLowerCase()}`}
              </Button>
            ) : null}
          </div>
        </div>

        {actionError ? <Alert tone="danger" className={styles.notice}>{actionError}</Alert> : null}

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
            <EmptyState icon="document" title="Sem itens" description="Nenhum item registrado — vistoria ainda não concluída." />
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

        {compareOpen && counterpart && comparison ? (
          <Card
            title="Comparação de vistorias"
            subtitle={`${divergenceCount} divergência(s) encontrada(s) entre as vistorias de ${INSPECTION_TYPE_LABELS[inspection.inspectionType].toLowerCase()} e ${INSPECTION_TYPE_LABELS[counterpart.inspectionType].toLowerCase()}`}
          >
            <div className={styles.compareGrid}>
              <div className={styles.compareCol}>
                <span className={styles.compareColHead}>{INSPECTION_TYPE_LABELS[inspection.inspectionType]} — {formatDate(inspection.scheduledAt)}</span>
                {comparison.divergences.map((c) => (
                  <div key={`div-a-${c.itemName}`} className={[styles.compareRow, styles.compareRowChanged].join(" ")}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.entryCondition] || c.entryCondition}</span>
                  </div>
                ))}
                {comparison.onlyInEntry.map((c) => (
                  <div key={`only-a-${c.itemName}`} className={styles.compareRow}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.entryCondition] || c.entryCondition}</span>
                  </div>
                ))}
              </div>
              <div className={styles.compareCol}>
                <span className={styles.compareColHead}>{INSPECTION_TYPE_LABELS[counterpart.inspectionType]} — {formatDate(counterpart.scheduledAt)}</span>
                {comparison.divergences.map((c) => (
                  <div key={`div-b-${c.itemName}`} className={[styles.compareRow, styles.compareRowChanged].join(" ")}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.exitCondition] || c.exitCondition}</span>
                  </div>
                ))}
                {comparison.onlyInExit.map((c) => (
                  <div key={`only-b-${c.itemName}`} className={styles.compareRow}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.exitCondition] || c.exitCondition}</span>
                  </div>
                ))}
              </div>
            </div>
            {divergenceCount > 0 ? (
              <p className={styles.divergenceNote}>
                <Icon name="filter" size={14} /> Itens destacados mudaram de condição entre as duas vistorias.
              </p>
            ) : (
              <EmptyState icon="check" title="Sem divergências" description="Nenhuma divergência encontrada entre as duas vistorias." />
            )}
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
