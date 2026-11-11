"use client";

// Pré-visualização das cláusulas que entram e ficam de fora do documento (decidido pelo servidor, F01).
import Card from "@/components/molecules/Card/Card";
import { describeCondition } from "@/app/painel/contratos/clausulas/ClauseConditionEditor";
import styles from "./page.module.css";

export default function ClausePreviewCard({ preview }) {
  return (
    <Card
    title="Cláusulas do documento"
    subtitle="Decidido pelo sistema com os dados deste contrato e as regras aprovadas na Biblioteca de cláusulas. Confira e clique em “Confirmar e criar contrato”."
  >
    <div className={styles.clausePreview} data-testid="clause-preview">
      <p className={styles.clausePreviewHeading}>Vão entrar ({preview.included.length})</p>
      {preview.included.length === 0 ? <p className={styles.emptyText}>Nenhuma cláusula.</p> : null}
      <ul className={styles.clauseList}>
        {preview.included.map((c) => (
          <li key={c.contractClauseId} data-testid="clause-included">
            <strong>{c.title}</strong>
            {c.condition ? <span className={styles.clauseReason}> — regra atendida: {describeCondition(c.condition)}</span> : null}
          </li>
        ))}
      </ul>
      {preview.excluded.length > 0 ? (
        <>
          <p className={styles.clausePreviewHeading}>Ficam de fora ({preview.excluded.length})</p>
          <ul className={styles.clauseList}>
            {preview.excluded.map((c) => (
              <li key={c.contractClauseId} data-testid="clause-excluded">
                <strong>{c.title || c.code}</strong>
                <span className={styles.clauseReason}>
                  {" — "}
                  {c.reason === "CLAUSE_RETIRED"
                    ? "cláusula retirada de circulação na Biblioteca"
                    : `regra não atendida por este contrato: ${describeCondition(c.condition)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  </Card>
  );
}
