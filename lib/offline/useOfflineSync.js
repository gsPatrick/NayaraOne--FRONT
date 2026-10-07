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

  return { pendingCount, syncing, syncError, syncNow, refreshCount };
}
