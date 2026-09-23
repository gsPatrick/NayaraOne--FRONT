"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import CrmNavMenu from "@/components/molecules/CrmNavMenu/CrmNavMenu";
import { getCrmDashboard, fromApiStage } from "@/lib/api/crm";
import { STAGES } from "@/lib/mock/opportunities";
import { formatBRL, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const PROPOSAL_STATUS_LABELS = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  UNDER_NEGOTIATION: "Em negociação",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
  EXPIRED: "Expirada",
};

function stageLabel(apiStage) {
  const key = fromApiStage(apiStage);
  return STAGES.find((s) => s.key === key)?.label || apiStage;
}

export default function CrmDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getCrmDashboard()
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o painel de indicadores.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <AppShell title="Painel de indicadores">
      {loadError ? <Alert tone="danger">{loadError}</Alert> : null}

      {loading ? (
        <Spinner size="lg" />
      ) : !dashboard ? (
        <EmptyState icon="chart" title="Sem dados" description="Nenhum indicador disponível." />
      ) : (
        <>
          <div className={styles.grid}>
            <StatTile label="Oportunidades no total" value={dashboard.opportunities.total} tone="neutral" icon="chart" />
            <StatTile label="Em aberto" value={dashboard.opportunities.open} tone="info" icon="clock" />
            <StatTile
              label="Taxa de conversão"
              value={dashboard.conversionRate != null ? `${(dashboard.conversionRate * 100).toFixed(1)}%` : "—"}
              tone="success"
              icon="check"
            />
            <StatTile label="Valor de propostas aceitas" value={formatBRL(dashboard.proposals.acceptedValue)} tone="success" icon="money" />
          </div>

          <div className={styles.row}>
            <Card title="Oportunidades por etapa" subtitle="Contagem por etapa do funil, incluindo etapas terminais">
              {Object.keys(dashboard.opportunities.byStage).length === 0 ? (
                <EmptyState icon="chart" title="Sem oportunidades" description="Nenhuma oportunidade cadastrada ainda." />
              ) : (
                <div className={styles.barList}>
                  {Object.entries(dashboard.opportunities.byStage).map(([stage, total]) => {
                    const max = Math.max(...Object.values(dashboard.opportunities.byStage), 1);
                    return (
                      <div className={styles.barRow} key={stage}>
                        <span className={styles.barLabel}>{stageLabel(stage)}</span>
                        <div className={styles.barTrack}>
                          <div className={styles.barFill} style={{ width: `${(total / max) * 100}%` }} />
                        </div>
                        <span className={styles.barValue}>{total}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card title="Fechamentos" subtitle="Ganhos, perdas e desistências">
              <div className={styles.closedGrid}>
                <StatTile label="Ganhas" value={dashboard.opportunities.closed.won} tone="success" icon="check" />
                <StatTile label="Perdidas" value={dashboard.opportunities.closed.lost} tone="danger" icon="close" />
                <StatTile label="Desistências" value={dashboard.opportunities.closed.withdrawn} tone="neutral" icon="ban" />
              </div>
            </Card>
          </div>

          <div className={styles.row}>
            <Card title="Principais motivos de perda" subtitle="Agregado sobre o motivo estruturado de perda">
              {dashboard.topLostReasons.length === 0 ? (
                <EmptyState icon="chart" title="Sem perdas registradas" description="Nenhuma oportunidade perdida com motivo registrado." />
              ) : (
                <div className={styles.barList}>
                  {dashboard.topLostReasons.map((r) => (
                    <div className={styles.barRow} key={r.reason}>
                      <span className={styles.barLabel}>
                        {r.reason}
                        {!r.inEnum ? <Badge tone="neutral" className={styles.legacyBadge}>legado</Badge> : null}
                      </span>
                      <span className={styles.barValue}>{r.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Propostas por status" subtitle={`${dashboard.proposals.total} propostas no total`}>
              {Object.keys(dashboard.proposals.byStatus).length === 0 ? (
                <EmptyState icon="signature" title="Sem propostas" description="Nenhuma proposta cadastrada ainda." />
              ) : (
                <div className={styles.barList}>
                  {Object.entries(dashboard.proposals.byStatus).map(([status, total]) => (
                    <div className={styles.barRow} key={status}>
                      <span className={styles.barLabel}>{PROPOSAL_STATUS_LABELS[status] || status}</span>
                      <span className={styles.barValue}>{total}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <p className={styles.generatedAt}>Gerado em {formatDateTime(dashboard.generatedAt)}</p>
        </>
      )}

      <StickyActionBar>
        <CrmNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
