"use client";

// Aviso de falha de RECARGA (M9-D850): a tela já tem dado em mãos (ficha aberta, lista após uma ação) e a recarga falhou.
// O dado antigo continua na tela, mas a falha nunca fica em silêncio: aparece este Alert com "Tentar novamente".
import Alert from "@/components/molecules/Alert/Alert";
import Button from "@/components/atoms/Button/Button";
import SupportCode from "@/components/molecules/SupportCode/SupportCode";
import { UI_STATE } from "@/lib/asyncState/states";
import { MESSAGES, genericErrorText, businessMessageOf } from "@/lib/asyncState/messages";

const FAILED = new Set([UI_STATE.RETRY, UI_STATE.OFFLINE, UI_STATE.PERMISSION_DENIED, UI_STATE.ERROR]);

/** true quando o resultado do useAsyncState é uma falha que merece o aviso de recarga. */
export function isReloadFailure(status) {
  return FAILED.has(status);
}

export default function ReloadAlert({ result, onRetry }) {
  const { status, error, traceId } = result || {};
  if (!isReloadFailure(status)) return null;
  const retry = onRetry || (result && (result.reload || result.retry));
  const offline = status === UI_STATE.OFFLINE;
  const denied = status === UI_STATE.PERMISSION_DENIED;
  const title = denied ? MESSAGES.permissionTitle : offline ? MESSAGES.offlineTitle : MESSAGES.retryTitle;
  const text = offline ? MESSAGES.offlineText : denied ? `${MESSAGES.permissionHelp}.` : businessMessageOf(error) || genericErrorText(traceId);
  return (
    <div data-ui-state={status} data-reload-failure="true">
      <Alert tone={offline ? "warning" : "danger"} title={title}>{text} Os dados mostrados podem estar desatualizados.</Alert>
      {denied ? null : <SupportCode traceId={traceId} />}
      {retry && !denied ? <div><Button size="sm" onClick={retry}>{MESSAGES.retryButton}</Button></div> : null}
    </div>
  );
}
