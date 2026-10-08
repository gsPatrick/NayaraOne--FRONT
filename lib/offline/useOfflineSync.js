"use client";

import { useCallback, useEffect, useState } from "react";
import { countOfflineRecords, syncOfflineQueue } from "./offlineQueue";

/**
 * useOfflineSync — hook reutilizável pelas 3 telas de captura de Obras com fila offline (RDO,
 * Medição, Requisição de material). Mantém a contagem de pendentes, tenta sincronizar
 * automaticamente quando o evento `online` dispara, e expõe `syncNow()` para o botão manual
 * "Sincronizar pendentes".
 *
 * `sendFn(payload, idempotencyKey)` deve repetir a MESMA chamada de criação original — o
 * idempotencyKey é sempre o mesmo gerado no momento em que o registro entrou na fila (offline),
 * então um reenvio nunca duplica no servidor.
 */
export function useOfflineSync(queueName, sendFn, onSynced) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  const refreshCount = useCallback(() => {
    setPendingCount(countOfflineRecords(queueName));
  }, [queueName]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncError("");
    try {
      const { succeeded, failed } = await syncOfflineQueue(queueName, sendFn);
      refreshCount();
      if (succeeded.length > 0 && typeof onSynced === "function") {
        onSynced(succeeded);
      }
      if (failed.length > 0) {
        setSyncError(`${failed.length} registro(s) ainda não puderam ser sincronizados. Tente novamente quando a conexão estabilizar.`);
      }
    } finally {
      setSyncing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueName, sendFn, syncing, refreshCount]);

  // Tenta sincronizar automaticamente quando a conexão volta — "sincronização deve... nunca
  // sobrescrever silenciosamente" é garantido pelo idempotencyKey (ver offlineQueue.js); o
  // próprio evento `online` é só o gatilho de QUANDO tentar, não muda a garantia de segurança.
  useEffect(() => {
    function handleOnline() {
      syncNow();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncNow]);

  // BUG REAL CORRIGIDO (auditoria contratual, rodada 6, 2026-10-07): o listener de `online`
  // só dispara numa TRANSIÇÃO offline→online vivida na mesma aba — nunca dispara se o app é
  // reaberto/recarregado depois que a conexão já tinha voltado (caso mais comum em campo:
  // operário fecha o app offline, reabre depois já conectado). Sem isto, o registro ficava
  // preso na fila até alguém notar o badge e clicar manualmente em "Sincronizar pendentes".
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine && countOfflineRecords(queueName) > 0) {
      syncNow();
    }
    // Só no mount — não queremos retentar a cada render, o listener de `online` e o botão
    // manual já cobrem o resto do ciclo de vida da página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pendingCount, syncing, syncError, syncNow, refreshCount };
}
