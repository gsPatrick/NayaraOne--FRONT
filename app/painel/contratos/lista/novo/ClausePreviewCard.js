"use client";

// Pré-visualização das cláusulas que entram e ficam de fora do documento (decidido pelo servidor, F01). A prévia é da
// versão PUBLICADA do modelo (a que gera o contrato); "Ver rascunho" mostra, só para consulta, a versão em rascunho.
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import { describeCondition } from "@/app/painel/contratos/clausulas/ClauseConditionEditor";
import { TEMPLATE_VERSION_STATUS_LABELS } from "@/lib/labels/juridico";
import styles from "./page.module.css";

function versionText(p) {
  if (!p.versionNumber) return "Versão do modelo não informada pelo servidor.";
  const status = (TEMPLATE_VERSION_STATUS_LABELS[p.versionStatus] || "").toLowerCase();
  return p.versionStatus === "PUBLISHED"
    ? `Prévia da versão ${p.versionNumber} do modelo (${status}) — é a que gera o documento do contrato.`
    : `Prévia da versão ${p.versionNumber} do modelo (${status || "rascunho"}) — só consulta: o documento é gerado pela versão publicada.`;
}

function ClauseLists({ preview, testid }) {
  return (
    <div className={styles.clausePreview} data-testid={testid}>
      <p className={styles.clauseReason} data-testid={`${testid}-version`}>{versionText(preview)}</p>
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
                  {c.reason === "CLAUSE_RETIRED" ? "cláusula retirada de circulação na Biblioteca" : `regra não atendida por este contrato: ${describeCondition(c.condition)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export default function ClausePreviewCard({ preview, draftPreview, onShowDraft, onHideDraft }) {
  return (
    <Card
      title="Cláusulas do documento"
      subtitle="Decidido pelo sistema com os dados deste contrato e as regras aprovadas na Biblioteca de cláusulas. Confira e clique em “Confirmar e criar contrato”."
      actions={draftPreview
        ? <Button size="sm" variant="ghost" onClick={onHideDraft}>Ocultar rascunho</Button>
        : <Button size="sm" variant="ghost" onClick={onShowDraft}>Ver rascunho</Button>}
    >
      <ClauseLists preview={preview} testid="clause-preview" />
      {draftPreview ? <ClauseLists preview={draftPreview} testid="clause-preview-draft" /> : null}
    </Card>
  );
}
