"use client";

// NAY financeira (Caderno do Financeiro §18): só explica e sugere. Nada nesta tela cria
// lançamento, paga, troca favorecido ou fecha período — toda ação continua nas telas humanas.
// Toda resposta mostra as fontes e avisa quando a conclusão é parcial.

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import { getFinanceNayInsights, formatCalendarDay } from "@/lib/finance/extras";
import { formatBRL, formatCompetence, formatDateTime, formatPercent, humanizeText } from "@/lib/format";
import styles from "./page.module.css";

const NATURE_LABEL = { REALIZADO: "Realizado", PREVISTO: "Previsto", ESTIMADO: "Estimado" };
const NATURE_TONE = { REALIZADO: "success", PREVISTO: "info", ESTIMADO: "warning" };

const INDICATOR_LABELS = {
  caixaLivre: "Caixa livre (sem dinheiro de terceiros)",
  dinheiroTerceirosRetido: "Dinheiro de terceiros retido",
  aReceber7d: "A receber nos próximos 7 dias",
  aPagar7d: "A pagar nos próximos 7 dias",
  saldoProjetado: "Saldo projetado",
  variacaoResultado: "Variação do resultado entre os meses",
  recebiveisVencidos: "Recebíveis vencidos",
  indiceInadimplencia: "Índice de inadimplência",
  necessidadeParaRespirar: "Necessidade de capital para a próxima semana",
  anomaliasAltoRisco: "Casos de anomalia de alto risco em aberto",
  aReceber30d: "A receber nos próximos 30 dias",
  aPagar30d: "A pagar nos próximos 30 dias",
  repassesPendentes: "Repasses pendentes a proprietários",
  comissoesProvisionadas: "Comissões provisionadas (ainda não pagas)",
  conciliacoesPendentes: "Transações de extrato sem conciliação",
};

const SECTION_TITLES = {
  fluxoCaixa: "Fluxo de caixa",
  variacoes: "Variação mês a mês",
  inadimplencia: "Inadimplência",
  necessidadeCapital: "Necessidade de capital",
  anomalias: "Anomalias",
};

// Guia M4 §13: a NAY lê o retrato financeiro (read model), não o ledger a cada pergunta.
const READ_MODEL_LABELS = {
  "analytics.rm_finance_health": "Retrato da saúde financeira (read model)",
  "analytics.rm_finance_sector_margin": "Retrato de receita e custo por setor (read model)",
};

const TABLE_LABELS = {
  "finance.financial_entries": "Lançamentos",
  "finance.bank_transactions": "Extrato bancário importado",
  "finance.reconciliations": "Conciliações",
  "finance.bank_accounts": "Contas bancárias",
  "finance.commissions": "Comissões",
  "finance.owner_repasses": "Repasses a proprietários",
  "finance.anomaly_cases": "Casos de anomalia",
  "finance.result_centers": "Setores (centros de resultado)",
};

function sourceLabel(source) {
  if (source?.readModel) return READ_MODEL_LABELS[source.readModel] || "Retrato da saúde financeira";
  if (source?.tabela === "finance.financial_entries") return "Lançamentos em aberto (fila de trabalho)";
  if (source?.tabela) return TABLE_LABELS[source.tabela] || "Dados do Financeiro";
  return "Dados do Financeiro";
}

function indicatorLabel(code) {
  if (INDICATOR_LABELS[code]) return INDICATOR_LABELS[code];
  const m = /^(recebido|pago)_(\d{4}-\d{2})$/.exec(code);
  if (m) return `${m[1] === "recebido" ? "Receita realizada" : "Custo realizado"} em ${formatCompetence(m[2])}`;
  return "Indicador";
}

function indicatorValue(code, value) {
  if (value == null) return "Indisponível";
  if (code === "indiceInadimplencia") return formatPercent(Number(value) * 100);
  if (code === "anomaliasAltoRisco" || code === "conciliacoesPendentes") return String(value);
  return formatBRL(value);
}

