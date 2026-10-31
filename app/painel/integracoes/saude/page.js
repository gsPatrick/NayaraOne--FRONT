"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Badge from "@/components/atoms/Badge/Badge";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import Table from "@/components/organisms/Table/Table";
import { listIntegrationsHealth } from "@/lib/api/integrations";
import ContingenciaBanner from "./ContingenciaBanner";
import {
  SAUDE_LABEL, SAUDE_TONE, CIRCUITO_LABEL, CIRCUITO_TONE, AMBIENTE_LABEL, CRITICIDADE_LABEL, ALERTA_LABEL, ALERTA_TONE,
  formatPercent, formatMs, formatCount, formatDateTime, formatDays,
} from "./saudeFormat";
import styles from "./page.module.css";

// Integrações > Saúde (Marco 9, M9-D224): uma linha por integração e ambiente, com a saúde, o disjuntor, as 8 métricas do livro
// (9 valores, porque a latência tem p95 e p99), a última sincronização, os dias para a credencial vencer e os alertas abertos.
export default function IntegracoesSaudePage() {
  const [environment, setEnvironment] = useState("");
  // M9-D940: carregando, erro com "tentar de novo", sem acesso e sem conexão vêm do padrão único de estados.
  // Lista vazia é um estado real (nenhuma integração no ambiente), mostrado pela própria tabela.
  const healthQuery = useAsyncState(() => listIntegrationsHealth({ environment }), { key: `integracoes-saude:${environment}`, deps: [environment], isEmpty: () => false });
  const items = useMemo(() => healthQuery.data?.items || [], [healthQuery.data]);
  const loading = healthQuery.status === "LOADING";

  const columns = [
    {
      key: "provider",
      label: "Fornecedor",
      render: (row) => (
        <div className={styles.nameCell}>
          <span className={styles.providerName}>{row.label || row.provider}</span>
          <span className={styles.caption}>
            {row.provider} · {AMBIENTE_LABEL[row.environment] || row.environment} · criticidade {CRITICIDADE_LABEL[row.criticality] || "não definida"}
          </span>
        </div>
      ),
    },
    { key: "health", label: "Saúde", render: (row) => <Badge tone={SAUDE_TONE[row.healthStatus] || "neutral"}>{SAUDE_LABEL[row.healthStatus] || row.healthStatus}</Badge> },
    { key: "circuit", label: "Disjuntor", render: (row) => <Badge tone={CIRCUITO_TONE[row.circuitState] || "neutral"}>{CIRCUITO_LABEL[row.circuitState] || row.circuitState}</Badge> },
    { key: "successRate", label: "Sucesso (1 h)", render: (row) => formatPercent(row.metrics?.successRate) },
    { key: "latency", label: "Latência p95 / p99", render: (row) => `${formatMs(row.metrics?.latencyP95Ms)} / ${formatMs(row.metrics?.latencyP99Ms)}` },
    { key: "limits", label: "Limite do fornecedor / credencial recusada", render: (row) => `${formatCount(row.metrics?.rateLimitCount)} / ${formatCount(row.metrics?.authFailures)}` },
    { key: "retries", label: "Novas tentativas", render: (row) => formatCount(row.metrics?.retries) },
    { key: "queues", label: "Fila morta / fila", render: (row) => `${formatCount(row.metrics?.dlq)} / ${formatCount(row.metrics?.backlog)}` },
    { key: "quota", label: "Cota restante", render: (row) => (row.metrics?.quotaRemaining === null ? "Fornecedor não informa" : formatCount(row.metrics?.quotaRemaining)) },
    { key: "sync", label: "Última sincronização", render: (row) => formatDateTime(row.lastSyncAt, "Nunca sincronizou") },
    { key: "secret", label: "Credencial vence em", render: (row) => formatDays(row.secretExpiresInDays) },
    {
      key: "alerts",
      label: "Alertas abertos",
      render: (row) => (row.openAlerts?.length ? (
        <div className={styles.alertCell}>
          {row.openAlerts.map((a) => (
            <Badge key={a.id} tone={ALERTA_TONE[a.severity] || "neutral"}>{ALERTA_LABEL[a.type] || a.type}</Badge>
          ))}
        </div>
      ) : null),
      emptyText: "Nenhum alerta aberto",
    },
  ];

  return (
    <AppShell title="Integrações: saúde">
      <div className={styles.toolbar}>
        <span className={styles.toolbarInfo}>
          {items.length} integração(ões). As métricas são da última hora; a cada alerta o aviso leva o roteiro de ação (runbook) do fornecedor.
        </span>
        <div className={styles.filters}>
          <Select aria-label="Filtrar por ambiente" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
            <option value="">Todos os ambientes</option>
            {Object.entries(AMBIENTE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => healthQuery.reload()}>Atualizar</Button>
        </div>
      </div>

      <ContingenciaBanner />

      <AsyncState result={healthQuery} loadingLabel="Carregando saúde das integrações...">
        <Table columns={columns} rows={items} loading={loading} minWidth={1500} emptyMessage="Nenhuma integração cadastrada para este ambiente." />
      </AsyncState>
    </AppShell>
  );
}
