// Textos e linhas do relatório semanal de saúde (Caderno M4 §19), a partir do que a API devolve (GET /finance/reports/weekly-health).
// Verificação 11/11/2026: o a pagar/a receber é o SALDO EM ABERTO (o recebível parcialmente recebido continua com o saldo), os recebíveis
// vêm também ponderados por status, o caixa disponível é o saldo conciliado próprio, a inadimplência é só dos recebíveis e as pendências de
// conciliação somam o valor absoluto. Funções puras para a tela e o teste de unidade.
import { formatBRL } from "@/lib/format";

const pct = (ratio) => `${(Number(ratio || 0) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** Rótulos dos status da ponderação (mesmos códigos da API: receivableWeights). */
export const WEIGHT_STATUS_LABELS = { EM_DIA: "em dia", PARCIAL: "parcialmente recebido", VENCIDO: "vencido" };

export function receivableDelta(report) {
  const r = report.receivablePending;
  return `${r.count} lançamento(s) — saldo em aberto; ponderado por status: ${formatBRL(r.weighted ?? r.total)}`;
}

export function weightsText(report) {
  const w = report.receivableWeights || {};
  return Object.keys(WEIGHT_STATUS_LABELS)
    .filter((k) => w[k] !== undefined)
    .map((k) => `${WEIGHT_STATUS_LABELS[k]} ${(Number(w[k]) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`)
    .join(" · ");
}

export function freeCashDelta(report) {
  const f = report.freeCash;
  const conciliated = f.conciliatedBankBalance ?? f.grossBankBalance;
  const third = f.thirdPartyHeldConciliated ?? f.thirdPartyHeld;
  return `Saldo conciliado ${formatBRL(conciliated)} − terceiros contidos nele ${formatBRL(third)} (extrato importado: ${formatBRL(f.grossBankBalance)})`;
}

export function thirdPartyHeldDelta(report) {
  return `Recebido de terceiros e ainda não devolvido, pelo ledger (cada recebimento uma vez). Em aberto, previsto: ${formatBRL(report.thirdPartyFunds.total)}`;
}

export function delinquencyView(report) {
  const d = report.delinquency;
  if (!d) return { value: pct(report.delinquencyRatio), delta: "Vencido ÷ total elegível (próprio)" };
  return {
    value: pct(d.receivable.ratio),
    delta: `Recebíveis vencidos ${formatBRL(d.receivable.overdue)} ÷ a receber ${formatBRL(d.receivable.eligible)}. Contas a pagar em atraso (à parte): ${pct(d.payable.ratio)}`,
  };
}

export function breathingDelta(report) {
  const b = report.breathingNeed;
  if (b.mandatoryOutflows === undefined) return "Saídas obrigatórias 7d − caixa livre − entradas prováveis";
  return `Saídas obrigatórias ${formatBRL(b.mandatoryOutflows)} − caixa disponível ${formatBRL(report.freeCash.value)} − entradas prováveis (ponderadas) ${formatBRL(b.probableInflows)}`;
}

/** Linhas 7/30/60 dias: a pagar e a receber (com o ponderado). */
export function windowRows(report) {
  const rows = [];
  for (const [label, w] of [["7 dias", report.dueNextSevenDays], ["30 dias", report.dueNext30Days], ["60 dias", report.dueNext60Days]]) {
    rows.push({ key: `${label}-p`, label: `${label} — a pagar`, value: formatBRL(w.payable.total), count: `${w.payable.count}` });
    const weighted = w.receivable.weighted !== undefined && w.receivable.weighted !== w.receivable.total ? ` · ponderado ${formatBRL(w.receivable.weighted)}` : "";
    rows.push({ key: `${label}-r`, label: `${label} — a receber`, value: formatBRL(w.receivable.total), count: `${w.receivable.count}${weighted}` });
  }
  return rows;
}

/** Pendências de operação: conciliação (valor absoluto), comissões ainda não pagas, repasses aguardando ou aprovados e não pagos. */
export function pendingRows(report) {
  const rec = report.pendingReconciliations;
  const rep = report.pendingOwnerRepasses;
  const flow = rec.inflow !== undefined ? ` · entradas ${formatBRL(rec.inflow)}, saídas ${formatBRL(rec.outflow)}` : "";
  const approved = rep.approvedNotPaid ? ` · aprovados e não pagos: ${rep.approvedNotPaid.count} (${formatBRL(rep.approvedNotPaid.total)})` : "";
  return [
    { key: "rec", label: "Conciliação pendente (valor absoluto)", value: formatBRL(rec.total), count: `${rec.count}${flow}` },
    { key: "com", label: "Comissões provisionadas (ainda não pagas)", value: formatBRL(report.provisionedCommissions.total), count: `${report.provisionedCommissions.count}` },
    { key: "rep", label: "Repasses de proprietário a pagar", value: formatBRL(rep.total), count: `${rep.count}${approved}` },
  ];
}
