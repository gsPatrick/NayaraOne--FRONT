"use client";

// Detalhe do modelo (Caderno M5 §4/§6/§19): cláusulas da versão vigente, adicionar cláusula da biblioteca, histórico de
// versões e publicação (alçada jurídica). Modelo publicado não é editado: mexer cria a próxima versão em rascunho.
import { useCallback, useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { addClauseToContractTemplate, listContractTemplateVersions, publishContractTemplate } from "@/lib/api/legal";
import { CONTRACT_TYPE_LABELS, TEMPLATE_VERSION_STATUS_LABELS, TEMPLATE_VERSION_STATUS_TONE } from "@/lib/labels/juridico";
import { useHasPermission } from "@/lib/rbac/useHasPermission";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { userNameOf } from "@/lib/legal/useActiveUsers";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function TemplateDetail({ template, clauses, templateClauses, users, onChanged }) {
  const canPublish = useHasPermission("legal:approve");
  const { confirm, ConfirmDialog } = useConfirm();
  const [versions, setVersions] = useState([]);
  const [versionsError, setVersionsError] = useState("");
  const [clauseToAdd, setClauseToAdd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadVersions = useCallback(() => {
    setVersionsError("");
    return listContractTemplateVersions(template.id)
      .then((list) => setVersions(Array.isArray(list) ? list : []))
      .catch((err) => setVersionsError(legalErrorMessage(err, "Não foi possível carregar as versões do modelo.")));
  }, [template.id]);

  useEffect(() => {
    setError("");
    setNotice("");
    setClauseToAdd("");
    loadVersions();
  }, [loadVersions]);

  const latest = versions[versions.length - 1] || null;
  const draft = versions.find((v) => v.status === "DRAFT") || null;
  const usedIds = new Set(templateClauses.map((c) => c.contractClauseId));
  const available = clauses.filter((c) => c.isActive && !usedIds.has(c.id) && !templateClauses.some((t) => t.code === c.code));

  async function handleAddClause() {
    if (!clauseToAdd) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await addClauseToContractTemplate(template.id, { contractClauseId: clauseToAdd });
      setClauseToAdd("");
      setNotice(latest && latest.status !== "DRAFT"
        ? "Cláusula incluída numa nova versão em rascunho do modelo (a versão publicada continua igual)."
        : "Cláusula incluída na versão em rascunho do modelo.");
      await loadVersions();
      onChanged();
    } catch (err) {
      setError(legalErrorMessage(err, "Erro ao adicionar a cláusula ao modelo."));
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    if (!draft) return;
    const ok = await confirm({
      title: `Publicar a versão ${draft.versionNumber} do modelo "${template.name}"?`,
      message: "A versão publicada passa a valer para os novos contratos e não é mais editada: qualquer mudança cria a próxima versão em rascunho. A versão publicada anterior fica como substituída.",
      confirmLabel: "Publicar versão",
    });
    if (!ok) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await publishContractTemplate(template.id);
      setNotice(`Versão ${draft.versionNumber} publicada.`);
      await loadVersions();
      onChanged();
    } catch (err) {
      setError(legalErrorMessage(err, "Erro ao publicar o modelo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.section}>
      <Card
        title={template.name}
        subtitle={`${CONTRACT_TYPE_LABELS[template.contractType] || "Tipo de contrato"} · responsável jurídico: ${userNameOf(users, template.legalResponsibleUserId) || "não definido"}`}
        actions={draft && canPublish ? <Button size="sm" onClick={handlePublish} loading={busy} disabled={busy}>Publicar versão {draft.versionNumber}</Button> : null}
      >
        {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
        {notice ? <Alert tone="success" className={styles.notice}>{notice}</Alert> : null}
        <Alert tone="info" className={styles.notice}>
          Modelo publicado não é editado: incluir ou atualizar cláusula cria a próxima versão em rascunho, que só vale depois de publicada por quem tem aprovação jurídica.
        </Alert>
        {draft && !canPublish ? (
          <p className={styles.meta}>A versão {draft.versionNumber} está em rascunho. Publicar exige a permissão de aprovação jurídica.</p>
        ) : null}

        <h3 className={styles.name}>Cláusulas da versão {latest ? latest.versionNumber : "atual"}</h3>
        {templateClauses.length === 0 ? (
          <p className={styles.emptyText}>Nenhuma cláusula neste modelo ainda. Modelo sem cláusulas não pode ser publicado.</p>
        ) : (
          <div className={styles.list}>
            {templateClauses.map((c) => (
              <div key={c.contractClauseId} className={styles.row} data-testid="template-clause">
                <div className={styles.rowButton} style={{ cursor: "default" }}>
                  <span className={styles.name}>{c.title}</span>
                  <span className={styles.meta}>Versão {c.linkedVersionNumber} da cláusula{c.superseded ? ` · existe a versão ${c.latestVersionNumber} na biblioteca` : ""}</span>
                </div>
                {c.superseded ? <Badge tone="warning">Cláusula desatualizada</Badge> : <Badge tone="success">Vigente</Badge>}
              </div>
            ))}
          </div>
        )}

        <div className={styles.inline} style={{ marginTop: "var(--space-3)" }}>
          <FormField label="Adicionar cláusula da biblioteca" htmlFor="f-tpl-add-clause">
            <Select id="f-tpl-add-clause" value={clauseToAdd} onChange={(e) => setClauseToAdd(e.target.value)}>
              <option value="">{available.length ? "Selecione a cláusula" : "Nenhuma cláusula ativa disponível"}</option>
              {available.map((c) => <option key={c.id} value={c.id}>{c.title} (versão {c.versionNumber})</option>)}
            </Select>
          </FormField>
          <Button variant="secondary" onClick={handleAddClause} loading={busy} disabled={busy || !clauseToAdd}>Adicionar cláusula</Button>
        </div>
      </Card>

      <Card title="Versões do modelo" subtitle="Histórico preservado: rascunho, publicada e substituída">
        {versionsError ? <Alert tone="danger" className={styles.notice}>{versionsError}</Alert> : null}
        {versions.length === 0 ? (
          <EmptyState icon="document" title="Sem versões" description="O modelo ainda não tem versão registrada." />
        ) : (
          <div className={styles.list}>
            {[...versions].reverse().map((v) => (
              <div key={v.id} className={styles.row} data-testid="template-version">
                <div className={styles.rowButton} style={{ cursor: "default" }}>
                  <span className={styles.name}>Versão {v.versionNumber}</span>
                  <span className={styles.meta}>
                    Responsável jurídico: {userNameOf(users, v.legalResponsibleUserId) || "não definido"}
                    {v.publishedAt ? ` · publicada em ${formatDateTime(v.publishedAt)} por ${userNameOf(users, v.publishedBy) || "usuário da empresa"}` : ""}
                  </span>
                </div>
                <Badge tone={TEMPLATE_VERSION_STATUS_TONE[v.status] || "neutral"}>{TEMPLATE_VERSION_STATUS_LABELS[v.status] || "Situação desconhecida"}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
      <ConfirmDialog />
    </div>
  );
}
