import StatusChip from "../_components/StatusChip";
import { brl } from "../_components/format";
import { OBRAS, QUALIDADE } from "../_mock/comando";
import ui from "../_components/ui.module.css";
import t from "../_components/Table.module.css";
import s from "./cc.module.css";

const rel = (m) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h` : `${Math.floor(m / 1440)} dia`);

export default function ObrasQualidade() {
  return (
    <>
      <section className={ui.card} aria-labelledby="obras" style={{ marginBottom: 12 }}>
        <div className={ui.cardHead}><h2 id="obras" className={ui.cardTitle}>Obras em andamento</h2><span className={ui.muted}>5 obras · fonte: medições · há 1 dia</span></div>
        <div className={t.wrap}>
          <table className={t.table}>
            <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Obras em andamento</caption>
            <thead><tr><th scope="col">Obra</th><th scope="col">Fase</th><th scope="col">Progresso</th><th scope="col">Prazo</th><th scope="col" className={t.right}>Atraso</th><th scope="col" className={t.right}>Orçado</th><th scope="col" className={t.right}>Realizado</th></tr></thead>
            <tbody>
              {OBRAS.map((o) => (
                <tr key={o.nome}>
                  <td className={t.strong}>{o.nome}</td><td>{o.fase}</td>
                  <td><span className={s.progress}><span className={s.track}><i className={o.atraso > 14 ? s.late : ""} style={{ width: `${o.pct}%` }} /></span><span className={t.num}>{o.pct}%</span></span></td>
                  <td className={t.num}>{o.prazo}</td>
                  <td className={t.right}>{o.atraso ? <StatusChip tone={o.atraso > 14 ? "danger" : "warning"}>{o.atraso} dias</StatusChip> : <StatusChip tone="success">No prazo</StatusChip>}</td>
                  <td className={t.right}>{brl(o.orcado)}</td><td className={t.right}>{brl(o.gasto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={ui.card} aria-labelledby="qual">
        <div className={ui.cardHead}><h2 id="qual" className={ui.cardTitle}>Qualidade dos dados</h2><span className={ui.muted}>2 fontes defasadas</span></div>
        <div className={s.qgrid}>
          {QUALIDADE.map((q) => (
            <div key={q.fonte} className={s.qitem}>
              <div><div className={ui.value}>{q.fonte}</div><div className={ui.muted}>atualizado há {rel(q.min)}</div></div>
              <StatusChip tone={q.estado === "FRESCO" ? "success" : "warning"}>{q.estado}</StatusChip>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
