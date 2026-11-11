"use client";

// Verificação independente do Marco 6: parâmetros de Obras que o livro deixa em aberto.
//  - M6-21 (Guia §6 "approveMeasurement(): ... evidências"): quantas evidências a medição precisa ter para ser aprovada.
//  - M6-108 (Caderno §6 "ausência de diário gera tarefa conforme regra"): a regra do diário ausente da empresa.
// A API valida cada valor, exige construction:approve e registra antes/depois na auditoria (serviço de parâmetros).
import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Select from "@/components/atoms/Select/Select";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { getConstructionParameters, updateConstructionParameters } from "@/lib/api/constructionConfig";
import { toNumber } from "@/lib/format";
import styles from "./page.module.css";

const P = "construction.diario_ausente.";
const K = {
  minEvidence: "construction.medicao.evidencias_minimas",
  enabled: `${P}ativo`,
  statuses: `${P}status_obra`,
  weekdays: `${P}dias_semana`,
  holidays: `${P}considerar_feriados`,
  priority: `${P}prioridade_tarefa`,
  docsEnabled: `${P}documentos_ativo`,
  docsWindow: `${P}documentos_janela_dias`,
  docsPriority: `${P}documentos_prioridade`,
};
const STATUSES = [["PLANNED", "Planejada"], ["BUDGETED", "Orçamento aprovado"], ["READY", "Pronta para iniciar"], ["ACTIVE", "Em execução"], ["PAUSED", "Pausada"], ["FINAL_INSPECTION", "Inspeção final"]];
const WEEKDAYS = [["1", "Seg"], ["2", "Ter"], ["3", "Qua"], ["4", "Qui"], ["5", "Sex"], ["6", "Sáb"], ["0", "Dom"]];
const PRIORITIES = [["LOW", "Baixa"], ["NORMAL", "Normal"], ["MEDIUM", "Média"], ["HIGH", "Alta"], ["URGENT", "Urgente"]];

const listOf = (text) => String(text || "").split(",").map((v) => v.trim()).filter(Boolean);

export default function ConstructionParametersCard() {
  const query = useAsyncState(() => getConstructionParameters(), { key: "obras-config-parametros", isEmpty: () => false });
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!query.data) return;
    const v = query.data.values;
    setForm({
      minEvidence: String(v[K.minEvidence]),
      enabled: v[K.enabled] !== false,
      statuses: listOf(v[K.statuses]),
      weekdays: listOf(v[K.weekdays]),
      holidays: v[K.holidays] === true,
      priority: v[K.priority],
      docsEnabled: v[K.docsEnabled] !== false,
      docsWindow: String(v[K.docsWindow]),
      docsPriority: v[K.docsPriority],
    });
  }, [query.data]);

  const toggle = (field, value) => setForm((p) => ({ ...p, [field]: p[field].includes(value) ? p[field].filter((x) => x !== value) : [...p[field], value] }));
  const minEvidence = form ? toNumber(form.minEvidence) : NaN;
  const docsWindow = form ? toNumber(form.docsWindow) : NaN;
  const isValid = Boolean(form) && Number.isInteger(minEvidence) && minEvidence >= 0 && Number.isInteger(docsWindow) && docsWindow >= 1 && form.statuses.length > 0 && form.weekdays.length > 0;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updateConstructionParameters({
        [K.minEvidence]: minEvidence,
        [K.enabled]: form.enabled,
        [K.statuses]: form.statuses.join(","),
        [K.weekdays]: form.weekdays.join(","),
        [K.holidays]: form.holidays,
        [K.priority]: form.priority,
        [K.docsEnabled]: form.docsEnabled,
        [K.docsWindow]: docsWindow,
        [K.docsPriority]: form.docsPriority,
      });
      setNotice("Parâmetros de Obras salvos e registrados na auditoria.");
      await query.reload();
    } catch (err) {
      setError(err?.message || "Não foi possível salvar os parâmetros de Obras.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AsyncState result={query}>
      {() => (form ? (
        <Card title="Medição e diário de obra" subtitle="Evidência exigida na aprovação da medição e regra do diário ausente">
          {notice ? <Alert tone="success" className={styles.notice}>{notice}</Alert> : null}
          {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
          <FormField label="Evidências mínimas para aprovar uma medição" htmlFor="param-min-evidence" helper="A aprovação sempre confere as evidências anexadas; aqui você define quantas são obrigatórias (0 = nenhuma).">
            <DecimalInput id="param-min-evidence" value={form.minEvidence} onChange={(e) => setForm((p) => ({ ...p, minEvidence: e.target.value }))} />
          </FormField>
          <p className={styles.helper}>Diário de obra ausente: o sistema cria uma tarefa para o responsável da obra quando falta o diário de um dia exigido.</p>
          <Checkbox id="param-enabled" label="Criar tarefa quando faltar o diário" checked={form.enabled} onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))} />
          <FormField label="Situações da obra que exigem diário" htmlFor="param-status-ACTIVE">
            <div className={styles.checkRow}>
              {STATUSES.map(([value, label]) => <Checkbox key={value} id={`param-status-${value}`} label={label} checked={form.statuses.includes(value)} onChange={() => toggle("statuses", value)} />)}
            </div>
          </FormField>
          <FormField label="Dias da semana em que o diário é exigido" htmlFor="param-day-1">
            <div className={styles.checkRow}>
              {WEEKDAYS.map(([value, label]) => <Checkbox key={value} id={`param-day-${value}`} label={label} checked={form.weekdays.includes(value)} onChange={() => toggle("weekdays", value)} />)}
            </div>
          </FormField>
          <Checkbox id="param-holidays" label="Não exigir diário nos feriados do calendário da empresa" checked={form.holidays} onChange={(e) => setForm((p) => ({ ...p, holidays: e.target.checked }))} />
          <div className={styles.grid}>
            <FormField label="Prioridade da tarefa de diário" htmlFor="param-priority">
              <Select id="param-priority" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormField>
            <FormField label="Janela da documentação do prestador (dias)" htmlFor="param-docs-window">
              <DecimalInput id="param-docs-window" value={form.docsWindow} onChange={(e) => setForm((p) => ({ ...p, docsWindow: e.target.value }))} />
            </FormField>
            <FormField label="Prioridade da tarefa de documentação" htmlFor="param-docs-priority">
              <Select id="param-docs-priority" value={form.docsPriority} onChange={(e) => setForm((p) => ({ ...p, docsPriority: e.target.value }))}>
                {PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormField>
          </div>
          <Checkbox id="param-docs-enabled" label="Criar tarefa quando faltar a documentação do prestador" checked={form.docsEnabled} onChange={(e) => setForm((p) => ({ ...p, docsEnabled: e.target.checked }))} />
          <div className={styles.actions}>
            <Button onClick={handleSave} loading={saving} disabled={!isValid}>
              <Icon name="check" size={16} /> Salvar parâmetros
            </Button>
          </div>
        </Card>
      ) : null)}
    </AsyncState>
  );
}
