"use client";

// Cartão "Detalhes do lançamento": valores, datas, baixas parciais (realizado pelo ledger e saldo, Caderno §6), dinheiro de terceiro (§13),
// forma da baixa (F03) e classificação gerencial.
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import NatureBadge from "@/components/molecules/NatureBadge/NatureBadge";
import { formatBRL, formatDate, formatDateTime, formatCompetence, formatContractLabel, humanizeText } from "@/lib/format";
import styles from "./page.module.css";

const SETTLEMENT_METHOD_TEXT = {
  BANK_CONFIRMED: "Confirmada pelo banco",
  SANDBOX_CONFIRMED: "Confirmada pelo provedor de simulação (sandbox) — não é confirmação de banco real",
  COMPENSATION: "Compensação com dívida do titular — sem movimento de caixa",
};

// Recebimento antecipado: liquidado antes do dia do vencimento (dia de calendário em São Paulo).
const dayKey = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

function Row({ label, children, amount }) {
  return <div className={styles.detailRow}><dt>{label}</dt><dd className={amount ? styles.amount : undefined}>{children}</dd></div>;
}

export default function EntryDetailsCard({ entry, balance, hasPartialSettlements, contractInfo, holderInfo, depositBalance, costCenter, resultCenter }) {
  const isEarlyReceipt = entry.nature === "RECEIVABLE" && entry.status === "SETTLED" && entry.dueAt && entry.settledAt && dayKey(entry.settledAt) < dayKey(entry.dueAt);
  return (
    <Card title="Detalhes do lançamento">
      <dl className={styles.detailList}>
        <Row label="Valor" amount>{formatBRL(entry.amount)}</Row>
        <Row label="Tipo">{entry.entryType === "DEBIT" ? "Débito" : "Crédito"}</Row>
        <Row label="Natureza"><NatureBadge nature={entry.nature} /></Row>
        <Row label="Vencimento">{entry.dueAt ? formatDate(entry.dueAt) : "Sem vencimento"}</Row>
        {entry.competenceMonth ? <Row label="Competência">{formatCompetence(entry.competenceMonth)}</Row> : null}
        <Row label="Liquidado em">
          {entry.settledAt ? formatDateTime(entry.settledAt) : "Ainda não liquidado"}
          {isEarlyReceipt ? <> <Badge tone="info">Recebimento antecipado</Badge></> : null}
        </Row>
        {hasPartialSettlements ? (
          <>
            <Row label="Já baixado (descontados os estornos)">{formatBRL(balance.realizedCents / 100)}</Row>
            <Row label="Saldo restante" amount>{formatBRL(balance.remainingCents / 100)}</Row>
          </>
        ) : null}
        {entry.isThirdPartyFunds ? (
          <>
            <Row label="Dinheiro de terceiro">{entry.thirdPartyReference ? humanizeText(entry.thirdPartyReference) : "Sim"}</Row>
            {contractInfo ? <Row label="Contrato">{formatContractLabel(contractInfo)}</Row> : null}
            {holderInfo ? <Row label="Titular">{holderInfo.legalName || "Titular sem nome cadastrado"}</Row> : null}
            {depositBalance ? <Row label="Saldo da caução">{formatBRL(depositBalance.available)} de {formatBRL(depositBalance.received)} recebidos</Row> : null}
          </>
        ) : null}
        {entry.settlementMethod ? (
          <Row label="Forma da baixa">{SETTLEMENT_METHOD_TEXT[entry.settlementMethod] || `Baixa manual com comprovante — ${entry.settlementReason || "sem motivo registrado"}`}</Row>
        ) : null}
        {entry.status !== "SETTLED" && entry.settlementEvidenceFileId ? (
          <Row label="Comprovante anexado">
            {entry.settlementEvidenceAttachedAt ? `${formatDateTime(entry.settlementEvidenceAttachedAt)} — ` : ""}
            {entry.settlementReason || "sem motivo registrado"}
          </Row>
        ) : null}
        <Row label="Centro de custo">{costCenter ? `${costCenter.code} — ${costCenter.name}` : "Não classificado"}</Row>
        <Row label="Centro de resultado">{resultCenter ? `${resultCenter.code} — ${resultCenter.name}` : "Não classificado"}</Row>
      </dl>
    </Card>
  );
}
