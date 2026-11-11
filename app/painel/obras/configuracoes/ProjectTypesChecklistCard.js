"use client";

// Verificação independente do Marco 6 (M6-12/M6-86), Caderno §9 "Checklist por etapa/tipo de obra; falha abre
// nonconformity". O administrador cadastra os tipos de obra e, para cada tipo, os itens de checklist por etapa (código
// da etapa) ou da obra inteira, com a severidade da não conformidade que a reprovação abre. A obra recebe os itens do
// seu tipo automaticamente (e pelo botão "Aplicar checklist" na tela de Qualidade).
import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import Badge from "@/components/atoms/Badge/Badge";
import Table from "@/components/organisms/Table/Table";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listProjectTypes, createProjectType, updateProjectType, listChecklistTemplates, createChecklistTemplate, updateChecklistTemplate } from "@/lib/api/constructionConfig";
import styles from "./page.module.css";

const CATEGORIES = [["ESTRUTURA", "Estrutura"], ["HIDRAULICA", "Hidráulica"], ["ELETRICA", "Elétrica"], ["ALVENARIA", "Alvenaria"], ["ACABAMENTO", "Acabamento"], ["PINTURA", "Pintura"], ["OUTROS", "Outros"]];
const SEVERITIES = [["CRITICAL", "Crítica (bloqueia a entrega)"], ["HIGH", "Alta"], ["MEDIUM", "Média"], ["LOW", "Baixa"]];
const label = (list, key) => (list.find(([k]) => k === key) || [key, key])[1];
const EMPTY_ITEM = { stageCode: "", item: "", category: "ESTRUTURA", failureSeverity: "MEDIUM" };

