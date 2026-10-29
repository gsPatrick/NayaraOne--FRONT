"use client";
import { useState } from "react";
import StatusChip from "../_components/StatusChip";
import { brl } from "../_components/format";
import { DECISOES, TIPO_TONE } from "../_mock/comando";
import ui from "../_components/ui.module.css";
import t from "../_components/Table.module.css";
import s from "./cc.module.css";

export default function FilaDecisoes() {
  const [feitas, setFeitas] = useState(new Set());
  const pend = DECISOES.filter((d) => !feitas.has(d.titulo));
  return (
    <section className={ui.card} aria-labelledby="q4">
      <div className={ui.cardHead}>
        <h2 id="q4" className={ui.cardTitle}><span className={s.q}>4</span>Quais decisões esperam por mim</h2>
        <StatusChip tone="warning" dot={false}>{pend.length} pendentes</StatusChip>
      </div>
      <div className={t.wrap}>
        <table className={t.table}>
          <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Fila de decisões</caption>
          <thead><tr><th scope="col">Tipo</th><th scope="col">Decisão</th><th scope="col" className={t.right}>Valor</th><th scope="col">Solicitante</th><th scope="col" className={t.right}>Idade</th><th scope="col"><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Ações</span></th></tr></thead>
          <tbody>
            {pend.map((d) => (
              <tr key={d.titulo}>
                <td><StatusChip tone={TIPO_TONE[d.tipo]} dot={false}>{d.tipo}</StatusChip></td>
                <td className={t.strong} style={{ whiteSpace: "normal", minWidth: 220 }}>{d.titulo}</td>
                <td className={t.right}>{d.valor == null ? "—" : brl(d.valor)}</td>
                <td>{d.quem}</td>
                <td className={t.right}>{d.idade}</td>
                <td><span className={s.actions}>
                  <button type="button" className={`${ui.btn} ${ui.sm} ${ui.primary}`} onClick={() => setFeitas((p) => new Set(p).add(d.titulo))} aria-label={`Aprovar: ${d.titulo}`}>Aprovar</button>
                  <button type="button" className={`${ui.btn} ${ui.sm}`} aria-label={`Ver: ${d.titulo}`}>Ver</button>
                </span></td>
              </tr>
            ))}
            {pend.length === 0 && <tr><td colSpan={6} className={t.empty}>Nenhuma decisão pendente.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
