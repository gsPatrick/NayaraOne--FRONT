"use client";

// FIN-TS-010 (auditoria externa Abacus AI, 11/10/2026): "Fechamento — Tela não encontrada". O
// backend (periodClosures.service.js: fechar um mês trava criação/edição de lançamentos nele;
// reabrir exige motivo e fica auditado) já existia e já tinha teste de service, mas nunca
// ganhou tela — mesma classe de gap da importação de extrato (FIN-TS-007) e do orçamento
// (achado na verificação cética final do Marco 4, 11/10/2026).

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import {
  listPeriodClosures,
  closePeriod,
  reopenPeriod,
  returnPeriodToOpen,
  getPeriodPreconditions,
  confirmPeriodCheck,
  approvePeriodClosure,
} from "@/lib/api/finance";
import { formatDateTime, formatCompetence, humanizeText } from "@/lib/format";
import styles from "./page.module.css";

// Mensagem sempre em português, com competência "MM/AAAA" (a API devolve "AAAA-MM" nos textos).
function msg(err, fallback) {
  const raw = String(err?.message || "").trim();
  if (!raw || /failed to fetch|load failed|networkerror/i.test(raw)) {
    return raw ? "Não foi possível conectar ao servidor. Verifique sua internet e tente de novo." : fallback;
  }
  return humanizeText(raw);
}

function currentReferenceMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const STATUS_LABEL = { OPEN: "Aberto", REVIEW: "Em revisão", CLOSED: "Fechado" };
const STATUS_TONE = { OPEN: "success", REVIEW: "warning", CLOSED: "danger" };
// Conferências humanas do Caderno §16 — as outras três o sistema verifica sozinho.
const HUMAN_CHECKS = {
  THIRD_PARTY_CASH_CHECKED: { checkType: "THIRD_PARTY_CASH", placeholder: "Ex.: saldo da conta de cauções conferido com o extrato do mês." },
  COMMISSIONS_REPASSES_REVIEWED: { checkType: "COMMISSIONS_REPASSES", placeholder: "Ex.: comissões e repasses do mês revisados com o financeiro." },
};

