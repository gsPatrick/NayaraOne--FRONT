"use client";

// Cartões de apoio da ficha: histórico de estorno (ledger imutável), conciliação bancária e conta bancária do lançamento.
import { useRouter } from "next/navigation";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import ProtectedValue from "@/components/molecules/ProtectedValue/ProtectedValue";
import { getBankName } from "@/lib/mock/banks";
import { maskAccountNumber } from "@/lib/mask";
import { BANK_ACCOUNT_STATUS_LABELS, BANK_ACCOUNT_STATUS_TONE } from "@/lib/mock/finance";
import { formatBRL, formatDateTime, humanizeText } from "@/lib/format";
import { activatable } from "@/lib/a11y/keyboard";
import styles from "./page.module.css";

export function ReversalHistoryCard({ reversalTarget, reversedBy }) {
  const router = useRouter();
  if (!reversalTarget && !reversedBy) return null;
  return (
    <Card title="Histórico de estorno" subtitle="Ledger imutável — correções nunca editam o lançamento original">
      {reversalTarget ? (
        <div className={styles.linkRow} {...activatable(() => router.push(`/painel/financeiro/lancamentos/${reversalTarget.id}`))}>
          <Icon name="document" size={16} />
          <span>Este lançamento é o estorno de <strong>{humanizeText(reversalTarget.description)}</strong> ({formatBRL(reversalTarget.amount)})</span>
        </div>
      ) : null}
      {reversedBy ? (
        <div className={styles.linkRow} {...activatable(() => router.push(`/painel/financeiro/lancamentos/${reversedBy.id}`))}>
          <Icon name="document" size={16} />
          <span>Foi estornado por <strong>{humanizeText(reversedBy.description)}</strong> em {formatDateTime(reversedBy.settledAt)}</span>
        </div>
      ) : null}
    </Card>
  );
}

export function ReconciliationCard({ reconciliation, reconciledTransaction }) {
  return (
    <Card title="Conciliação bancária">
      {reconciliation && reconciledTransaction ? (
        <div className={styles.linkRow}>
          <Icon name="check" size={16} />
          <div>
            <p className={styles.reconLine}>Conciliado com <strong>{humanizeText(reconciledTransaction.description)}</strong> ({formatBRL(reconciledTransaction.amount)})</p>
            <p className={styles.reconMeta}>em {formatDateTime(reconciliation.matchedAt)}</p>
          </div>
        </div>
      ) : (
        <EmptyState icon="document" title="Sem conciliação" description="Este lançamento ainda não foi conciliado com nenhuma transação de extrato." />
      )}
    </Card>
  );
}

export function BankAccountCard({ account }) {
  const router = useRouter();
  return (
    <Card title="Conta bancária">
      {account ? (
        <div className={styles.accountBlock}>
          <div className={styles.accountBankRow}>
            <BankLogo bankCode={account.bankCode} size={32} />
            <div>
              <span className={styles.listRowTitle}>{account.bankCode ? getBankName(account.bankCode) : "Chave PIX"}</span>
              <span className={styles.listRowSubtitle}>
                {account.bankCode ? (
                  <>
                    {getBankName(account.bankCode)}{account.agency ? ` · Ag. ${account.agency}` : ""} · Conta{" "}
                    <ProtectedValue classification="RESTRICTED" resourceType="finance.bank_account" resourceId={account.id} field="accountNumber" value={account.accountNumber}>
                      {maskAccountNumber(account.accountNumber)}
                    </ProtectedValue>
                  </>
                ) : "Chave PIX"}
              </span>
            </div>
          </div>
          <Badge tone={BANK_ACCOUNT_STATUS_TONE[account.status]}>{BANK_ACCOUNT_STATUS_LABELS[account.status]}</Badge>
          <Button size="sm" variant="secondary" onClick={() => router.push(`/painel/financeiro/contas-bancarias/${account.id}`)}>
            Ver conta
          </Button>
        </div>
      ) : (
        <EmptyState icon="money" title="Sem conta vinculada" description="Nenhuma conta bancária vinculada a este lançamento." />
      )}
    </Card>
  );
}
