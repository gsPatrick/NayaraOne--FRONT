import { CashChart } from "../_components/Charts";
import StatusChip from "../_components/StatusChip";
import Alertas from "./Alertas";
import { FLUXO } from "../_mock/comando";
import ui from "../_components/ui.module.css";
import s from "./cc.module.css";

export default function GraficoAlertas() {
  return (
    <div className={`${s.row} ${s.r21}`}>
      <section className={ui.card} aria-labelledby="fluxo">
        <div className={ui.cardHead}>
          <h2 id="fluxo" className={ui.cardTitle}>Fluxo de caixa, 12 semanas (R$)</h2>
          <span className={s.legendChart}>
            <span><i className={s.sw} style={{ background: "var(--color-ink)" }} />Realizado</span>
            <span><i className={s.sw} style={{ background: "var(--color-brand-active)" }} />Previsto</span>
            <StatusChip tone="success" dot={false}>FRESCO · há 7 min</StatusChip>
          </span>
        </div>
        <div className={ui.cardBody}><CashChart data={FLUXO} /></div>
      </section>
      <Alertas />
    </div>
  );
}
