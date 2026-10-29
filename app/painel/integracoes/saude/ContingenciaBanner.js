"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/molecules/Alert/Alert";
import { listActiveContingencies } from "@/lib/api/integrations";

import { reportLookupProblem } from "@/lib/asyncState/lookup";
// Faixa de aviso da contingência (Marco 9, M9-D226): uma linha por integração (ou família sem integração ativa) que está no plano B.
const MODO_LABEL = {
  QUEUE_AND_ALTERNATE: "os pedidos esperam na fila e seguem pelo canal alternativo",
  KEEP_INTERNAL_AND_REPROCESS: "o dado fica guardado aqui e é reprocessado quando o portal voltar",
  PRESERVE_AND_ALTERNATE_FLOW: "o processo preserva o estado e segue pelo fluxo alternativo",
  NO_ASSUME_AND_QUERY: "nenhum pagamento é dado como pago: o banco é consultado antes de qualquer reenvio",
  DEGRADE_TO_DETERMINISTIC: "as funções seguem pelo caminho sem IA",
  QUEUE_QUERY_OR_ALTERNATE_PROVIDER: "os casos esperam, são consultados no provider ou seguem pelo provider alternativo",
};
const MOTIVO_LABEL = {
  CIRCUIT_OPEN: "disjuntor aberto", AUTH_FAILED: "credencial recusada", PAUSED: "integração pausada", NO_ACTIVE_CONNECTION: "sem integração ativa",
  HEALTH_DOWN: "fora do ar nos testes de saúde", QUEUE_AGE_EXCEEDED: "fila acima do prazo",
};

export default function ContingenciaBanner() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    listActiveContingencies()
      .then((data) => { if (!cancelled) setItems(Array.isArray(data) ? data : []); })
      .catch((error) => { reportLookupProblem("os avisos de contingência", error); if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  if (!items.length) return null;
  return (
    <>
      {items.map((item) => (
        <Alert key={item.id} tone="warning" title={`Contingência ativa: ${item.providerCode || `família ${item.domain}`}`}>
          {`Motivo: ${item.reasons.map((r) => MOTIVO_LABEL[r] || r).join(", ") || "não informado"}. Plano B: ${MODO_LABEL[item.mode] || item.mode}. O que passar do prazo na fila vira tarefa manual.`}
        </Alert>
      ))}
    </>
  );
}
