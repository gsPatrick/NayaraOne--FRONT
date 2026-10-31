"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import {
  STAGE_STATUS_LABELS,
  STAGE_STATUS_TONE,
  MEASUREMENT_STATUS_LABELS,
  MEASUREMENT_STATUS_TONE,
} from "@/lib/mock/construction";
import { listProjectStages, listStageMeasurements } from "@/lib/api/construction";
import { apiFetch } from "@/lib/api/client";
import { formatDate, formatPercent, formatBRL } from "@/lib/format";
import styles from "./page.module.css";
import { getProjectOrNull } from "../_components/getProjectOrNull";

import { lookupFallback } from "@/lib/asyncState/lookup";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
// Visão consolidada de medições de todas as etapas da obra — extraída na divisão do antigo
// monólito app/painel/obras/lista/[id]/page.js em subrotas. As ações de medição (registrar,
// enviar para revisão, revisar, aprovar/rejeitar) continuam na tela de detalhe da etapa
// (app/painel/obras/lista/[id]/etapas/[stageId]/page.js) — aqui é só uma leitura agregada, com
// link direto para a etapa correspondente para quem precisar agir.
export default function MedicoesObraPage({ params }) {
  const [project, setProject] = useState(null);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [measurementsByStage, setMeasurementsByStage] = useState({});

  // M9-D850: a leitura passa pelo padrão único de estados (carregando, erro com "tentar de novo", 403, offline).
  // Os dados vão para o estado local, que as ações da tela continuam atualizando.
  const pageQuery = useAsyncState(
    async () => {
      const [project, users] = await Promise.all([getProjectOrNull(params.id), apiFetch("/users?status=ACTIVE").catch(lookupFallback("os usuários"))]);
      if (!project) return { notFound: true };
      const stages = (await listProjectStages(project.id)) || [];
      const results = await Promise.all(stages.map((s) => listStageMeasurements(s.id).catch(lookupFallback("as medições da etapa"))));
      const measurementsByStage = {};
      stages.forEach((s, idx) => {
        measurementsByStage[s.id] = results[idx] || [];
      });
      return { project, users: users || [], stages, measurementsByStage };
    },
    { key: `obra-medicoes-${params.id}`, deps: [params.id], isEmpty: () => false }
  );
  useEffect(() => {
    const d = pageQuery.data;
    if (!d || d.notFound) return;
    setProject(d.project);
    setUsers(d.users);
    setStages(d.stages);
    setMeasurementsByStage(d.measurementsByStage);
  }, [pageQuery.data]);

  if (pageQuery.data && pageQuery.data.notFound) return notFound();

  // Enquanto não há obra carregada (carregando, erro, sem permissão, sem conexão), o AsyncState mostra o estado correspondente.
  if (!project) {
    return (
      <AppShell title="Medições" backHref={`/painel/obras/lista/${params.id}`}>
        <AsyncState result={pageQuery} loadingLabel="Carregando as medições...">{null}</AsyncState>
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
                            Medido por {measuredBy?.name || "Sem responsável definido"} · Valor: {formatBRL(m.totalAmount)}
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
