"use client";

// Resposta da NAY Comercial: estado da consulta (carregando, erro), o texto da resposta, as fontes em português e a data do dado.
// O detalhamento de cada capacidade vem em `children` (render-prop com o resultado).
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { formatDateTime } from "@/lib/format";
import { capabilityLabel, runStatusLabel, sourceLabel } from "./nayComercial.format.js";
import styles from "./page.module.css";

function Sources({ sources }) {
  const labels = [...new Set((sources || []).map(sourceLabel))];
  if (!labels.length) return <p className={styles.meta}>Fontes: a NAY não citou fontes nesta resposta.</p>;
  return (
    <div>
      <p className={styles.subTitle}>Fontes</p>
      <ul className={styles.sources}>{labels.map((label) => <li key={label}>{label}</li>)}</ul>
    </div>
  );
}

export default function NayAnswer({ state, title, children }) {
  if (!state || state.status === "idle") return null;
  if (state.status === "loading") {
    return (
      <div aria-busy="true" className={styles.answer}>
        <p className={styles.meta} role="status">A NAY está consultando os dados…</p>
        <SkeletonDetail sections={2} />
      </div>
    );
  }
  if (state.status === "error") return <div className={styles.answer}><Alert tone="danger" title="A NAY não respondeu">{state.error}</Alert></div>;

  const result = state.result;
  const finished = result.status === "COMPLETED";
  return (
    <section className={styles.answer} aria-label={title || capabilityLabel(state.taskType)}>
      <div className={styles.answerHead}>
        <h4 className={styles.answerTitle}>{title || capabilityLabel(state.taskType)}</h4>
        {!finished ? <Badge tone="warning">{runStatusLabel(result.status)}</Badge> : null}
      </div>
      <p className={styles.text}>{result.answer || "A NAY não trouxe texto nesta resposta."}</p>
      {result.fromPolling ? <p className={styles.meta}>Esta consulta demorou mais que o normal: aqui aparece o resumo da resposta, sem o detalhamento.</p> : null}
      {finished && children ? children(result) : null}
      <Sources sources={result.sources} />
      <p className={styles.meta}>{result.snapshotAt ? `Dados de ${formatDateTime(result.snapshotAt)}.` : "Data do dado não informada pela NAY."}</p>
    </section>
  );
}