function NumberList({ numbers }) {
  return (
    <ul className={styles.numbers}>
      {numbers.map((n) => (
        <li key={n.indicador} className={styles.numberRow}>
          <div className={styles.numberMain}>
            <span className={styles.numberLabel}>{indicatorLabel(n.indicador)}</span>
            <span className={styles.numberSource}>Fonte: {[...new Set((n.fontes || []).map(sourceLabel))].join(", ") || "Dados do Financeiro"}</span>
          </div>
          <div>
            <span className={styles.numberValue}>{indicatorValue(n.indicador, n.valor)}</span>{" "}
            <Badge tone={NATURE_TONE[n.natureza] || "neutral"}>{NATURE_LABEL[n.natureza] || "Estimado"}</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SuggestionList({ items, empty, render }) {
  if (!items || items.length === 0) return <p className={styles.empty}>{empty}</p>;
  return <ul className={styles.sugList}>{items.map((item, i) => <li key={item.financialEntryId || item.resultCenterId || i} className={styles.sugRow}>{render(item)}</li>)}</ul>;
}

export default function NayFinanceiraPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getFinanceNayInsights()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err?.message || "Não foi possível carregar a NAY financeira."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const s = data?.sugestoes;

  return (
    <AppShell title="NAY financeira" subtitle="Financeiro">
      <Alert tone="info" title="A NAY só explica e sugere" className={styles.intro}>
        Ela não cria lançamento, não paga, não troca favorecido e não fecha período. Toda ação continua nas telas do Financeiro, com aprovação de outra pessoa quando a regra exige.
      </Alert>
      {error ? <Alert tone="danger" title="Não foi possível carregar">{error}</Alert> : null}

      {loading ? (
        <SkeletonDetail sections={3} />
      ) : data ? (
        <div className={styles.stack}>
          {data.conclusaoParcial ? (
            <Alert tone="warning" title="Conclusão parcial">
              Os dados estão incompletos, então as conclusões abaixo valem só em parte:
              <ul className={styles.sources}>{(data.motivosParcial || []).map((m) => <li key={m}>{humanizeText(m)}</li>)}</ul>
            </Alert>
          ) : null}

          {Object.entries(data.explicacoes || {}).map(([key, section]) => (
            <Card key={key} title={SECTION_TITLES[key] || "Explicação"} subtitle="Cada número mostra se é realizado, previsto ou estimado e de onde veio">
              <p className={styles.text}>{humanizeText(section.texto)}</p>
              <NumberList numbers={section.numeros || []} />
            </Card>
          ))}

          <Card title="Sugestões" subtitle="Recomendações para uma pessoa decidir — a NAY não executa nada">
            <h3 className={styles.numberLabel}>Cobrar (vencidos há até 30 dias)</h3>
            <SuggestionList
              items={s?.cobranca}
              empty="Nenhum recebível vencido nesta faixa."
              render={(x) => (
                <>
                  <div className={styles.sugTop}><span className={styles.sugTitle}>{humanizeText(x.descricao)}</span><span className={styles.numberValue}>{formatBRL(x.valor)}</span></div>
                  <span className={styles.sugReason}>Vencido há {x.diasEmAtraso} dia(s). Cobrar pelo fluxo de cobrança. <Link href={`/painel/financeiro/lancamentos/${x.financialEntryId}`}>Abrir lançamento</Link></span>
                </>
              )}
            />
            <h3 className={styles.numberLabel}>Renegociar (vencidos há mais de 30 dias)</h3>
            <SuggestionList
              items={s?.renegociacao}
              empty="Nenhum recebível vencido há mais de 30 dias."
              render={(x) => (
                <>
                  <div className={styles.sugTop}><span className={styles.sugTitle}>{humanizeText(x.descricao)}</span><span className={styles.numberValue}>{formatBRL(x.valor)}</span></div>
                  <span className={styles.sugReason}>Vencido há {x.diasEmAtraso} dia(s). Avaliar um acordo de cobrança. <Link href={`/painel/financeiro/lancamentos/${x.financialEntryId}`}>Abrir lançamento</Link></span>
                </>
              )}
            />
            <h3 className={styles.numberLabel}>Reduzir custo</h3>
            <SuggestionList
              items={s?.reducaoCusto}
              empty="Nenhum setor com custo em alta nos dois últimos meses."
              render={(x) => (
                <>
                  <div className={styles.sugTop}><span className={styles.sugTitle}>{humanizeText(x.nome || "Setor sem nome")}</span><span className={styles.numberValue}>{formatBRL(x.crescimento)}</span></div>
                  <span className={styles.sugReason}>O custo realizado do setor cresceu {formatBRL(x.crescimento)} em relação ao mês anterior.</span>
                </>
              )}
            />
            <h3 className={styles.numberLabel}>Ordem sugerida para pagar</h3>
            <SuggestionList
              items={s?.priorizacaoPagaveis}
              empty="Nenhuma conta a pagar pendente."
              render={(x) => (
                <>
                  <div className={styles.sugTop}><span className={styles.sugTitle}>{x.ordem}. {humanizeText(x.descricao)}</span><span className={styles.numberValue}>{formatBRL(x.valor)}</span></div>
                  <span className={styles.sugReason}>
                    {x.vencimento ? `Vence em ${formatCalendarDay(x.vencimento)}${x.vencido ? " (vencida)" : ""}.` : "Sem vencimento."} O pagamento só acontece pela intenção de pagamento, com aprovação e MFA.
                  </span>
                </>
              )}
            />
          </Card>

          <Card title="Fontes e versões usadas" subtitle={`Gerado em ${formatDateTime(data.geradoEm)}`}>
            <ul className={styles.sources}>
              {(data.fontes?.readModels || []).map((t) => <li key={t}>{READ_MODEL_LABELS[t] || "Retrato financeiro"}</li>)}
              {(data.fontes?.cadastros || []).map((t) => <li key={t}>Cadastro: {TABLE_LABELS[t] || "Dados do Financeiro"}</li>)}
              <li>Retrato de {data.fontes?.asOfDate ? formatCalendarDay(data.fontes.asOfDate) : "data indisponível"}, atualizado em {data.fontes?.sourceSnapshotAt || data.sourceSnapshotAt ? formatDateTime(data.fontes?.sourceSnapshotAt || data.sourceSnapshotAt) : "ainda não calculado"}</li>
              {(data.fontes?.regras || []).map((r) => <li key={r.codigo}>Regra de antifraude {r.codigo}: {r.origem}</li>)}
            </ul>
            <p className={styles.limits}>{data.limites}</p>
          </Card>
        </div>
      ) : null}

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
