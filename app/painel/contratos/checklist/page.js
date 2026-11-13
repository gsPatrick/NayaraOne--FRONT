"use client";

// Política do checklist documental (Caderno M5 §7 "Requirements são gerados por tipo de contrato + regras + características das
// partes/imóvel"; Guia §20 "Requirements engine integrado ao Motor de Regras"). A regra REG-JUR-001 da empresa: o modelo de cada
// tipo de contrato, os itens, a etapa e a condição (sobre partes e imóvel). Publicar nova versão exige a alçada jurídica e motivo;
// a versão vigente nunca é editada.
import { useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { useHasPermission } from "@/lib/rbac/useHasPermission";
import { getRequirementRules, listRequirementRuleVersions, publishRequirementRules } from "@/lib/api/legal";
import { policyRows, parsePolicyJson, reasonError } from "@/lib/legal/requirementRules";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

async function loadPolicy() {
  const [current, versions] = await Promise.all([getRequirementRules(), listRequirementRuleVersions()]);
  return { current, versions: Array.isArray(versions) ? versions : [] };
}

export default function ChecklistPolicyPage() {
  const canPublish = useHasPermission("legal:approve");
  const query = useAsyncState(loadPolicy, { key: "contratos-checklist-regra", isEmpty: () => false });
  const current = query.data && query.data.current;
  const facts = useMemo(() => (current && current.catalog && current.catalog.facts) || {}, [current]);
  const rows = useMemo(() => policyRows(current && current.action, facts), [current, facts]);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit() {
    setText(JSON.stringify(current.action, null, 2));
    setReason("");
    setFormError("");
    setEditing(true);
  }

  async function handlePublish() {
    const parsed = parsePolicyJson(text);
    const why = reasonError(reason);
    if (!parsed.ok || why) { setFormError(parsed.ok ? why : parsed.error); return; }
    setBusy(true);
    setFormError("");
    try {
      const published = await publishRequirementRules({ action: parsed.action, reason: reason.trim() });
      setNotice(`Política publicada na versão ${published.version.versionNumber}. Os próximos checklists seguem esta versão.`);
      setEditing(false);
      await query.reload();
    } catch (err) {
      setFormError(legalErrorMessage(err, "Não foi possível publicar a política."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Política do checklist documental" backHref="/painel/contratos">
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <AsyncState result={query} loadingLabel="Carregando a política...">
        {current ? (
          <div className={styles.section}>
            <Card
              title={`Regra ${current.ruleCode}`}
              subtitle={current.version
                ? `Versão ${current.version.versionNumber} em vigor desde ${formatDateTime(current.version.effectiveFrom)}`
                : "Padrão do Caderno: vira a versão 1 na primeira geração de checklist da empresa"}
              actions={canPublish && !editing ? <Button size="sm" onClick={startEdit} data-testid="policy-edit">Nova versão</Button> : null}
            >
              <p className={styles.meta}>O checklist de cada contrato sai do modelo do tipo dele, filtrado pelas condições sobre as partes e o imóvel do cadastro. Ninguém escolhe o modelo na tela do contrato.</p>
              {rows.map((r) => (
                <div key={r.type} className={styles.group}>
                  <div className={styles.groupTitle}>{r.typeLabel} <Badge tone="neutral">modelo {r.templateKey}</Badge></div>
                  <ul className={styles.items}>
                    {r.items.map((it) => (
                      <li key={it.code}><strong>{it.description}</strong> <span className={styles.meta}>· {it.stage} · {it.condition}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </Card>
            {editing ? (
              <Card title="Publicar nova versão" subtitle="A versão em vigor é fechada e preservada; a nova vale para os próximos checklists">
                {formError ? <Alert tone="danger">{formError}</Alert> : null}
                <FormField label="Política (JSON: modelos e tipo de contrato -> modelo)" htmlFor="policy-json">
                  <textarea id="policy-json" className={styles.textarea} rows={18} value={text} onChange={(e) => setText(e.target.value)} />
                </FormField>
                <p className={styles.meta}>Fatos aceitos nas condições: {Object.entries(facts).map(([k, v]) => `${k} (${v})`).join("; ")}</p>
                <FormField label="Motivo da nova versão" htmlFor="policy-reason">
                  <Input id="policy-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
                </FormField>
                <div className={styles.inline}>
                  <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>Cancelar</Button>
                  <Button onClick={handlePublish} disabled={busy} data-testid="policy-publish">Publicar nova versão</Button>
                </div>
              </Card>
            ) : null}
            <Card title="Histórico de versões">
              <ul className={styles.items}>
                {query.data.versions.map((v) => (
                  <li key={v.id}>Versão {v.versionNumber} · {v.effectiveUntil ? `de ${formatDateTime(v.effectiveFrom)} até ${formatDateTime(v.effectiveUntil)}` : `em vigor desde ${formatDateTime(v.effectiveFrom)}`}</li>
                ))}
                {query.data.versions.length === 0 ? <li className={styles.meta}>Nenhuma versão publicada ainda.</li> : null}
              </ul>
            </Card>
          </div>
        ) : null}
      </AsyncState>
      <StickyActionBar>
        <ContractsNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
