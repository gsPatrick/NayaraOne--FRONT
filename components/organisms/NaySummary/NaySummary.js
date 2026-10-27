"use client";

import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { getNayCaseSummary } from "@/lib/api/correspondent";
import { formatDateTime } from "@/lib/format";

// Resumo do caso feito pela NAY: só leitura, cada linha cita de onde veio o dado e nada é decidido.
export default function NaySummary({ financingCaseId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      setSummary(await getNayCaseSummary(financingCaseId));
    } catch (err) {
      setError(err?.message || "Não foi possível gerar o resumo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Resumo da NAY"
      subtitle="A NAY resume o que já está registrado no caso e sugere o próximo passo. Ela não aprova crédito, não promete taxa nem prazo e não envia documento."
      style={{ marginTop: 16 }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <Button variant="secondary" onClick={load} loading={loading}>{summary ? "Atualizar resumo" : "Gerar resumo"}</Button>
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {summary ? (
          <>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {(summary.lines || []).map((line, index) => (
                <li key={`${line.topic}-${index}`}>
                  <strong>{line.topic}:</strong> {line.text}
                </li>
              ))}
            </ul>
            <div>
              <strong>Próximos passos sugeridos</strong>
              {(summary.suggestions || []).length === 0 ? (
                <p style={{ margin: "4px 0 0" }}>Nenhuma ação sugerida para o estado atual do caso.</p>
              ) : (
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {(summary.suggestions || []).map((text, index) => <li key={`${index}-${text}`}>{text}</li>)}
                </ul>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-ink-muted)" }}>
              {summary.disclaimer || "A NAY só resume o que já está registrado e não decide nada."} Gerado em {formatDateTime(summary.generatedAt)}.
            </p>
          </>
        ) : null}
      </div>
    </Card>
  );
}
