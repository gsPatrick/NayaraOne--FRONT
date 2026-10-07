"use client";

import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";

// Indicador visual simples de pendências de sincronização offline (Marco 6, contrato §13).
// Usado nas 3 telas de captura de Obras com fila local (RDO, Medição, Requisição de material).
export default function OfflineSyncBadge({ pendingCount, syncing, syncError, onSyncNow }) {
  if (!pendingCount && !syncError) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
      {pendingCount > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md, 8px)",
            border: "1px solid var(--color-warning, #b8860b)",
            background: "var(--color-warning-bg, rgba(184,134,11,0.1))",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Icon name="bell" size={16} />
            {pendingCount} registro(s) pendente(s) de sincronização
          </span>
          <Button size="sm" variant="secondary" onClick={onSyncNow} loading={syncing}>
            Sincronizar pendentes
          </Button>
        </div>
      ) : null}
      {syncError ? <Alert tone="danger">{syncError}</Alert> : null}
    </div>
  );
}
