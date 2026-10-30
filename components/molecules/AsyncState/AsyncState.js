"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Button from "@/components/atoms/Button/Button";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import SupportCode from "@/components/molecules/SupportCode/SupportCode";
import { UI_STATE, fieldErrorsOf, missingPermissionOf } from "@/lib/asyncState/states";
import { MESSAGES, genericErrorText } from "@/lib/asyncState/messages";
import { buildLoginUrl } from "@/lib/auth/returnTo";
import { fieldErrorId } from "@/lib/asyncState/fields";
import styles from "./AsyncState.module.css";

function ActionButton({ action }) {
  if (!action) return null;
  if (action.href) return <Link className={styles.link} href={action.href}>{action.label}</Link>;
  return <Button size="sm" variant="secondary" onClick={action.onClick}>{action.label}</Button>;
}

function ValidationSummary({ error }) {
  const ref = useRef(null);
  const problems = fieldErrorsOf(error);
  // Resumo no topo com foco (M9-D850 §3.1): quem usa teclado ou leitor de tela cai direto nos erros.
  useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  return (
    <div ref={ref} tabIndex={-1} role="alert" className={styles.summary} data-ui-state={UI_STATE.VALIDATION_ERROR}>
      <p className={styles.title}>{MESSAGES.validationTitle}</p>
      {error && error.message ? <p className={styles.text}>{error.message}</p> : null}
      {problems.length ? (
        <ul className={styles.list}>
          {problems.map((problem) => (
            <li key={`${problem.field}-${problem.message}`}><a href={`#${fieldErrorId(problem.field)}`}>{problem.message || problem.field}</a></li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SessionExpired() {
  useEffect(() => {
    if (typeof window !== "undefined") window.location.href = buildLoginUrl(`${window.location.pathname}${window.location.search}`);
  }, []);
  return <div role="status" className={styles.box} data-ui-state={UI_STATE.SESSION_EXPIRED}><p className={styles.text}>{MESSAGES.sessionExpired}</p></div>;
}

/**
 * Componente único dos estados de UI (M9-D850). Recebe o resultado de useAsyncState/useAsyncAction e escolhe o estado pelo mapa de status HTTP:
 * conteúdo, vazio, erro de validação, acesso negado (nunca vira vazio), sem conexão (com o último dado, marcado "desatualizado"), tentar de novo, sucesso e sessão expirada.
 * `children` pode ser função (recebe o dado) ou nós. Em CONTENT mostra os filhos; nos demais mostra o estado.
 */
export default function AsyncState({ result, onRetry, children, emptyTitle, emptyDescription, emptyAction, successTitle, loadingLabel }) {
  const { status, data, error, traceId, stale } = result || {};
  const retry = onRetry || (result && result.retry);
  const body = typeof children === "function" ? children(data) : children;

  switch (status) {
    case UI_STATE.LOADING:
      if (data !== null && data !== undefined && !Array.isArray(data)) return body;
      return (
        <div role="status" aria-busy="true" className={styles.box} data-ui-state={UI_STATE.LOADING}>
          <Spinner />
          <p className={styles.text}>{loadingLabel || MESSAGES.loading}</p>
        </div>
      );
    case UI_STATE.CONTENT:
      return body;
    case UI_STATE.EMPTY:
      return (
        <div data-ui-state={UI_STATE.EMPTY}>
          <EmptyState title={emptyTitle || MESSAGES.emptyTitle} description={emptyDescription} />
          <div className={styles.actions}><ActionButton action={emptyAction} /></div>
        </div>
      );
    case UI_STATE.VALIDATION_ERROR:
      return <ValidationSummary error={error} />;
    case UI_STATE.PERMISSION_DENIED: {
      const permission = missingPermissionOf(error);
      return (
        <div role="alert" className={styles.box} data-ui-state={UI_STATE.PERMISSION_DENIED}>
          <p className={styles.title}>{MESSAGES.permissionTitle}</p>
          {permission ? <p className={styles.text}>Permissão necessária: <code>{permission}</code></p> : null}
          <p className={styles.text}>{MESSAGES.permissionHelp}</p>
        </div>
      );
    }
    case UI_STATE.OFFLINE:
      return (
        <div data-ui-state={UI_STATE.OFFLINE}>
          <Alert tone="warning" title={MESSAGES.offlineTitle}>{MESSAGES.offlineText}</Alert>
          {data !== null && data !== undefined ? (
            <div className={styles.cached}>
              {stale ? <p className={styles.stale} data-stale="true">Dados {MESSAGES.staleBadge}: o último carregamento foi há mais de um minuto.</p> : null}
              {body}
            </div>
          ) : null}
          <div className={styles.actions}>{retry ? <Button size="sm" onClick={retry}>{MESSAGES.offlineRetryButton}</Button> : null}</div>
        </div>
      );
    case UI_STATE.RETRY:
      return (
        <div data-ui-state={UI_STATE.RETRY}>
          <Alert tone="danger" title={MESSAGES.retryTitle}>{(error && error.message) || genericErrorText(traceId)}</Alert>
          <SupportCode traceId={traceId} />
          <div className={styles.actions}>{retry ? <Button size="sm" onClick={retry}>{MESSAGES.retryButton}</Button> : null}</div>
        </div>
      );
    case UI_STATE.SUCCESS:
      return (
        <div role="status" className={styles.success} data-ui-state={UI_STATE.SUCCESS}>
          {successTitle ? <p className={styles.title}>{successTitle}</p> : null}
          <p className={styles.text}>{result.message}</p>
        </div>
      );
    case UI_STATE.SESSION_EXPIRED:
      return <SessionExpired />;
    case UI_STATE.ERROR:
      return (
        <div data-ui-state={UI_STATE.ERROR}>
          <Alert tone="danger">{genericErrorText(traceId)}</Alert>
          <SupportCode traceId={traceId} />
        </div>
      );
    default:
      return null;
  }
}
