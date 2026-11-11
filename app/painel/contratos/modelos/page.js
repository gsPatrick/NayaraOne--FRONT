"use client";

// Modelos de contrato versionados (Caderno M5 §4 legal.template_versions, §6 "Modelo publicado não é editado; nova
// versão é criada", §19 "Alterar modelo/cláusula | Governança/versionamento"; JUR-002 responsável jurídico).
// As cláusulas da versão vigente de cada modelo vêm do uso das cláusulas (GET /legal/clauses/:code/template-usage),
// que a API já filtra para a versão vigente do modelo.
import { useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listContractTemplates, listClauses, getClauseTemplateUsage } from "@/lib/api/legal";
import { CONTRACT_TYPE_LABELS } from "@/lib/labels/juridico";
import { useActiveUsers, userNameOf } from "@/lib/legal/useActiveUsers";
import { reportLookupProblem } from "@/lib/asyncState/lookup";
import TemplateCreateModal from "./TemplateCreateModal";
import TemplateDetail from "./TemplateDetail";
import styles from "./page.module.css";

async function loadTemplatesAndClauses() {
  const [templates, clauses] = await Promise.all([listContractTemplates(), listClauses()]);
  const clauseList = Array.isArray(clauses) ? clauses : [];
  const codes = [...new Set(clauseList.map((c) => c.code))];
  const usageByTemplate = {};
  await Promise.all(
    codes.map((code) =>
      getClauseTemplateUsage(code)
        .then((usage) => {
          for (const u of usage || []) {
            const clause = clauseList.find((c) => c.id === u.contractClauseId);
            (usageByTemplate[u.templateId] = usageByTemplate[u.templateId] || []).push({ ...u, code, title: clause ? clause.title : code });
          }
        })
        .catch((error) => reportLookupProblem("as cláusulas dos modelos", error))
    )
  );
  return { templates: Array.isArray(templates) ? templates : [], clauses: clauseList, usageByTemplate };
}

export default function ModelosPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [notice, setNotice] = useState("");
  const usersState = useActiveUsers(true);

  const query = useAsyncState(loadTemplatesAndClauses, { key: "contratos-modelos", isEmpty: () => false });
  const data = query.data;
  const templates = useMemo(() => data?.templates || [], [data]);
  const selected = templates.find((t) => t.id === selectedId) || templates[0] || null;
  const templateClauses = selected ? (data?.usageByTemplate?.[selected.id] || []) : [];

  return (
    <AppShell title="Modelos de contrato" backHref="/painel/contratos">
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <AsyncState result={query} loadingLabel="Carregando modelos...">
        <div className={styles.layout}>
          <Card
            title="Modelos"
            subtitle="Cada modelo tem versões numeradas e um responsável jurídico"
            actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Icon name="plus" size={16} /> Novo modelo</Button>}
          >
            {templates.length === 0 ? (
              <EmptyState icon="document" title="Nenhum modelo cadastrado" description="Crie o primeiro modelo e inclua as cláusulas da biblioteca." />
            ) : (
              <div className={styles.list}>
                {templates.map((t) => (
                  <div key={t.id} className={[styles.row, selected && selected.id === t.id ? styles.rowActive : ""].filter(Boolean).join(" ")}>
                    <button type="button" className={styles.rowButton} onClick={() => setSelectedId(t.id)} aria-pressed={Boolean(selected && selected.id === t.id)}>
                      <span className={styles.name}>{t.name}</span>
                      <span className={styles.meta}>
                        {CONTRACT_TYPE_LABELS[t.contractType] || "Tipo de contrato"} · {(data?.usageByTemplate?.[t.id] || []).length} cláusula(s) · responsável: {userNameOf(usersState.users, t.legalResponsibleUserId) || "não definido"}
                      </span>
                    </button>
                    <Badge tone={t.isActive ? "success" : "neutral"}>{t.isActive ? "Ativo" : "Inativo"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
          {selected ? (
            <TemplateDetail
              key={selected.id}
              template={selected}
              clauses={data?.clauses || []}
              templateClauses={templateClauses}
              users={usersState.users}
              onChanged={() => query.reload()}
            />
          ) : null}
        </div>
      </AsyncState>

      <StickyActionBar>
        <ContractsNavMenu />
      </StickyActionBar>

      <TemplateCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          setCreateOpen(false);
          setSelectedId(created.id);
          setNotice(`Modelo "${created.name}" criado com a versão 1 em rascunho.`);
          query.reload();
        }}
      />
    </AppShell>
  );
}
