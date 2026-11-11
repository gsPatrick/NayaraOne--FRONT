"use client";

// Verificação independente do Marco 6 (M6-29/M6-107): alçadas de aprovação de Obras. O valor é da empresa (não há
// padrão no código: sem alçada, nada se autoaprova). Alterar exige a permissão própria
// construction:approval_threshold:manage e MFA recente (o host global de step-up pede o código e repete a gravação);
// a API registra antes e depois na auditoria.
import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listApprovalThresholds, saveApprovalThreshold } from "@/lib/api/constructionConfig";
import { toNumber, formatBRL, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const CONTEXTS = [
  { key: "MATERIAL_LOSS", label: "Perda de material", helper: "Perda até este valor é aprovada sozinha; acima, espera aprovação." },
  { key: "WARRANTY_RESOLUTION", label: "Desconto/ressarcimento de garantia", helper: "Acima deste valor, outra pessoa (não quem propôs) aprova." },
];

const toField = (value) => (value === null || value === undefined ? "" : String(Number(value).toFixed(2)).replace(".", ","));

export default function ApprovalThresholdsCard() {
  const query = useAsyncState(() => listApprovalThresholds(), { key: "obras-config-alcadas", isEmpty: () => false });
  const [form, setForm] = useState({ MATERIAL_LOSS: "", WARRANTY_RESOLUTION: "" });
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!query.data) return;
    const next = {};
    for (const row of query.data) next[row.context] = row.configured ? toField(row.maxAutoApproveAmount) : "";
    setForm((p) => ({ ...p, ...next }));
  }, [query.data]);

  async function handleSave(context) {
    const value = toNumber(form[context]);
    if (Number.isNaN(value) || value < 0) {
      setError("Informe um valor maior ou igual a zero.");
      return;
    }
    setSavingKey(context);
    setError("");
    setNotice("");
    try {
      await saveApprovalThreshold(context, value);
      setNotice("Alçada salva e registrada na auditoria.");
      await query.reload();
    } catch (err) {
      setError(err?.message || "Não foi possível salvar a alçada.");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <AsyncState result={query}>
      {(rows) => (
        <Card title="Alçadas de aprovação" subtitle="Valor até o qual a operação se aprova sozinha (perda de material e desconto de garantia)">
          <p className={styles.helper}>
            Alterar a alçada exige a permissão própria de alçada e a verificação MFA recente. Sem alçada configurada,
            nenhuma perda ou desconto se aprova sozinho.
          </p>
          {notice ? <Alert tone="success" className={styles.notice}>{notice}</Alert> : null}
          {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
          {CONTEXTS.map((c) => {
            const row = (rows || []).find((r) => r.context === c.key);
            return (
              <div key={c.key} className={styles.thresholdRow}>
                <FormField label={`${c.label} (R$)`} htmlFor={`alcada-${c.key}`} helper={c.helper}>
                  <DecimalInput id={`alcada-${c.key}`} value={form[c.key]} onChange={(e) => setForm((p) => ({ ...p, [c.key]: e.target.value }))} placeholder="Ex: 1.000,00" />
                </FormField>
                <p className={styles.current}>
                  {row && row.configured
                    ? `Vigente: ${formatBRL(row.maxAutoApproveAmount)}${row.updatedAt ? ` (alterada em ${formatDateTime(row.updatedAt)})` : ""}.`
                    : "Não configurada: nada se aprova sozinho."}
                </p>
                <Button size="sm" onClick={() => handleSave(c.key)} loading={savingKey === c.key} disabled={!form[c.key] || Number.isNaN(toNumber(form[c.key]))}>
                  <Icon name="check" size={16} /> Salvar alçada
                </Button>
              </div>
            );
          })}
        </Card>
      )}
    </AsyncState>
  );
}
