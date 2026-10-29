"use client";
import { useState } from "react";
import Icon from "../_components/Icon";
import StatusChip from "../_components/StatusChip";
import { DOCS } from "../_mock/caso";
import ui from "../_components/ui.module.css";
import s from "./caso.module.css";

function Hash({ value }) {
  const [ok, setOk] = useState(false);
  const copy = () => {
    try { navigator.clipboard?.writeText(value); } catch (e) { /* mock */ }
    setOk(true);
    setTimeout(() => setOk(false), 1500);
  };
  return (
    <span className={s.hash}>
      <span className={ui.mono} title="Hash SHA-256 (truncado)">{value}</span>
      <button type="button" className={s.copy} onClick={copy} aria-label={ok ? "Hash copiado" : "Copiar hash"} title={ok ? "Copiado" : "Copiar hash"}>
        <Icon name={ok ? "check" : "copy"} size={12} />
      </button>
    </span>
  );
}

export default function VersionHistory() {
  const doc = DOCS[0];
  return (
    <div className={ui.card}>
      <div className={ui.cardHead}><h3 className={ui.cardTitle}>Histórico de versões: {doc.tipo}</h3></div>
      <ul className={s.versions}>
        {doc.versoes.map((v) => (
          <li key={v.v}>
            <StatusChip tone={v.estado === "Vigente" ? "success" : "neutral"} dot={false}>{v.v}</StatusChip>
            <div>
              <div className={ui.value}>{v.estado} · {v.nota} em {v.quando} por {v.quem}</div>
              <div className={ui.muted}>Hash: <Hash value={v.hash} /></div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
