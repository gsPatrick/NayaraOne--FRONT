import FilaDecisoes from "./FilaDecisoes";
import StatusChip from "../_components/StatusChip";
import { brl } from "../_components/format";
import { RECOMENDACOES, OPORTUNIDADES } from "../_mock/comando";
import ui from "../_components/ui.module.css";
import t from "../_components/Table.module.css";
import s from "./cc.module.css";

export default function DecisoesNay() {
  return (
    <>
      <div className={`${s.row} ${s.r21}`}>
        <FilaDecisoes />
        <section className={ui.card} aria-labelledby="q5">
          <div className={ui.cardHead}><h2 id="q5" className={ui.cardTitle}><span className={s.q}>5</span>O que a NAY recomenda</h2><StatusChip tone="brand" dot={false}>Assistivo</StatusChip></div>
          <ol className={s.reco}>
            {RECOMENDACOES.map((r) => (
              <li key={r.texto}>
                <p>{r.texto}</p>
                <div className={s.recoMeta}>
                  <span>Fonte: {r.fonte}</span>
                  <span className={s.conf}>Confiança {r.conf}% <span className={s.meter} aria-hidden="true"><i style={{ width: `${r.conf}%` }} /></span></span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className={ui.card} aria-labelledby="q6" style={{ marginBottom: 12 }}>
        <div className={ui.cardHead}><h2 id="q6" className={ui.cardTitle}><span className={s.q}>6</span>Oportunidades que merecem atenção</h2><span className={ui.muted}>CRM · atualizado há 22 min</span></div>
        <div className={t.wrap}>
          <table className={t.table}>
            <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Oportunidades do CRM</caption>
            <thead><tr><th scope="col">Oportunidade</th><th scope="col">Etapa</th><th scope="col" className={t.right}>Valor</th><th scope="col" className={t.right}>Sem contato</th></tr></thead>
            <tbody>
              {OPORTUNIDADES.map((o) => (
                <tr key={o.nome}><td className={t.strong}>{o.nome}</td><td><StatusChip tone="info">{o.etapa}</StatusChip></td><td className={t.right}>{brl(o.valor)}</td><td className={t.right}>{o.dias} {o.dias === 1 ? "dia" : "dias"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
