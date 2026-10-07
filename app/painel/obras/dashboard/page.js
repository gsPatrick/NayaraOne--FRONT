"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import { getConstructionDashboard } from "@/lib/api/construction";
import { PROJECT_STATUS_LABELS } from "@/lib/mock/construction";
import { formatBRL, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

// GAP CORRIGIDO (auditoria pós-Marco 6, item 1): o contrato ("Painéis principais" do Centro de
// Comando) exige dois painéis dedicados — "Obras" e "Pós-obra" — com dado agregado de TODAS as
// obras da empresa, separados visualmente. Diferente de app/painel/obras/lista/[id]/page.js
// ("Saúde da obra"), que é o drill-down de UMA obra específica. Contrato confirmado em
// NayaraOne--API/src/features/construction/dashboard.service.js.

function BarRow({ label, value, max, warn }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div className={warn ? styles.barFillWarn : styles.barFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.barValue}>{value}</span>
    </div>
  );
}

export default function ObrasDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getConstructionDashboard()
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o painel de Obras/Pós-obra.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell title="Painel Obras & Pós-obra">
      {loadError ? <Alert tone="danger">{loadError}</Alert> : null}

      {loading ? (
        <Spinner size="lg" />
      ) : !dashboard ? (
        <EmptyState icon="chart" title="Sem dados" description="Nenhum indicador disponível." />
      ) : (
        <>
          <h2 className={styles.panelHeading}>Painel Obras (em andamento)</h2>
          <div className={styles.grid}>
            <StatTile label="Obras no total" value={dashboard.obras.totalProjects} tone="neutral" icon="building" />
            <StatTile label="Em andamento" value={dashboard.obras.projectsInProgress} tone="info" icon="clock" />
            <StatTile label="Obras atrasadas" value={dashboard.obras.overdueProjectsCount} tone={dashboard.obras.overdueProjectsCount > 0 ? "danger" : "success"} icon="shield" />
            <StatTile label="Não conformidades abertas" value={dashboard.obras.openNonconformities} tone={dashboard.obras.openNonconformities > 0 ? "warning" : "success"} icon="shield" />
          </div>

          <div className={styles.row}>
            <Card title="Custo — baseline x realizado x previsto" subtitle="Soma de TODAS as obras da empresa">
              <div className={styles.barList}>
                <BarRow label="Baseline" value={dashboard.obras.baselineBudgetTotal} max={Math.max(dashboard.obras.baselineBudgetTotal, dashboard.obras.projectedTotalCostTotal, 1)} />
                <BarRow label="Comprometido" value={dashboard.obras.committedCostTotal} max={Math.max(dashboard.obras.baselineBudgetTotal, dashboard.obras.projectedTotalCostTotal, 1)} />
                <BarRow label="Realizado" value={dashboard.obras.actualFinancialCostTotal} max={Math.max(dashboard.obras.baselineBudgetTotal, dashboard.obras.projectedTotalCostTotal, 1)} />
                <BarRow label="Previsto total" value={dashboard.obras.projectedTotalCostTotal} max={Math.max(dashboard.obras.baselineBudgetTotal, dashboard.obras.projectedTotalCostTotal, 1)} />
              </div>
              <p className={styles.generatedAt}>
                Margem projetada: {formatBRL(dashboard.obras.projectedMarginTotal)}
                {dashboard.obras.projectedMarginPct !== null ? ` (${dashboard.obras.projectedMarginPct}%)` : ""}
                {" · "}Desperdício: {dashboard.obras.wastagePct !== null ? `${dashboard.obras.wastagePct}%` : "—"}
              </p>
            </Card>

            <Card title="Obras por status" subtitle="Contagem por status do ciclo de vida">
              {Object.keys(dashboard.obras.projectsByStatus).length === 0 ? (
                <EmptyState icon="building" title="Sem obras" description="Nenhuma obra cadastrada ainda." />
              ) : (
                <div className={styles.barList}>
                  {Object.entries(dashboard.obras.projectsByStatus).map(([status, total]) => (
                    <BarRow
                      key={status}
                      label={PROJECT_STATUS_LABELS?.[status] || status}
                      value={total}
                      max={Math.max(...Object.values(dashboard.obras.projectsByStatus), 1)}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className={styles.row}>
            <Card title="Progresso x cronograma" subtitle="Média de todas as etapas de todas as obras">
              <div className={styles.grid} style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 0 }}>
                <StatTile label="Progresso físico médio" value={dashboard.obras.avgPhysicalProgressPct !== null ? `${dashboard.obras.avgPhysicalProgressPct}%` : "—"} tone="info" icon="chart" />
                <StatTile label="Progresso planejado médio" value={dashboard.obras.avgPlannedProgressPct !== null ? `${dashboard.obras.avgPlannedProgressPct}%` : "—"} tone="neutral" icon="clock" />
              </div>
            </Card>

            <Card title="Medições por status" subtitle="Soma de todas as obras">
              {Object.keys(dashboard.obras.measurementsByStatus).length === 0 ? (
                <EmptyState icon="chart" title="Sem medições" description="Nenhuma medição registrada ainda." />
              ) : (
                <div className={styles.barList}>
                  {Object.entries(dashboard.obras.measurementsByStatus).map(([status, total]) => (
                    <BarRow key={status} label={status} value={total} max={Math.max(...Object.values(dashboard.obras.measurementsByStatus), 1)} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <h2 className={styles.panelHeading}>Painel Pós-obra (garantia)</h2>
          <div className={styles.grid}>
            <StatTile label="Chamados no total" value={dashboard.posObra.totalCases} tone="neutral" icon="settings" />
            <StatTile label="Abertos" value={dashboard.posObra.openCases} tone={dashboard.posObra.openCases > 0 ? "warning" : "success"} icon="clock" />
            <StatTile label="Fechados" value={dashboard.posObra.closedCases} tone="success" icon="check" />
            <StatTile label="Custo total de pós-obra" value={formatBRL(dashboard.posObra.totalWarrantyCost)} tone="neutral" icon="money" />
          </div>

          <div className={styles.row}>
            <Card title="Chamados por nível de escalonamento" subtitle="Todas as obras">
              <div className={styles.barList}>
                {Object.entries(dashboard.posObra.casesByEscalationLevel).map(([level, total]) => (
                  <BarRow
                    key={level}
                    label={level}
                    value={total}
                    max={Math.max(...Object.values(dashboard.posObra.casesByEscalationLevel), 1)}
                    warn={level === "OVERDUE" || level === "CRITICAL"}
                  />
                ))}
              </div>
            </Card>

            <Card title="Recorrência por causa raiz" subtitle="Chamados de garantia agrupados por rootCauseCode">
              {dashboard.posObra.recurrenceByRootCause.length === 0 ? (
                <EmptyState icon="settings" title="Sem chamados" description="Nenhum chamado de pós-obra registrado ainda." />
              ) : (
                <div className={styles.barList}>
                  {dashboard.posObra.recurrenceByRootCause.map((r) => (
                    <BarRow
                      key={r.cause}
                      label={r.cause}
                      value={r.count}
                      max={Math.max(...dashboard.posObra.recurrenceByRootCause.map((x) => x.count), 1)}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <p className={styles.generatedAt}>Gerado em {formatDateTime(dashboard.updatedAt)}</p>
        </>
      )}

      <StickyActionBar>
        <Button variant="secondary" href="/painel/obras/lista">
          <Icon name="building" size={18} /> Ver obras
        </Button>
        <Button variant="secondary" href="/painel/obras/pos-obra">
          <Icon name="key" size={18} /> Ver pós-obra
        </Button>
      </StickyActionBar>
    </AppShell>
  );
}
