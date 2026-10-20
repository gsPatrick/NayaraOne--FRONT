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
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import {
  listPaymentIntents,
  approvePaymentIntent,
  executePaymentIntent,
  cancelPaymentIntent,
  listFinancialEntries,
  listBankAccounts,
  reconcilePaymentIntent,
  resolveUncertainPaymentIntent,
} from "@/lib/api/finance";
import { listPeople } from "@/lib/api/people";
import { formatBRL, formatDateTime, humanizeText } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth/session";
import styles from "./page.module.css";

const STATUS_LABELS = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  // B1/B2 (revisão 18/10/2026): SUBMITTING = enviada ao banco sem resposta confiável (incerta).
  SUBMITTING: "Envio ao banco incerto",
  SUBMITTED: "Em trânsito no banco",
  EXECUTED: "Executada",
  FAILED: "Falhou no banco",
  CANCELLED: "Cancelada",
};

const STATUS_TONE = {
  PENDING: "warning",
  APPROVED: "info",
  SUBMITTING: "danger",
  SUBMITTED: "warning",
  EXECUTED: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

// Mensagem sempre em português e sem texto técnico.
function msg(err, fallback) {
  const raw = String(err?.message || "").trim();
  if (!raw) return fallback;
  if (/failed to fetch|load failed|networkerror/i.test(raw)) return "Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.";
  return humanizeText(raw);
}

// Intenção cancelada porque o lançamento mudou depois da aprovação (troca de conta, valor, vencimento...).
function isInvalidated(intent) {
  return intent.status === "CANCELLED" && /alterad|invalidad/i.test(intent.cancelReason || "");
}

// Conta mascarada: só os 4 últimos dígitos da conta aparecem.
function maskedAccount(account) {
  if (!account) return "conta não encontrada";
  const bank = account.bankName || (account.bankCode ? `banco ${account.bankCode}` : "banco não informado");
  const number = String(account.accountNumber || "");
  const tail = number ? `conta final ${number.slice(-4)}` : account.pixKey ? "chave PIX cadastrada" : "conta sem número";
  return `${bank} · ag. ${account.agency || "sem agência"} · ${tail}`;
}

const RECONCILE_OUTCOME_LABELS = {
  CONFIRMED: "o banco confirmou o pagamento e o lançamento foi liquidado.",
  NOT_UNCERTAIN: "esta intenção não estava mais em trânsito.",
  STILL_UNCERTAIN: "o banco ainda não deu resposta definitiva.",
  BANK_UNREACHABLE: "o banco não respondeu — tente de novo mais tarde.",
  PENDING_EXTERNAL: "o banco informa que o pagamento ainda está em processamento.",
  PROCESSING: "o banco informa que o pagamento ainda está em processamento.",
  REJECTED: "o banco recusou o pagamento.",
  FAILED: "o banco informou falha no pagamento.",
};

export default function IntencoesPagamentoPage() {
  const currentUser = getCurrentUser();
  const [intents, setIntents] = useState([]);
  const [entries, setEntries] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rowResult, setRowResult] = useState({});
  // B2 — resolver a incerteza de um envio ao banco exige motivo (e só dá como falha com
  // resposta final do banco).
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveReason, setResolveReason] = useState("");
  const [resolveError, setResolveError] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    // Contas e pessoas só enriquecem o favorecido: se falharem, a lista continua aparecendo.
    Promise.all([listPaymentIntents(), listFinancialEntries(), listBankAccounts().catch(() => []), listPeople().catch(() => [])])
      .then(([pi, fe, ba, pp]) => {
        if (cancelled) return;
        setIntents(pi || []);
        setEntries(fe || []);
        setBankAccounts(ba || []);
        setPeople(pp || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(msg(err, "Não foi possível carregar as intenções de pagamento."));
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

  // Favorecido do retrato: a conta que valia quando a intenção foi criada (não a atual do lançamento).
  function beneficiaryOf(intent) {
    const accountId = intent.snapshotJson?.bankAccountId || intent.bankAccountId || null;
    if (!accountId) return { owner: "Favorecido não definido no retrato", account: "sem conta bancária no retrato" };
    const account = bankAccounts.find((a) => a.id === accountId) || null;
    const person = account?.ownerPersonId ? people.find((p) => p.id === account.ownerPersonId) : null;
    return { owner: person?.legalName || "Titular da conta não informado", account: maskedAccount(account) };
  }

  async function handleApprove(intent) {
    if (intent.createdBy && currentUser?.id && intent.createdBy === currentUser.id) {
      showNotice("danger", "Quem criou a intenção não pode aprová-la: a aprovação precisa ser de outra pessoa.");
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
      showNotice("danger", msg(err, "Não foi possível aprovar."));
    } finally {
      setBusyId(null);
    }
  }

  // A4 (revisão 18/10/2026): registrar o pagamento feito fora do banco usa o comprovante
  // ANEXADO ao lançamento antes da aprovação da intenção — quem aprova vê o arquivo.
  async function handleExecute(intent) {
    const entry = entryFor(intent);
    if (!entry?.settlementEvidenceFileId) {
      showNotice(
        "danger",
        "Anexe o comprovante no detalhe do lançamento antes. A intenção precisa ser aprovada depois do comprovante — cancele esta e crie outra após anexar."
      );
      return;
    }
    const ok = await confirm({
      title: "Registrar pagamento com o comprovante anexado?",
      message: `O lançamento será dado como pago por baixa manual com o comprovante anexado (motivo: ${entry.settlementReason || "não informado"}) — não como confirmação do banco. A conciliação com o extrato continua necessária.`,
      confirmLabel: "Registrar",
      tone: "primary",
    });
    if (!ok) return;
    setBusyId(intent.id);
    try {
      const result = await executePaymentIntent(intent.id);
      const updated = result.intent || result;
      setIntents((prev) => prev.map((i) => (i.id === intent.id ? updated : i)));
      showNotice("success", "Pagamento registrado com o comprovante anexado.");
    } catch (err) {
      showNotice("danger", msg(err, "Não foi possível registrar o pagamento."));
    } finally {
      setBusyId(null);
    }
  }

  // M45-RECONF F2: a consulta devolvia 404 (roteamento do id externo ausente) e o aviso só
  // aparecia no topo da página, fora da vista. Agora o resultado aparece também na própria linha
  // e o aviso do topo é trazido para a vista.
  async function handleReconcile(intent) {
    setBusyId(intent.id);
    try {
      const result = await reconcilePaymentIntent(intent.id);
      const updated = result?.intent || intent;
      setIntents((prev) => prev.map((i) => (i.id === intent.id ? updated : i)));
      const label = STATUS_LABELS[updated.status] || "situação não reconhecida";
      const outcomeText = RECONCILE_OUTCOME_LABELS[result?.outcome] || "O banco respondeu.";
      const text = `Banco consultado em ${formatDateTime(new Date())}: ${outcomeText} Situação atual: ${label}.`;
      const tone = updated.status === "EXECUTED" ? "success" : updated.status === "FAILED" ? "danger" : "info";
      setRowResult((prev) => ({ ...prev, [intent.id]: { tone, text } }));
      showNotice(tone, text);
      if (updated.status === "EXECUTED") load();
    } catch (err) {
      const text = msg(err, "Não foi possível consultar o banco.");
      setRowResult((prev) => ({ ...prev, [intent.id]: { tone: "danger", text } }));
      showNotice("danger", text);
    } finally {
      setBusyId(null);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function confirmResolve() {
    const intent = resolveTarget;
    if (!resolveReason.trim()) {
      setResolveError("Informe o motivo.");
      return;
    }
    setBusyId(intent.id);
    try {
      const result = await resolveUncertainPaymentIntent(intent.id, resolveReason.trim());
      const updated = result?.intent || intent;
      setIntents((prev) => prev.map((i) => (i.id === intent.id ? updated : i)));
      setResolveTarget(null);
      showNotice("info", `Situação resolvida com o banco: ${STATUS_LABELS[updated.status] || updated.status}.`);
    } catch (err) {
      setResolveError(msg(err, "Não foi possível resolver a incerteza."));
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
      showNotice("danger", msg(err, "Não foi possível cancelar."));
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
  const inBankCount = intents.filter((i) => i.status === "SUBMITTING" || i.status === "SUBMITTED").length;
  // M45 F9: filtro por situação — inclui SUBMITTING/SUBMITTED mesmo sem itens (contagem 0),
  // para o operador saber que esses estados existem e onde aparecem.
  const visible = statusFilter ? sorted.filter((i) => i.status === statusFilter) : sorted;

  return (
    <AppShell title="Intenções de pagamento" backHref="/painel/financeiro">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar">{loadError}</Alert> : null}
      {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

      <p className={styles.intro}>
        Caminho alternativo e mais rigoroso ao par &quot;Solicitar aprovação&quot; + &quot;Liquidar&quot;: cada intenção trava um
        retrato do lançamento (valor, favorecido e conta) com um código de verificação no momento em que é criada. Se o
        lançamento mudar depois, a intenção é invalidada e é preciso criar outra.
      </p>

      {loading ? (
        <SkeletonList rows={5} />
      ) : (
        <>
          <div className={styles.grid}>
            <StatTile label="Pendentes" value={pendingCount} tone={pendingCount > 0 ? "warning" : "success"} icon="shield" />
            <StatTile label="Aprovadas" value={approvedCount} tone="info" icon="check" />
            <StatTile label="No banco (em trânsito/incertas)" value={inBankCount} tone={inBankCount > 0 ? "warning" : "success"} icon="clock" />
            <StatTile label="Executadas" value={executedCount} tone="success" icon="money" />
          </div>

          <div className={styles.filters} role="group" aria-label="Filtrar por situação">
            {[["", "Todas"], ...Object.entries(STATUS_LABELS)].map(([value, label]) => {
              const count = value ? intents.filter((i) => i.status === value).length : intents.length;
              return (
                <Button
                  key={value || "ALL"}
                  size="sm"
                  variant={statusFilter === value ? "primary" : "secondary"}
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                >
                  {label} ({count})
                </Button>
              );
            })}
          </div>

          {resolveTarget ? (
            <Card
              title="Resolver envio incerto ao banco"
              subtitle="O banco é consultado de novo. A intenção só é dada como falha se o banco responder falha ou não conhecer o pagamento — nunca sem resposta do banco. Esta ação exige verificação em duas etapas (MFA) recente: se for preciso, o código será pedido ao confirmar."
            >
              {resolveError ? <Alert tone="danger">{resolveError}</Alert> : null}
              <FormField label="Motivo" required>
                <Input value={resolveReason} onChange={(e) => setResolveReason(e.target.value)} placeholder="Ex.: banco fora do ar no envio de 18/10, conferido com o gerente" />
              </FormField>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <Button variant="secondary" onClick={() => setResolveTarget(null)}>Cancelar</Button>
                <Button onClick={confirmResolve} loading={busyId === resolveTarget.id}>Consultar banco e resolver</Button>
              </div>
            </Card>
          ) : null}

          <Card title="Intenções de pagamento" subtitle="Quem criou a intenção não pode aprová-la: a aprovação é sempre de outra pessoa">
            {visible.length === 0 ? (
              <p className={styles.emptyText}>
                {statusFilter
                  ? `Nenhuma intenção na situação "${STATUS_LABELS[statusFilter]}".`
                  : "Nenhuma intenção de pagamento criada ainda — crie uma a partir do detalhe de um lançamento pendente com conta bancária."}
              </p>
            ) : (
              <ul className={styles.list}>
                {visible.map((intent) => {
                  const entry = entryFor(intent);
                  const beneficiary = beneficiaryOf(intent);
                  const invalidated = isInvalidated(intent);
                  return (
                    <li key={intent.id} className={styles.row}>
                      <div className={styles.rowInfo}>
                        <span className={styles.rowTitle}>{humanizeText(entry?.description) || "Lançamento"}</span>
                        <span className={styles.rowSubtitle}>
                          {formatBRL(intent.snapshotJson?.amount ?? entry?.amount)} · código de verificação {intent.snapshotHash?.slice(0, 10)}… · criada em {formatDateTime(intent.createdAt || intent.created_at)}
                        </span>
                        <span className={styles.rowSubtitle}>
                          Favorecido no retrato: {beneficiary.owner} · {beneficiary.account}
                        </span>
                        {invalidated ? (
                          <Alert tone="warning">
                            Invalidada: lançamento alterado após a aprovação.{" "}
                            {intent.cancelReason ? humanizeText(intent.cancelReason) : "Crie uma nova intenção sobre a versão atual."}
                          </Alert>
                        ) : null}
                        {rowResult[intent.id] ? (
                          <Alert tone={rowResult[intent.id].tone}>{rowResult[intent.id].text}</Alert>
                        ) : null}
                      </div>
                      <div className={styles.rowRight}>
                        <Badge tone={invalidated ? "warning" : STATUS_TONE[intent.status]}>{invalidated ? "Invalidada" : STATUS_LABELS[intent.status] || "Situação não reconhecida"}</Badge>
                        {intent.status === "PENDING" ? (
                          <>
                            <Button size="sm" onClick={() => handleApprove(intent)} loading={busyId === intent.id}>Aprovar</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleCancel(intent)} loading={busyId === intent.id}>Cancelar</Button>
                          </>
                        ) : null}
                        {["SUBMITTING", "SUBMITTED"].includes(intent.status) ? (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => handleReconcile(intent)} loading={busyId === intent.id}>Consultar banco</Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => { setResolveTarget(intent); setResolveReason(""); setResolveError(""); }}
                              loading={busyId === intent.id}
                            >
                              Resolver incerteza
                            </Button>
                          </>
                        ) : null}
                        {intent.status === "APPROVED" ? (
                          <>
                            <Button size="sm" onClick={() => handleExecute(intent)} loading={busyId === intent.id}>
                              <Icon name="check" size={14} /> Registrar pagamento
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
