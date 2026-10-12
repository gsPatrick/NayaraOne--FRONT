"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonList } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import StatTile from "@/components/molecules/StatTile/StatTile";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { listPaymentIntents, approvePaymentIntent, executePaymentIntent, cancelPaymentIntent, listFinancialEntries } from "@/lib/api/finance";
import { formatBRL, formatDateTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth/session";
import styles from "./page.module.css";

const STATUS_LABELS = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  EXECUTED: "Executada",
  CANCELLED: "Cancelada",
};

const STATUS_TONE = {
  PENDING: "warning",
  APPROVED: "info",
  EXECUTED: "success",
  CANCELLED: "neutral",
};

export default function IntencoesPagamentoPage() {
  const currentUser = getCurrentUser();
  const [intents, setIntents] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listPaymentIntents(), listFinancialEntries()])
      .then(([pi, fe]) => {
        if (cancelled) return;
        setIntents(pi || []);
        setEntries(fe || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar as intenções de pagamento.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => load(), []);

  function showNotice(tone, text) {
    setNotice({ tone, text });
    window.clearTimeout(showNotice._t);
    showNotice._t = window.setTimeout(() => setNotice(null), 7000);
  }

  function entryFor(intent) {
    return entries.find((e) => e.id === intent.financialEntryId) || null;
  }

  async function handleApprove(intent) {
    if (intent.createdBy && currentUser?.id && intent.createdBy === currentUser.id) {
      showNotice("danger", "Quem criou a intenção não pode aprová-la (segregação de funções — maker-checker).");
      return;
    }
    const ok = await confirm({
      title: "Aprovar esta intenção de pagamento?",
      message: "O hash do lançamento será reconferido contra o momento em que a intenção foi criada. Se algo mudou, a aprovação é recusada.",
      confirmLabel: "Aprovar",
    });
    if (!ok) return;
    setBusyId(intent.id);
    try {
      const updated = await approvePaymentIntent(intent.id);
      setIntents((prev) => prev.map((i) => (i.id === intent.id ? updated : i)));
      showNotice("success", "Intenção aprovada.");
    } catch (err) {
      showNotice("danger", err?.message || "Não foi possível aprovar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleExecute(intent) {
    const ok = await confirm({
      title: "Executar este pagamento?",
      message: "O lançamento será liquidado conforme o snapshot aprovado. Esta ação não pode ser desfeita pelo mesmo fluxo.",
      confirmLabel: "Executar",
      tone: "primary",
    });
    if (!ok) return;
    setBusyId(intent.id);
    try {
      const result = await executePaymentIntent(intent.id);
      const updated = result.intent || result;
      setIntents((prev) => prev.map((i) => (i.id === intent.id ? updated : i)));
      showNotice("success", "Pagamento executado — lançamento liquidado.");
    } catch (err) {
      showNotice("danger", err?.message || "Não foi possível executar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(intent) {
    const ok = await confirm({
      title: "Cancelar esta intenção de pagamento?",
      message: "A intenção será cancelada e não poderá mais ser aprovada nem executada.",
      confirmLabel: "Cancelar intenção",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(intent.id);
    try {
      const updated = await cancelPaymentIntent(intent.id, "Cancelada pelo usuário na tela de intenções de pagamento.");
      setIntents((prev) => prev.map((i) => (i.id === intent.id ? updated : i)));
      showNotice("info", "Intenção cancelada.");
    } catch (err) {
      showNotice("danger", err?.message || "Não foi possível cancelar.");
    } finally {
      setBusyId(null);
    }
  }

  const sorted = useMemo(
    () => [...intents].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)),
    [intents]
  );
  const pendingCount = intents.filter((i) => i.status === "PENDING").length;
  const approvedCount = intents.filter((i) => i.status === "APPROVED").length;
  const executedCount = intents.filter((i) => i.status === "EXECUTED").length;

  return (
    <AppShell title="Intenções de pagamento" backHref="/painel/financeiro">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar">{loadError}</Alert> : null}
      {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

      <p className={styles.intro}>
        Caminho alternativo e mais rigoroso ao par &quot;Solicitar aprovação&quot; + &quot;Liquidar&quot;: cada intenção trava um
        retrato (snapshot) com hash do lançamento no momento em que é criada. Aprovar ou executar recusa automaticamente se o
        lançamento mudou nesse meio tempo (Caderno Técnico §8, ponto 4).
      </p>

      {loading ? (
        <SkeletonList rows={5} />
      ) : (
        <>
          <div className={styles.grid}>
            <StatTile label="Pendentes" value={pendingCount} tone={pendingCount > 0 ? "warning" : "success"} icon="shield" />
            <StatTile label="Aprovadas" value={approvedCount} tone="info" icon="check" />
            <StatTile label="Executadas" value={executedCount} tone="success" icon="money" />
          </div>

          <Card title="Intenções de pagamento" subtitle="Quem criou a intenção não pode aprová-la (maker-checker)">
            {sorted.length === 0 ? (
              <p className={styles.emptyText}>Nenhuma intenção de pagamento criada ainda — crie uma a partir do detalhe de um lançamento PENDING com conta bancária.</p>
            ) : (
              <ul className={styles.list}>
                {sorted.map((intent) => {
                  const entry = entryFor(intent);
                  return (
                    <li key={intent.id} className={styles.row}>
                      <div className={styles.rowInfo}>
                        <span className={styles.rowTitle}>{entry?.description || "Lançamento"}</span>
                        <span className={styles.rowSubtitle}>
                          {entry ? formatBRL(entry.amount) : "—"} · hash {intent.snapshotHash?.slice(0, 10)}… · criada em {formatDateTime(intent.createdAt || intent.created_at)}
                        </span>
                      </div>
                      <div className={styles.rowRight}>
                        <Badge tone={STATUS_TONE[intent.status]}>{STATUS_LABELS[intent.status] || intent.status}</Badge>
                        {intent.status === "PENDING" ? (
                          <>
                            <Button size="sm" onClick={() => handleApprove(intent)} loading={busyId === intent.id}>Aprovar</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleCancel(intent)} loading={busyId === intent.id}>Cancelar</Button>
                          </>
                        ) : null}
                        {intent.status === "APPROVED" ? (
                          <>
                            <Button size="sm" onClick={() => handleExecute(intent)} loading={busyId === intent.id}>
                              <Icon name="check" size={14} /> Executar
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => handleCancel(intent)} loading={busyId === intent.id}>Cancelar</Button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>

      <ConfirmDialog />
    </AppShell>
  );
}
