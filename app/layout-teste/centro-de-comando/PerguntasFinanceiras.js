import Kpi from "../_components/Kpi";
import { Sparkline } from "../_components/Charts";
import { brl } from "../_components/format";
import { CAIXA, ATRASO, PARADO } from "../_mock/comando";
import ui from "../_components/ui.module.css";
import s from "./cc.module.css";

const CORES = ["var(--color-ink)", "var(--color-brand-active)", "var(--color-info)", "var(--color-border-strong)"];

export default function PerguntasFinanceiras() {
  return (
    <div className={`${s.row} ${s.r3}`}>
      <section className={ui.card} aria-labelledby="q1">
        <div className={ui.cardHead}><h2 id="q1" className={ui.cardTitle}><span className={s.q}>1</span>Quanto dinheiro temos e para onde vai</h2></div>
        <Kpi label="Caixa livre" value={brl(CAIXA.livre)} delta={{ text: "4,1% vs. 30 dias atrás", good: true }} source="Extratos conciliados" ageMin={7}>
          <Sparkline data={CAIXA.serie} label="Caixa livre nos últimos 10 períodos" />
        </Kpi>
        <div className={s.pair}>
          <Kpi small label="A pagar em 30 dias" value={brl(CAIXA.aPagar)} />
          <Kpi small label="A receber em 30 dias" value={brl(CAIXA.aReceber)} />
        </div>
        <div className={s.sep}><span className={ui.label}>Dinheiro de terceiros (fora do caixa livre)</span></div>
        <ul className={s.list}>{CAIXA.terceiros.map(([k, v]) => <li key={k}><span>{k}</span><span>{brl(v)}</span></li>)}</ul>
      </section>

      <section className={ui.card} aria-labelledby="q2">
        <div className={ui.cardHead}><h2 id="q2" className={ui.cardTitle}><span className={s.q}>2</span>O que está atrasado</h2></div>
        <div className={s.kpiRows}>
          {ATRASO.map((a, i) => (
            <Kpi key={a.label} label={a.label} value={a.valor} delta={a.delta} source={["Financeiro", "Obras", "Contratos"][i]} ageMin={[7, 24, 12][i]} fresh={i === 1 ? "DEFASADO" : "FRESCO"} />
          ))}
        </div>
      </section>

      <section className={ui.card} aria-labelledby="q3">
        <div className={ui.cardHead}><h2 id="q3" className={ui.cardTitle}><span className={s.q}>3</span>Onde há dinheiro parado ou perdido</h2></div>
        <Kpi label="Total identificado" value={brl(PARADO.total)} delta={{ text: "R$ 6.200,00 vs. mês anterior", good: false }} source="Estoque, Financeiro e CRM" ageMin={31} />
        <div className={s.bar} role="img" aria-label="Composição do total parado">
          {PARADO.partes.map(([k, v], i) => <i key={k} style={{ width: `${(v / PARADO.total) * 100}%`, background: CORES[i] }} />)}
        </div>
        <ul className={s.list}>
          {PARADO.partes.map(([k, v], i) => (
            <li key={k} className={s.legend}><span><span className={s.sw} style={{ background: CORES[i] }} aria-hidden="true" />{k}</span><span>{brl(v)}</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
