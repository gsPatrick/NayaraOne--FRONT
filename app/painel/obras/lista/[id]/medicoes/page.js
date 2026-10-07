"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import {
  STAGE_STATUS_LABELS,
  STAGE_STATUS_TONE,
  MEASUREMENT_STATUS_LABELS,
  MEASUREMENT_STATUS_TONE,
} from "@/lib/mock/construction";
import { getProject, listProjectStages, listStageMeasurements } from "@/lib/api/construction";
import { apiFetch } from "@/lib/api/client";
import { formatDate, formatPercent, formatBRL } from "@/lib/format";
import styles from "./page.module.css";

// Visão consolidada de medições de todas as etapas da obra — extraída na divisão do antigo
// monólito app/painel/obras/lista/[id]/page.js em subrotas. As ações de medição (registrar,
// enviar para revisão, revisar, aprovar/rejeitar) continuam na tela de detalhe da etapa
// (app/painel/obras/lista/[id]/etapas/[stageId]/page.js) — aqui é só uma leitura agregada, com
// link direto para a etapa correspondente para quem precisar agir.
export default function MedicoesObraPage({ params }) {
  const [project, setProject] = useState(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [measurementsByStage, setMeasurementsByStage] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      getProject(params.id).catch((err) => {
        if (err?.status === 404) {
          setNotFoundFlag(true);
          return null;
        }
        throw err;
      }),
      apiFetch("/users?status=ACTIVE").catch(() => []),
    ])
      .then(([p, u]) => {
        if (cancelled || !p) return;
        setProject(p);
        setUsers(u || []);
        return listProjectStages(p.id).then((st) => {
          if (cancelled) return;
          setStages(st || []);
          return Promise.all((st || []).map((s) => listStageMeasurements(s.id).catch(() => []))).then((results) => {
            if (cancelled) return;
            const byStage = {};
            (st || []).forEach((s, idx) => {
              byStage[s.id] = results[idx] || [];
            });
            setMeasurementsByStage(byStage);
          });
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar as medições.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    const cancel = load();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (notFoundFlag) return notFound();

  if (loading) {
    return (
      <AppShell title="Medições" backHref={`/painel/obras/lista/${params.id}`}>
        <SkeletonDetail sections={1} />
      </AppShell>
    );
  }

  if (loadError && !project) {
    return (
      <AppShell title="Medições" backHref={`/painel/obras/lista/${params.id}`}>
        <Alert tone="danger" title="Não foi possível carregar as medições">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="Medições" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  const hasAnyMeasurement = Object.values(measurementsByStage).some((list) => list.length > 0);

  return (
    <AppShell title={`Medições — ${project.name}`} backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        {stages.length === 0 ? (
          <Card title="Medições por etapa">
            <EmptyState icon="layers" title="Sem etapas" description="Cadastre etapas para esta obra para poder registrar medições." />
          </Card>
        ) : !hasAnyMeasurement ? (
          <Card title="Medições por etapa">
            <EmptyState icon="chart" title="Sem medições" description="Nenhuma medição registrada em nenhuma etapa desta obra ainda. Acesse uma etapa para registrar." />
          </Card>
        ) : (
          stages.map((s) => {
            const measurements = measurementsByStage[s.id] || [];
            if (measurements.length === 0) return null;
            return (
              <Card
                key={s.id}
                title={
                  <a href={`/painel/obras/lista/${project.id}/etapas/${s.id}`} className={styles.infoLink}>
                    {s.sequence}. {s.name}
                  </a>
                }
                subtitle={<Badge tone={STAGE_STATUS_TONE[s.status]}>{STAGE_STATUS_LABELS[s.status]}</Badge>}
              >
                <div className={styles.rowList}>
                  {measurements.map((m) => {
                    const measuredBy = m.measuredByUserId ? users.find((u) => u.id === m.measuredByUserId) : null;
                    return (
                      <div key={m.id} className={styles.rowStatic}>
                        <div className={styles.rowInfo}>
                          <span className={styles.rowTitle}>{formatDate(m.measuredAt)} · {formatPercent(m.measuredPct)}</span>
                          <span className={styles.rowSubtitle}>
                            Medido por {measuredBy?.name || "—"} · Valor: {formatBRL(m.totalAmount)}
                            {m.notes ? ` · ${m.notes}` : ""}
                          </span>
                        </div>
                        <Badge tone={MEASUREMENT_STATUS_TONE[m.status]}>{MEASUREMENT_STATUS_LABELS[m.status]}</Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
