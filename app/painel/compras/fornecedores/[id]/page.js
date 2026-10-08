"use client";

import { useEffect, useRef, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { getPerson } from "@/lib/api/people";
import { listSupplierQualifications, upsertSupplierQualification, decideSupplierDueDiligence, listSupplierEvaluations } from "@/lib/api/procurement";
import { listBankAccounts } from "@/lib/api/finance";
import { getFileMeta } from "@/lib/api/files";
import { uploadFile } from "@/lib/api/legal";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatDate, formatDateTime, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE } from "@/lib/format";
import { maskAccountNumber, maskPixKey } from "@/lib/mask";
import { getBankName } from "@/lib/mock/banks";
import { BANK_ACCOUNT_STATUS_LABELS, BANK_ACCOUNT_STATUS_TONE, bankAccountCooldownRemainingHours } from "@/lib/mock/finance";
import { DUE_DILIGENCE_LABELS, DUE_DILIGENCE_TONE, isQualificationExpired, awardBlockReason } from "@/lib/procurement/supplierQualification";

const SECTION_GAP = { display: "flex", flexDirection: "column", gap: "var(--space-4)" };
const ROW_STYLE = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--color-border)" };

// Ficha do fornecedor (Compras, Marco 7) — `id` é o personId do fornecedor (fornecedor é uma
// Person, ver procurement.service.js). Auditoria contratual 2026-10-07: "Fornecedores: cadastro
// mestre; banco via fluxo IAM blindado; documentos/vigência; due diligence para alto risco".
export default function FornecedorDetailPage({ params }) {
  const supplierId = params.id;
  const [person, setPerson] = useState(null);
  const [qualification, setQualification] = useState(null);
  const [documents, setDocuments] = useState([]); // [{ id, fileName }]
  const [evaluations, setEvaluations] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountsError, setBankAccountsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(null);

  const [form, setForm] = useState({ highRisk: false, validUntil: "" });
  const [validUntilInvalid, setValidUntilInvalid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deciding, setDeciding] = useState(null); // "APPROVED" | "REJECTED"
  const [viewerFile, setViewerFile] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const decisionNotesRef = useRef("");

  // Permissões lidas só depois do mount (sessão vive no localStorage) — a API é quem decide de
  // fato: upsert exige procurement:create, decisão exige procurement:approve.
  const [canEdit, setCanEdit] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  useEffect(() => {
    setCanEdit(hasPermission("procurement:create"));
    setCanApprove(hasPermission("procurement:approve"));
  }, []);

  async function loadDocuments(fileIds) {
    const metas = await Promise.all(
      (fileIds || []).map((fid) => getFileMeta(fid).then((m) => ({ id: fid, fileName: m?.fileName || null })).catch(() => ({ id: fid, fileName: null })))
    );
    setDocuments(metas);
  }

  function applyQualification(q) {
    setQualification(q || null);
    setForm({ highRisk: Boolean(q?.highRisk), validUntil: q?.validUntil || "" });
    setValidUntilInvalid(false);
    loadDocuments(q?.documentFileIds || []);
  }

  async function loadAll() {
    setLoading(true);
    setLoadError("");
    try {
      const [p, qs, ev] = await Promise.all([
        getPerson(supplierId),
        listSupplierQualifications(supplierId),
        listSupplierEvaluations(supplierId).catch(() => null),
      ]);
      setPerson(p);
      applyQualification((qs || [])[0] || null);
      setEvaluations(ev);
    } catch (err) {
      if (err?.status === 404) setNotFoundFlag(true);
      else setLoadError(err?.message || "Não foi possível carregar o fornecedor.");
    } finally {
      setLoading(false);
    }
    // Contas bancárias vêm do Financeiro (finance:read) — quem só tem Compras não vê, mas o resto
    // da ficha continua funcionando.
    try {
      setBankAccounts((await listBankAccounts({ ownerPersonId: supplierId })) || []);
      setBankAccountsError("");
    } catch (err) {
      setBankAccounts([]);
      setBankAccountsError(err?.status === 403 ? "Você não tem permissão para ver as contas bancárias (Financeiro)." : err?.message || "Não foi possível carregar as contas bancárias.");
    }
  }

  useEffect(() => { loadAll(); }, [supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (notFoundFlag) return notFound();

  async function save(overrides = {}) {
    const payload = {
      supplierPersonId: supplierId,
      highRisk: form.highRisk,
      validUntil: form.validUntil,
      documentFileIds: documents.map((d) => d.id),
      ...overrides,
    };
    const updated = await upsertSupplierQualification(payload);
    applyQualification(updated);
    return updated;
  }

  async function handleSave() {
    if (validUntilInvalid) return;
    setSaving(true);
    setActionError("");
    setNotice(null);
    try {
      const updated = await save();
      setNotice(
        updated.highRisk && updated.dueDiligenceStatus === "PENDING"
          ? { tone: "warning", text: "Qualificação salva. Fornecedor de alto risco — a due diligence está pendente de análise e ele não pode ser adjudicado até ser aprovada." }
          : { tone: "success", text: "Qualificação do fornecedor salva." }
      );
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar a qualificação do fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setActionError("");
    setNotice(null);
    try {
      const uploaded = await uploadFile(file);
      // Usa o risco/vigência já SALVOS (ou o formulário, se ainda não há qualificação) — anexar
      // um documento nunca grava por tabela uma edição do formulário que o usuário não salvou.
      const base = qualification ? { highRisk: qualification.highRisk, validUntil: qualification.validUntil || "" } : {};
      await save({ ...base, documentFileIds: [...documents.map((d) => d.id), uploaded.id] });
      setNotice({ tone: "success", text: `Documento "${file.name}" anexado à qualificação.` });
    } catch (err) {
      setActionError(err?.message || "Não foi possível anexar o documento.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveDocument(doc) {
    const ok = await confirm({
      title: "Remover documento?",
      message: `O documento "${doc.fileName || doc.id}" deixa de fazer parte da qualificação deste fornecedor (o arquivo continua guardado).`,
      confirmLabel: "Remover",
      tone: "danger",
    });
    if (!ok) return;
    setActionError("");
    setNotice(null);
    try {
      await save({ highRisk: qualification.highRisk, validUntil: qualification.validUntil || "", documentFileIds: documents.filter((d) => d.id !== doc.id).map((d) => d.id) });
    } catch (err) {
      setActionError(err?.message || "Não foi possível remover o documento.");
    }
  }

  async function handleDecide(decision) {
    decisionNotesRef.current = "";
    const approving = decision === "APPROVED";
    const ok = await confirm({
      title: approving ? "Aprovar due diligence?" : "Reprovar due diligence?",
      tone: approving ? "primary" : "danger",
      confirmLabel: approving ? "Aprovar" : "Reprovar",
      message: (
        <div style={SECTION_GAP}>
          <p style={{ margin: 0 }}>
            {approving
              ? `${person?.legalName || "Este fornecedor"} passa a poder ser adjudicado em cotações${qualification?.validUntil ? ` até ${formatDate(qualification.validUntil)}` : ""}.`
              : `${person?.legalName || "Este fornecedor"} continua bloqueado para adjudicação até uma nova análise aprovada.`}
          </p>
          <FormField label={approving ? "Parecer (opcional)" : "Motivo da reprovação"}>
            <Input defaultValue="" maxLength={1000} onChange={(e) => { decisionNotesRef.current = e.target.value; }} placeholder={approving ? "Ex.: documentação conferida" : "Ex.: certidão negativa vencida"} />
          </FormField>
        </div>
      ),
    });
    if (!ok) return;
    setDeciding(decision);
    setActionError("");
    setNotice(null);
    try {
      const updated = await decideSupplierDueDiligence(qualification.id, decision, decisionNotesRef.current.trim());
      applyQualification(updated);
      setNotice({ tone: approving ? "success" : "danger", text: approving ? "Due diligence aprovada." : "Due diligence reprovada — fornecedor bloqueado para adjudicação." });
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar a decisão de due diligence.");
    } finally {
      setDeciding(null);
    }
  }

  const blockReason = awardBlockReason(qualification);
  const formDirty = Boolean(qualification)
    ? form.highRisk !== Boolean(qualification.highRisk) || (form.validUntil || "") !== (qualification.validUntil || "")
    : true;
  const coolingAccounts = bankAccounts.filter((a) => a.status !== "ACTIVE");

  return (
    <AppShell title={person?.legalName || "Fornecedor"} backHref="/painel/compras/fornecedores">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar o fornecedor">{loadError}</Alert> : null}
      {actionError ? (
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      {loading ? (
        <SkeletonDetail sections={3} />
      ) : !person ? null : (
        <div style={SECTION_GAP}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {!qualification ? <Badge tone="neutral">Não qualificado</Badge> : qualification.highRisk ? <Badge tone="danger">Alto risco</Badge> : <Badge tone="success">Risco padrão</Badge>}
            {qualification ? <Badge tone={DUE_DILIGENCE_TONE[qualification.dueDiligenceStatus]}>Due diligence: {DUE_DILIGENCE_LABELS[qualification.dueDiligenceStatus] || qualification.dueDiligenceStatus}</Badge> : null}
            {isQualificationExpired(qualification) ? <Badge tone="danger">Vigência vencida</Badge> : null}
            {person.taxIdNormalized ? <span style={{ color: "var(--color-ink-muted)" }}>{person.taxIdNormalized}</span> : null}
          </div>

          {blockReason ? <Alert tone="danger" title="Bloqueado para adjudicação">{blockReason}</Alert> : null}
          {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}

          <Card title="Qualificação e risco" subtitle="Marcar como alto risco exige due diligence aprovada antes de qualquer PO">
            <div style={SECTION_GAP}>
              <Checkbox
                id="q-high-risk"
                label="Fornecedor de alto risco (exige due diligence)"
                checked={form.highRisk}
                disabled={!canEdit}
                onChange={(e) => setForm((p) => ({ ...p, highRisk: e.target.checked }))}
              />
              {form.highRisk && qualification && !qualification.highRisk ? (
                <Alert tone="warning">Ao salvar, a due diligence fica pendente e o fornecedor deixa de poder ser adjudicado até ser aprovado.</Alert>
              ) : null}
              <FormField label="Documentação válida até" htmlFor="q-valid-until" helper="Último dia de validade dos documentos (inclusive). Vencida, a due diligence de alto risco deixa de valer." error={validUntilInvalid ? DATE_INPUT_ERROR_MESSAGE : undefined}>
                <Input
                  id="q-valid-until"
                  type="date"
                  value={form.validUntil}
                  disabled={!canEdit}
                  onChange={(e) => { setValidUntilInvalid(isDateInputInvalid(e.target.validity)); setForm((p) => ({ ...p, validUntil: e.target.value })); }}
                />
              </FormField>
              {canEdit ? (
                <div>
                  <Button onClick={handleSave} loading={saving} disabled={validUntilInvalid || !formDirty}>
                    {qualification ? "Salvar qualificação" : "Registrar qualificação"}
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>

          <Card
            title="Documentos"
            subtitle={`${documents.length} documento(s) da qualificação (certidões, contrato social, comprovantes)`}
            actions={canEdit ? (
              <>
                <Button size="sm" variant="secondary" loading={uploading} onClick={() => document.getElementById("q-doc-upload")?.click()}>Anexar documento</Button>
                <input id="q-doc-upload" type="file" style={{ display: "none" }} onChange={handleUpload} />
              </>
            ) : null}
          >
            {documents.length === 0 ? (
              <EmptyState icon="document" title="Nenhum documento" description="Anexe os documentos que comprovam a qualificação do fornecedor." />
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                {documents.map((doc) => (
                  <li key={doc.id} style={ROW_STYLE}>
                    <span>{doc.fileName || `Arquivo ${doc.id.slice(0, 8)}`}</span>
                    <span style={{ display: "flex", gap: 6 }}>
                      <Button size="sm" variant="secondary" onClick={() => setViewerFile({ id: doc.id })}>Ver</Button>
                      {canEdit ? <Button size="sm" variant="secondary" onClick={() => handleRemoveDocument(doc)}>Remover</Button> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Due diligence" subtitle="Obrigatória para fornecedor de alto risco">
            {!qualification ? (
              <p style={{ margin: 0, color: "var(--color-ink-muted)" }}>Registre a qualificação do fornecedor para iniciar a análise.</p>
            ) : !qualification.highRisk ? (
              <p style={{ margin: 0, color: "var(--color-ink-muted)" }}>Fornecedor de risco padrão — due diligence não exigida.</p>
            ) : (
              <div style={SECTION_GAP}>
                <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px" }}>
                  <dt>Status</dt>
                  <dd style={{ margin: 0 }}><Badge tone={DUE_DILIGENCE_TONE[qualification.dueDiligenceStatus]}>{DUE_DILIGENCE_LABELS[qualification.dueDiligenceStatus] || qualification.dueDiligenceStatus}</Badge></dd>
                  <dt>Parecer</dt>
                  <dd style={{ margin: 0 }}>{qualification.dueDiligenceNotes || "—"}</dd>
                  <dt>Decidido em</dt>
                  <dd style={{ margin: 0 }}>{qualification.approvedAt && qualification.dueDiligenceStatus !== "PENDING" ? formatDateTime(qualification.approvedAt) : "—"}</dd>
                </dl>
                {canApprove ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {qualification.dueDiligenceStatus !== "APPROVED" ? (
                      <Button onClick={() => handleDecide("APPROVED")} loading={deciding === "APPROVED"} disabled={Boolean(deciding)}>Aprovar due diligence</Button>
                    ) : null}
                    {qualification.dueDiligenceStatus !== "REJECTED" ? (
                      <Button variant="danger" onClick={() => handleDecide("REJECTED")} loading={deciding === "REJECTED"} disabled={Boolean(deciding)}>Reprovar</Button>
                    ) : null}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "var(--color-ink-muted)" }}>A decisão da due diligence exige permissão de aprovação de Compras.</p>
                )}
              </div>
            )}
          </Card>

          <Card title="Contas bancárias do fornecedor" subtitle="Cadastro e alteração só pelo Financeiro (step-up MFA + resfriamento antifraude)">
            {bankAccountsError ? (
              <p style={{ margin: 0, color: "var(--color-ink-muted)" }}>{bankAccountsError}</p>
            ) : bankAccounts.length === 0 ? (
              <EmptyState icon="money" title="Nenhuma conta bancária" description="Nenhuma conta bancária vinculada a este fornecedor." />
            ) : (
              <div style={SECTION_GAP}>
                {coolingAccounts.length > 0 ? (
                  <Alert tone="warning" title="Conta em reverificação">
                    Conta nova ou com dado bancário alterado (inclusive troca de titular) fica em resfriamento antifraude — pagamentos
                    para ela são recusados até o prazo terminar. Desbloquear uma conta também reinicia esse prazo.
                  </Alert>
                ) : null}
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                  {bankAccounts.map((a) => {
                    const remaining = bankAccountCooldownRemainingHours({ ...a, updatedAt: a.updatedAt || a.updated_at });
                    return (
                      <li key={a.id} style={ROW_STYLE}>
                        <Link href={`/painel/financeiro/contas-bancarias/${a.id}`}>
                          {a.bankCode ? `${getBankName(a.bankCode)} — conta ${maskAccountNumber(a.accountNumber || "")}` : `PIX ${maskPixKey(a.pixKey || "")}`}
                        </Link>
                        <span style={{ display: "flex", gap: 6 }}>
                          <Badge tone={BANK_ACCOUNT_STATUS_TONE[a.status]}>{BANK_ACCOUNT_STATUS_LABELS[a.status] || a.status}</Badge>
                          {a.status === "PENDING_COOLDOWN" ? <Badge tone="warning">{remaining}h restantes</Badge> : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>

          <Card title="Avaliações" subtitle="Notas dadas após o recebimento de pedidos">
            {evaluations && evaluations.count > 0 ? (
              <p style={{ margin: 0 }}>
                Nota média <strong>{evaluations.averageScore} / 5</strong> em {evaluations.count} avaliação(ões).
              </p>
            ) : (
              <p style={{ margin: 0, color: "var(--color-ink-muted)" }}>Nenhuma avaliação registrada.</p>
            )}
          </Card>
        </div>
      )}

      <FileViewerModal open={!!viewerFile} onClose={() => setViewerFile(null)} fileId={viewerFile?.id} />
      <ConfirmDialog />
    </AppShell>
  );
}
