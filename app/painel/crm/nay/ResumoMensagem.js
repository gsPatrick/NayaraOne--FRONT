"use client";

// Resumo da mensagem recebida (Marco 3 §12 "resumo NAY, sentimento/ocorrência apenas como apoio"): resumo, sentimento e ocorrência
// sugerida, sempre marcados como apoio. Nada é aberto nem alterado; abrir ocorrência é decisão do corretor, na tela de Feedback.
import Link from "next/link";
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import { hasSensitiveRemoved, occurrenceLabel, sentiment } from "./nayComercial.format.js";
import styles from "./page.module.css";

export default function ResumoMensagem({ data }) {
  if (!data) return null;
  const feeling = sentiment(data.sentimento);
  const occurrence = occurrenceLabel(data.ocorrenciaSugerida);
  return (
    <div className={styles.answer}>
      <Alert tone="info" title="Sugestão da NAY — não altera o cadastro nem abre ocorrência">
        É um apoio para você decidir. Quem decide o que fazer com a mensagem é você.
      </Alert>
      {data.resumo ? <p className={styles.rowText}><strong>Resumo:</strong> {data.resumo}</p> : null}
      <dl className={styles.facts}>
        <div className={styles.fact}><dt>Sentimento (indício)</dt><dd><Badge tone={feeling.tone}>{feeling.label}</Badge></dd></div>
        <div className={styles.fact}><dt>Ocorrência sugerida</dt><dd>{occurrence || "Nenhuma ocorrência sugerida"}</dd></div>
      </dl>
      {hasSensitiveRemoved(data) ? (
        <Alert tone="warning" title="Trecho retirado do resumo">Um trecho com dado pessoal sensível ficou de fora (LGPD).</Alert>
      ) : null}
      {occurrence ? (
        <p className={styles.meta}>
          Se achar que cabe uma ocorrência, registre você mesmo em <Link href="/painel/crm/feedback">Feedback &amp; Reclamações</Link>.
        </p>
      ) : null}
    </div>
  );
}
