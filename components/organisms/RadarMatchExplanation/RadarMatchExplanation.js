"use client";

// M3-15 (livro §13 "Radar é matching determinístico + scoring explicável"; Guia §9): score do match e, critério a critério,
// se foi atendido, não atendido ou ignorado, com a categoria do livro (obrigatório, preferência, flexível, exclusão) e o peso.
import Badge from "@/components/atoms/Badge/Badge";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { explanationRows, scoreSummary, STATUS_TONES } from "@/lib/radarExplanation";
import styles from "./RadarMatchExplanation.module.css";

const CATEGORY_TONES = { REQUIRED: "brand", PREFERENCE: "info", FLEXIBLE: "neutral", EXCLUSION: "warning" };

/** Score do match (0 a 100%) para o cartão do imóvel na lista. */
export function RadarScoreBadge({ explanation }) {
  if (!explanation) return null;
  const summary = scoreSummary(explanation);
  return <Badge tone={summary.matched ? "success" : "danger"}>Score {summary.scorePercent}</Badge>;
}

export default function RadarMatchExplanation({ explanation, criteriaJson }) {
  const summary = scoreSummary(explanation);
  const rows = explanationRows(explanation, criteriaJson);
  return (
    <div className={styles.wrap} data-radar-explanation="true">
      <div className={styles.header}>
        <p className={styles.score}>
          <span className={styles.scoreValue}>{summary.scorePercent}</span>
          <span className={styles.scoreLabel}>score do match</span>
        </p>
        <div className={styles.headerText}>
          <p className={styles.headline}>{summary.headline}</p>
          <p className={styles.counts}>
            Obrigatórios atendidos: {summary.requiredMet} de {summary.requiredTotal}.{" "}
            {summary.hasWeighted ? `Pesos de preferências e flexíveis atendidos: ${summary.weightsMet} de ${summary.weightsTotal}.` : "Sem preferências nem flexíveis: o score é 100% quando os obrigatórios batem."}
          </p>
        </div>
      </div>
      <ul className={styles.list} aria-label="Critérios do radar e resultado para este imóvel">
        {rows.map((row) => (
          <li key={row.key} className={styles.row} data-status={row.status} data-category={row.category}>
            <div className={styles.rowTop}>
              <Badge tone={CATEGORY_TONES[row.category]}>{row.categoryLabel}</Badge>
              {row.category === "REQUIRED" ? (
                <span className={styles.criterion}>
                  {row.criterion}
                  {row.detail ? <span className={styles.detail}>: {row.detail}</span> : null}
                </span>
              ) : (
                <span className={styles.criterion}>{row.detail || row.criterion}</span>
              )}
              <Badge tone={STATUS_TONES[row.status]}>{row.statusLabel}</Badge>
            </div>
            <p className={styles.meta}>
              <span>{row.weightText}</span>
              {row.note ? <span className={styles.note}>{row.note}</span> : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Explicação com os estados do padrão (carregando, erro com "tentar de novo", acesso negado, vazio). */
export function RadarExplanationView({ result, criteriaJson }) {
  return (
    <AsyncState
      result={result}
      loadingLabel="Carregando a explicação do match..."
      emptyTitle="Sem critérios para explicar"
      emptyDescription="Este radar não tem critérios avaliados para este imóvel."
    >
      {(explanation) => (explanation ? <RadarMatchExplanation explanation={explanation} criteriaJson={criteriaJson} /> : null)}
    </AsyncState>
  );
}
