"use client";

import { useMemo, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import NatureBadge from "@/components/molecules/NatureBadge/NatureBadge";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import { getBankName } from "@/lib/mock/banks";
import { maskAccountNumber } from "@/lib/mask";
import {
  FINANCIAL_ENTRIES,
  BANK_ACCOUNTS,
  COST_CENTERS,
  RESULT_CENTERS,
  RECONCILIATIONS,
  BANK_TRANSACTIONS,
  ENTRY_NATURE_LABELS,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_TONE,
  BANK_ACCOUNT_STATUS_LABELS,
  BANK_ACCOUNT_STATUS_TONE,
  isEntryOverdue,
  isBankAccountEligibleForPayment,
  bankAccountCooldownRemainingHours,
} from "@/lib/mock/finance";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function LancamentoDetailPage({ params }) {
  const router = useRouter();
  const source = FINANCIAL_ENTRIES.find((e) => e.id === params.id);
  const [entry, setEntry] = useState(() => (source ? { ...source } : null));
  const [notice, setNotice] = useState(null);

  const account = BANK_ACCOUNTS.find((a) => a.id === entry?.bankAccountId) || null;
  const costCenter = COST_CENTERS.find((c) => c.id === entry?.costCenterId) || null;
  const resultCenter = RESULT_CENTERS.find((r) => r.id === entry?.resultCenterId) || null;
  const reconciliation = RECONCILIATIONS.find((r) => r.financialEntryId === entry?.id) || null;
  const reconciledTransaction = reconciliation ? BANK_TRANSACTIONS.find((t) => t.id === reconciliation.bankTransactionId) : null;
  const reversalTarget = entry?.reversalOfEntryId ? FINANCIAL_ENTRIES.find((e) => e.id === entry.reversalOfEntryId) : null;
  const reversedBy = useMemo(() => FINANCIAL_ENTRIES.find((e) => e.reversalOfEntryId === entry?.id) || null, [entry]);

  if (!source || !entry) return notFound();

  function handleSettle() {
    if (entry.status !== "PENDING") return;
    if (account && !isBankAccountEligibleForPayment(account)) {
      if (account.status === "BLOCKED") setNotice({ tone: "danger", text: "Esta conta bancária está bloqueada para pagamentos (antifraude)." });
      else setNotice({ tone: "warning", text: `Conta em resfriamento — faltam ${bankAccountCooldownRemainingHours(account)}h para ficar elegível.` });
      return;
    }
    setEntry((prev) => ({ ...prev, status: "SETTLED", settledAt: new Date().toISOString() }));
    setNotice({ tone: "success", text: "Lançamento liquidado com sucesso." });
  }

  function handleReverse() {
    if (entry.status !== "SETTLED") return;
    setEntry((prev) => ({ ...prev, status: "REVERSED" }));
    setNotice({ tone: "info", text: "Lançamento estornado — um lançamento compensatório foi criado (o original nunca é editado, ledger imutável)." });
  }

  return (
    <AppShell title={entry.description} backHref="/painel/financeiro/lancamentos">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={ENTRY_STATUS_TONE[entry.status]}>{ENTRY_STATUS_LABELS[entry.status]}</Badge>
            <NatureBadge nature={entry.nature} />
            {isEntryOverdue(entry) ? <Badge tone="danger">Vencida</Badge> : null}
          </div>
          <div className={styles.actions}>
            {entry.status === "PENDING" ? (
              <Button onClick={handleSettle}><Icon name="check" size={16} /> Liquidar</Button>
            ) : null}
            {entry.status === "SETTLED" ? (
              <Button variant="secondary" onClick={handleReverse}><Icon name="settings" size={16} /> Estornar</Button>
            ) : null}
          </div>
        </div>

        {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Detalhes do lançamento">
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Valor</dt><dd className={styles.amount}>{formatBRL(entry.amount)}</dd></div>
                <div className={styles.detailRow}><dt>Tipo</dt><dd>{entry.entryType === "DEBIT" ? "Débito" : "Crédito"}</dd></div>
                <div className={styles.detailRow}><dt>Natureza</dt><dd><NatureBadge nature={entry.nature} /></dd></div>
                <div className={styles.detailRow}><dt>Vencimento</dt><dd>{entry.dueAt ? formatDate(entry.dueAt) : "—"}</dd></div>
                <div className={styles.detailRow}><dt>Liquidado em</dt><dd>{entry.settledAt ? formatDateTime(entry.settledAt) : "—"}</dd></div>
                <div className={styles.detailRow}><dt>Centro de custo</dt><dd>{costCenter ? `${costCenter.code} — ${costCenter.name}` : "—"}</dd></div>
                <div className={styles.detailRow}><dt>Centro de resultado</dt><dd>{resultCenter ? `${resultCenter.code} — ${resultCenter.name}` : "—"}</dd></div>
                <div className={styles.detailRow}><dt>Chave de idempotência</dt><dd>{entry.idempotencyKey || "—"}</dd></div>
                <div className={styles.detailRow}><dt>ID</dt><dd className={styles.mono}>{entry.id}</dd></div>
              </dl>
            </Card>

            {reversalTarget || reversedBy ? (
              <Card title="Histórico de estorno" subtitle="Ledger imutável — correções nunca editam o lançamento original">
                {reversalTarget ? (
                  <div className={styles.linkRow} onClick={() => router.push(`/painel/financeiro/lancamentos/${reversalTarget.id}`)}>
                    <Icon name="document" size={16} />
                    <span>Este lançamento é o estorno de <strong>{reversalTarget.description}</strong> ({formatBRL(reversalTarget.amount)})</span>
                  </div>
                ) : null}
                {reversedBy ? (
                  <div className={styles.linkRow} onClick={() => router.push(`/painel/financeiro/lancamentos/${reversedBy.id}`)}>
                    <Icon name="document" size={16} />
                    <span>Foi estornado por <strong>{reversedBy.description}</strong> em {formatDateTime(reversedBy.settledAt)}</span>
                  </div>
                ) : null}
              </Card>
            ) : null}

            <Card title="Conciliação bancária">
              {reconciliation && reconciledTransaction ? (
                <div className={styles.linkRow}>
                  <Icon name="check" size={16} />
                  <div>
                    <p className={styles.reconLine}>Conciliado com <strong>{reconciledTransaction.description}</strong> ({formatBRL(reconciledTransaction.amount)})</p>
                    <p className={styles.reconMeta}>em {formatDateTime(reconciliation.matchedAt)}</p>
                  </div>
                </div>
              ) : (
                <p className={styles.emptyText}>Este lançamento ainda não foi conciliado com nenhuma transação de extrato.</p>
              )}
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card title="Conta bancária">
              {account ? (
                <div className={styles.accountBlock}>
                  <div className={styles.accountBankRow}>
                    <BankLogo bankCode={account.bankCode} size={32} />
                    <div>
                      <span className={styles.listRowTitle}>{account.label}</span>
                      <span className={styles.listRowSubtitle}>
                        {account.bankCode ? `${getBankName(account.bankCode)} · Ag. ${account.agency} · Conta ${maskAccountNumber(account.accountNumber)}` : "Chave PIX"}
                      </span>
                    </div>
                  </div>
                  <Badge tone={BANK_ACCOUNT_STATUS_TONE[account.status]}>{BANK_ACCOUNT_STATUS_LABELS[account.status]}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => router.push(`/painel/financeiro/contas-bancarias/${account.id}`)}>
                    Ver conta
                  </Button>
                </div>
              ) : (
                <p className={styles.emptyText}>Sem conta vinculada.</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
