"use client";
import { useState } from "react";
import StatusChip from "../_components/StatusChip";
import { ALERTAS, SEV_TONE } from "../_mock/comando";
import ui from "../_components/ui.module.css";
import s from "./cc.module.css";

export default function Alertas() {
  const [ok, setOk] = useState(new Set());
  return (
    <section className={ui.card} aria-labelledby="alertas">
      <div className={ui.cardHead}><h2 id="alertas" className={ui.cardTitle}>Alertas</h2><span className={ui.muted}>{ALERTAS.length - ok.size} sem reconhecimento</span></div>
      <ul style={{ listStyle: "none" }}>
        {ALERTAS.map((a) => (
          <li key={a.texto} className={`${s.alert} ${ok.has(a.texto) ? s.alertOff : ""}`}>
            <StatusChip tone={SEV_TONE[a.sev]}>{a.sev}</StatusChip>
            <div><div className={ui.value}>{a.texto}</div><div className={ui.muted}>{a.quando}</div></div>
            <button type="button" className={`${ui.btn} ${ui.sm}`} disabled={ok.has(a.texto)} onClick={() => setOk((p) => new Set(p).add(a.texto))}>{ok.has(a.texto) ? "Reconhecido" : "Reconhecer"}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
