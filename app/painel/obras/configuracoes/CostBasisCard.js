"use client";

// Marco 6 (matriz de fechamento, 10/11/2026): base do custo financeiro realizado das obras. O Caderno (§5) pede
// "actual_financial_cost" sem dizer se é caixa ou competência; pela regra do projeto, lacuna do livro vira
// parâmetro da empresa. Padrão CAIXA (como sempre foi). A API valida o valor, exige construction:approve e
// registra a alteração na auditoria com antes/depois.
import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import Radio from "@/components/atoms/Radio/Radio";
import { getCostBasisSetting, updateCostBasisSetting } from "@/lib/api/construction";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const LABELS = {
  CAIXA: "Caixa: só o que já foi pago",
  COMPETENCIA: "Competência: inclui as medições aprovadas ainda a pagar",
};

export default function CostBasisCard() {
  const [current, setCurrent] = useState(null);
  const [choice, setChoice] = useState("CAIXA");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getCostBasisSetting()
      .then((data) => { setCurrent(data); setChoice(data?.base || "CAIXA"); })
      .catch((err) => setError(err?.message || "Não foi possível carregar a base do custo realizado."));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await updateCostBasisSetting(choice);
      setCurrent(data);
      setNotice(`Base do custo realizado salva: ${LABELS[data.base]}.`);
    } catch (err) {
      setError(err?.message || "Não foi possível salvar a base do custo realizado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Custo realizado das obras" subtitle="Base usada na Saúde da obra, na margem projetada e no bloqueio por margem">
      <p className={styles.helper}>
        Em Caixa, o custo realizado soma só os pagamentos já feitos. Em Competência, as medições aprovadas que ainda
        estão a pagar também entram no custo realizado, no custo projetado e na margem. A mudança vale para todas as
        obras da empresa a partir do próximo cálculo e fica registrada na auditoria.
      </p>
      {current ? (
        <p className={styles.current}>
          Base vigente: {LABELS[current.base]}
          {current.configured && current.updatedAt ? ` (alterada em ${formatDateTime(current.updatedAt)})` : " (padrão do sistema)"}.
        </p>
      ) : null}
      {notice ? <Alert tone="success" className={styles.notice}>{notice}</Alert> : null}
      {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
      <FormField label="Base do custo realizado" htmlFor="cost-basis-caixa">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {Object.entries(LABELS).map(([value, label]) => (
            <Radio key={value} id={`cost-basis-${value.toLowerCase()}`} name="costBasis" label={label} checked={choice === value} onChange={() => setChoice(value)} />
          ))}
        </div>
      </FormField>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Button onClick={handleSave} loading={saving} disabled={!current || choice === current.base}>
          <Icon name="check" size={16} /> Salvar base do custo realizado
        </Button>
      </div>
    </Card>
  );
}