export default function ProjectTypesChecklistCard() {
  const typesQuery = useAsyncState(() => listProjectTypes(), { key: "obras-config-tipos", isEmpty: () => false });
  const [selectedId, setSelectedId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [typeForm, setTypeForm] = useState({ code: "", name: "" });
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const types = typesQuery.data || [];
  useEffect(() => {
    if (!selectedId && types.length) setSelectedId(types[0].id);
  }, [types, selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    listChecklistTemplates(selectedId).then((rows) => setTemplates(rows || [])).catch((err) => setError(err?.message || "Não foi possível carregar o checklist."));
  }, [selectedId]);

  async function run(key, fn, message) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(message);
    } catch (err) {
      setError(err?.message || "Não foi possível salvar.");
    } finally {
      setBusy("");
    }
  }

  const addType = () => run("type", async () => {
    const created = await createProjectType({ code: typeForm.code.trim(), name: typeForm.name.trim() });
    setTypeForm({ code: "", name: "" });
    await typesQuery.reload();
    setSelectedId(created.id);
  }, "Tipo de obra cadastrado.");

  const toggleType = (t) => run(`t-${t.id}`, async () => { await updateProjectType(t.id, { active: !t.active }); await typesQuery.reload(); }, t.active ? "Tipo de obra desativado." : "Tipo de obra reativado.");

  const addItem = () => run("item", async () => {
    await createChecklistTemplate({ projectTypeId: selectedId, stageCode: itemForm.stageCode.trim() || null, item: itemForm.item.trim(), category: itemForm.category, failureSeverity: itemForm.failureSeverity });
    setItemForm(EMPTY_ITEM);
    setTemplates((await listChecklistTemplates(selectedId)) || []);
  }, "Item de checklist incluído.");

  const toggleItem = (it) => run(`i-${it.id}`, async () => {
    await updateChecklistTemplate(it.id, { active: !it.active });
    setTemplates((await listChecklistTemplates(selectedId)) || []);
  }, it.active ? "Item desativado." : "Item reativado.");

  return (
    <AsyncState result={typesQuery}>
      {() => (
        <Card title="Tipos de obra e checklist de qualidade" subtitle="Checklist por tipo de obra e por etapa; a reprovação de um item abre não conformidade">
          {notice ? <Alert tone="success" className={styles.notice}>{notice}</Alert> : null}
          {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
          <div className={styles.grid}>
            <FormField label="Código do tipo" htmlFor="tipo-code"><Input id="tipo-code" value={typeForm.code} onChange={(e) => setTypeForm((p) => ({ ...p, code: e.target.value }))} placeholder="Ex: CASA" /></FormField>
            <FormField label="Nome do tipo" htmlFor="tipo-name"><Input id="tipo-name" value={typeForm.name} onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Casa térrea" /></FormField>
          </div>
          <div className={styles.actions}>
            <Button size="sm" onClick={addType} loading={busy === "type"} disabled={!typeForm.code.trim() || !typeForm.name.trim()}><Icon name="plus" size={16} /> Cadastrar tipo de obra</Button>
          </div>
          <Table
            columns={[{ key: "code", label: "Código" }, { key: "name", label: "Tipo de obra" }, { key: "status", label: "Situação" }, { key: "acoes", label: "" }]}
            rows={types.map((t) => ({
              id: t.id,
              code: t.code,
              name: <button type="button" className={styles.linkButton} onClick={() => setSelectedId(t.id)} aria-pressed={t.id === selectedId}>{t.name}</button>,
              status: <Badge tone={t.active ? "success" : "neutral"}>{t.active ? "Ativo" : "Inativo"}</Badge>,
              acoes: <Button size="sm" variant="ghost" onClick={() => toggleType(t)} loading={busy === `t-${t.id}`}>{t.active ? "Desativar" : "Reativar"}</Button>,
            }))}
            emptyMessage="Nenhum tipo de obra cadastrado."
          />
          {selectedId ? (
            <>
              <h3 className={styles.sectionTitle}>Checklist do tipo &quot;{(types.find((t) => t.id === selectedId) || {}).name}&quot;</h3>
              <div className={styles.grid}>
                <FormField label="Código da etapa" htmlFor="item-stage" helper="Vazio = item da obra inteira"><Input id="item-stage" value={itemForm.stageCode} onChange={(e) => setItemForm((p) => ({ ...p, stageCode: e.target.value }))} placeholder="Ex: FUND" /></FormField>
                <FormField label="Item a verificar" htmlFor="item-text"><Input id="item-text" value={itemForm.item} onChange={(e) => setItemForm((p) => ({ ...p, item: e.target.value }))} placeholder="Ex: Prumo das sapatas" /></FormField>
                <FormField label="Categoria" htmlFor="item-category">
                  <Select id="item-category" value={itemForm.category} onChange={(e) => setItemForm((p) => ({ ...p, category: e.target.value }))}>{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                </FormField>
                <FormField label="Severidade da não conformidade" htmlFor="item-severity">
                  <Select id="item-severity" value={itemForm.failureSeverity} onChange={(e) => setItemForm((p) => ({ ...p, failureSeverity: e.target.value }))}>{SEVERITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                </FormField>
              </div>
              <div className={styles.actions}>
                <Button size="sm" onClick={addItem} loading={busy === "item"} disabled={!itemForm.item.trim()}><Icon name="plus" size={16} /> Incluir item no checklist</Button>
              </div>
              <Table
                columns={[{ key: "stage", label: "Etapa" }, { key: "item", label: "Item" }, { key: "category", label: "Categoria" }, { key: "severity", label: "NC na reprovação" }, { key: "acoes", label: "" }]}
                rows={templates.map((it) => ({
                  id: it.id,
                  stage: it.stageCode || "Obra inteira",
                  item: it.active ? it.item : `${it.item} (inativo)`,
                  category: label(CATEGORIES, it.category),
                  severity: label(SEVERITIES, it.failureSeverity),
                  acoes: <Button size="sm" variant="ghost" onClick={() => toggleItem(it)} loading={busy === `i-${it.id}`}>{it.active ? "Desativar" : "Reativar"}</Button>,
                }))}
                emptyMessage="Nenhum item de checklist para este tipo."
              />
            </>
          ) : null}
        </Card>
      )}
    </AsyncState>
  );
}
