"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Alert from "@/components/molecules/Alert/Alert";
import { UI_STATE } from "@/lib/asyncState/states";
import { MESSAGES, genericErrorText } from "@/lib/asyncState/messages";
import { missingPermissionText } from "@/lib/rbac/permissionName";
import { clearLookupProblems, getLookupProblems, subscribeLookupProblems } from "@/lib/asyncState/lookup";

/** Texto do aviso de uma lista auxiliar que não carregou (M9-D850): nunca "vazio", sempre o motivo. */
export function lookupProblemText(problem) {
  switch (problem.state) {
    case UI_STATE.PERMISSION_DENIED:
      return `Não foi possível carregar ${problem.label}. ${MESSAGES.permissionTitle}${problem.permission ? ` ${missingPermissionText(problem.permission)}` : ""} ${MESSAGES.permissionHelp}.`;
    case UI_STATE.OFFLINE:
      return `Não foi possível carregar ${problem.label}. ${MESSAGES.offlineText}`;
    case UI_STATE.RETRY:
      return `Não foi possível carregar ${problem.label} agora. Atualize a página para tentar novamente.${problem.traceId ? ` Código de suporte: ${problem.traceId}.` : ""}`;
    default:
      return `Não foi possível carregar ${problem.label}. ${genericErrorText(problem.traceId)}`;
  }
}

export function LookupProblemsList({ problems }) {
  if (!problems.length) return null;
  return (
    <div data-lookup-problems="true">
      {problems.map((problem) => (
        <Alert key={problem.label} tone={problem.state === UI_STATE.PERMISSION_DENIED ? "warning" : "danger"}>{lookupProblemText(problem)}</Alert>
      ))}
    </div>
  );
}

/** Montado uma vez no AppShell: mostra as falhas de listas auxiliares da tela atual e as limpa ao trocar de rota. */
export default function LookupProblems() {
  const problems = useSyncExternalStore(subscribeLookupProblems, getLookupProblems, getLookupProblems);
  const pathname = usePathname();
  useEffect(() => { clearLookupProblems(); }, [pathname]);
  return <LookupProblemsList problems={problems} />;
}