export default function FechamentoPage() {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [closuresLoaded, setClosuresLoaded] = useState(false);

  const [monthToClose, setMonthToClose] = useState(currentReferenceMonth());
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");

  const [checklist, setChecklist] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState("");
  const [checkNotes, setCheckNotes] = useState({});
  const [savingCheck, setSavingCheck] = useState("");
  const [approving, setApproving] = useState(false);

  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState("");

  async function reload() {
    setLoading(true);
    setLoadError("");
    try {
      const items = await listPeriodClosures();
      setClosures(items || []);
      setClosuresLoaded(true);
    } catch (err) {
      setLoadError(msg(err, "Não foi possível carregar os fechamentos."));
    } finally {
      setLoading(false);
    }
  }

  // Só a resposta do pedido mais recente vale: trocar de mês rápido não pode deixar o
  // checklist de um mês aparecer em outro.
  const checklistRequestRef = useRef(0);

  async function loadChecklist(month) {
    if (!month) return;
    const requestId = ++checklistRequestRef.current;
    setChecklistLoading(true);
    setChecklistError("");
    try {
      const result = await getPeriodPreconditions(month);
      if (requestId === checklistRequestRef.current) setChecklist({ ...result, referenceMonth: month });
    } catch (err) {
      if (requestId !== checklistRequestRef.current) return;
      setChecklist(null);
      setChecklistError(msg(err, "Não foi possível carregar as pré-condições do fechamento."));
    } finally {
      if (requestId === checklistRequestRef.current) setChecklistLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    setChecklist(null);
    loadChecklist(monthToClose);
  }, [monthToClose]);

  async function handleClose(e) {
    e.preventDefault();
    setCloseError("");
    setClosing(true);
    try {
      await closePeriod(monthToClose);
      await Promise.all([reload(), loadChecklist(monthToClose)]);
    } catch (err) {
      setCloseError(msg(err, "Falha ao pedir o fechamento do período."));
    } finally {
      setClosing(false);
    }
  }

  async function handleConfirmCheck(code) {
    const note = (checkNotes[code] || "").trim();
    setCloseError("");
    if (!note) {
      setCloseError("Descreva o que foi conferido — a observação é obrigatória e fica registrada no fechamento.");
      return;
    }
    setSavingCheck(code);
    try {
      await confirmPeriodCheck(monthToClose, HUMAN_CHECKS[code].checkType, note);
      setCheckNotes((prev) => ({ ...prev, [code]: "" }));
      await Promise.all([reload(), loadChecklist(monthToClose)]);
    } catch (err) {
      setCloseError(msg(err, "Falha ao registrar a conferência."));
    } finally {
      setSavingCheck("");
    }
  }

  async function handleApprove() {
    setCloseError("");
    setApproving(true);
    try {
      await approvePeriodClosure(monthToClose);
      await Promise.all([reload(), loadChecklist(monthToClose)]);
    } catch (err) {
      setCloseError(msg(err, "Falha ao aprovar o fechamento."));
    } finally {
      setApproving(false);
    }
  }

  // Status do mês: nunca um padrão falso enquanto carrega. Vem do checklist do mês (quando já
  // chegou) ou, antes disso, da lista de fechamentos (leve: mês sem registro = OPEN). Enquanto
  // nenhum dos dois chegou, o status é desconhecido (null) e nenhum botão de ação aparece.
  const checklistForMonth = checklist && checklist.referenceMonth === monthToClose ? checklist : null;
  const periodStatus = checklistForMonth
    ? checklistForMonth.status
    : closuresLoaded && !loading
      ? closures.find((row) => row.referenceMonth === monthToClose)?.status || "OPEN"
      : null;
  const preconditions = checklistForMonth?.preconditions;
  const allOk = Boolean(preconditions?.allOk);

  async function handleReopen(e) {
    e.preventDefault();
    setReopenError("");
    if (!reopenReason.trim()) {
      setReopenError(
        reopenTarget.mode === "RETURN"
          ? "Informe o que precisa ser corrigido — o motivo é obrigatório e fica auditado."
          : "Informe o motivo da reabertura — é obrigatório e fica auditado."
      );
      return;
    }
    setReopening(true);
    try {
      if (reopenTarget.mode === "RETURN") {
        await returnPeriodToOpen(reopenTarget.referenceMonth, reopenReason.trim());
      } else {
        await reopenPeriod(reopenTarget.referenceMonth, reopenReason.trim());
      }
      const month = reopenTarget.referenceMonth;
      setReopenTarget(null);
      setReopenReason("");
      await Promise.all([reload(), month === monthToClose ? loadChecklist(monthToClose) : null]);
    } catch (err) {
      setReopenError(msg(err, reopenTarget.mode === "RETURN" ? "Falha ao devolver o período para aberto." : "Falha ao reabrir o período."));
    } finally {
      setReopening(false);
    }
  }

  const columns = [
    { key: "referenceMonth", label: "Mês", render: (row) => formatCompetence(row.referenceMonth) },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge tone={STATUS_TONE[row.status] || "neutral"}>{STATUS_LABEL[row.status] || row.status}</Badge>,
    },
    { key: "closedAt", label: "Fechado em", render: (row) => (row.closedAt ? formatDateTime(row.closedAt) : "Ainda não fechado") },
    { key: "reopenedAt", label: "Última reabertura", render: (row) => (row.reopenedAt ? formatDateTime(row.reopenedAt) : "Nunca reaberto") },
    { key: "reopenReason", label: "Motivo da reabertura", render: (row) => row.reopenReason || (row.reopenedAt ? "Motivo não informado" : "Não se aplica") },
    {
      key: "returnToOpenReason",
      label: "Última devolução da revisão",
      render: (row) => (row.returnedToOpenAt ? `${formatDateTime(row.returnedToOpenAt)} — ${row.returnToOpenReason || "motivo não informado"}` : "Nunca devolvido"),
    },
    {
      key: "actions",
      label: "Ações",
      render: (row) =>
        row.status === "CLOSED" ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setReopenTarget({ referenceMonth: row.referenceMonth, mode: "REOPEN" })}>
            Reabrir
          </Button>
        ) : row.status === "REVIEW" ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setReopenTarget({ referenceMonth: row.referenceMonth, mode: "RETURN" })}>
            Devolver para aberto
          </Button>
        ) : "Aberto — feche pelo pedido de revisão",
    },
  ];

  return (
    <AppShell title="Fechamento de período" backHref="/painel/financeiro">
      <div className={styles.wrap}>
        {loadError ? (
          <Alert tone="danger">
            {loadError}{" "}
            <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={reload}>
              Tentar de novo
            </Button>
          </Alert>
        ) : null}

        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Fechar um mês</h2>
          <p className={styles.helper}>
            Antes de fechar, o mês precisa estar conferido: extratos importados, conciliação e
            excedentes resolvidos, caixa de terceiros conferido e comissões/repasses revisados.
            Depois de fechado, nenhum lançamento daquele mês pode ser criado ou editado até o
            período ser reaberto com motivo.
          </p>
          <div className={styles.monthRow}>
            <FormField label="Mês de referência" htmlFor="monthToClose">
              <Input id="monthToClose" type="month" value={monthToClose} onChange={(e) => setMonthToClose(e.target.value)} />
            </FormField>
            {periodStatus ? (
              <Badge tone={STATUS_TONE[periodStatus] || "neutral"}>{STATUS_LABEL[periodStatus] || periodStatus}</Badge>
            ) : (
              <Badge tone="neutral">Carregando…</Badge>
            )}
          </div>

          {checklistError ? (
            <Alert tone="danger">
              {checklistError}{" "}
              <Button type="button" size="sm" variant="secondary" disabled={checklistLoading} onClick={() => loadChecklist(monthToClose)}>
                Tentar de novo
              </Button>
            </Alert>
          ) : null}
          {checklistLoading && !preconditions ? <p className={styles.helper}>Carregando as pré-condições...</p> : null}

          {preconditions ? (
            <ul className={styles.checklist}>
              {preconditions.items.map((item) => {
                const human = HUMAN_CHECKS[item.code];
                const canConfirm = human && !item.ok && periodStatus === "OPEN";
                return (
                  <li key={item.code} className={styles.checkItem}>
                    <div className={styles.checkHeader}>
                      <span className={styles.checkLabel}>{humanizeText(item.label)}</span>
                      <Badge tone={item.ok ? "success" : "warning"}>{item.ok ? "Ok" : "Pendente"}</Badge>
                    </div>
                    <p className={styles.checkDetail}>{humanizeText(item.detail)}</p>
                    {canConfirm ? (
                      <div className={styles.checkForm}>
                        <textarea
                          className={styles.textarea}
                          rows={2}
                          placeholder={human.placeholder}
                          value={checkNotes[item.code] || ""}
                          onChange={(e) => setCheckNotes((prev) => ({ ...prev, [item.code]: e.target.value }))}
                          aria-label={`Observação — ${item.label}`}
                        />
                        <Button type="button" size="sm" variant="secondary" disabled={savingCheck === item.code} onClick={() => handleConfirmCheck(item.code)}>
                          {savingCheck === item.code ? "Registrando..." : "Registrar conferência"}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {periodStatus === "OPEN" ? (
            <form onSubmit={handleClose} className={styles.inlineForm}>
              <Button type="submit" disabled={closing || !preconditions || !allOk}>
                {closing ? "Enviando..." : "Pedir fechamento"}
              </Button>
              {!allOk && preconditions ? (
                <p className={styles.helper}>Resolva os itens pendentes acima para pedir o fechamento.</p>
              ) : null}
            </form>
          ) : null}

          {periodStatus === "REVIEW" ? (
            <div className={styles.inlineForm}>
              <p className={styles.helper}>
                Fechamento pedido. A aprovação precisa ser feita por outra pessoa, com verificação em duas etapas recente.
              </p>
              <div className={styles.reopenActions}>
                <Button type="button" disabled={approving || !preconditions || !allOk} onClick={handleApprove}>
                  {approving ? "Aprovando..." : "Aprovar fechamento"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setReopenTarget({ referenceMonth: monthToClose, mode: "RETURN" })}>
                  Devolver para aberto
                </Button>
              </div>
              <p className={styles.helper}>
                Se algo mudou depois do pedido (conferência desatualizada, lançamento a corrigir), devolva o
                período para aberto com o motivo: as conferências são refeitas e o fechamento é pedido de novo.
              </p>
            </div>
          ) : null}

          {periodStatus === "CLOSED" && checklist?.snapshot ? (
            <p className={styles.helper}>
              Fechado com retrato do mês gravado em {formatDateTime(checklist.snapshot.created_at || checklist.snapshot.createdAt)} —
              código de verificação {checklist.snapshot.snapshotHash.slice(0, 16)}.
            </p>
          ) : null}

          {closeError ? <Alert tone="danger">{closeError}</Alert> : null}
        </Card>

        {reopenTarget ? (
          <Card className={styles.formCard}>
            <h2 className={styles.sectionTitle}>
              {reopenTarget.mode === "RETURN" ? "Devolver para aberto" : "Reabrir"} {formatCompetence(reopenTarget.referenceMonth)}
            </h2>
            <form onSubmit={handleReopen} className={styles.inlineForm}>
              <p className={styles.helper}>
                {reopenTarget.mode === "RETURN"
                  ? "Devolver o fechamento para aberto exige motivo, permissão de aprovação e verificação em duas etapas (MFA) recente."
                  : "Reabrir um mês fechado exige motivo, permissão de aprovação e verificação em duas etapas (MFA) recente. Se você ainda não verificou o MFA há pouco tempo, o sistema pede o código ao confirmar."}
              </p>
              <FormField label="Motivo (obrigatório, fica auditado)" htmlFor="reopenReason">
                <textarea
                  id="reopenReason"
                  className={styles.textarea}
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                />
              </FormField>
              <div className={styles.reopenActions}>
                <Button type="submit" disabled={reopening}>
                  {reopening
                    ? "Enviando..."
                    : reopenTarget.mode === "RETURN"
                      ? "Confirmar devolução"
                      : "Confirmar reabertura"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setReopenTarget(null);
                    setReopenReason("");
                    setReopenError("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
              {reopenError ? <Alert tone="danger">{reopenError}</Alert> : null}
            </form>
          </Card>
        ) : null}

        <Card>
          <h2 className={styles.sectionTitle}>Histórico de fechamentos</h2>
          <Table columns={columns} rows={closures} loading={loading} emptyMessage="Nenhum período fechado ainda." />
        </Card>
      </div>

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
