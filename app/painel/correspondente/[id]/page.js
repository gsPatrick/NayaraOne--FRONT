"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { getFinancingCase, listCaseRequirements, createCaseRequirement, uploadCaseDocument } from "@/lib/api/correspondent";
import { uploadFile } from "@/lib/api/legal";
import { formatDateTime } from "@/lib/format";

const STATUS_LABELS = { DRAFT: "Rascunho" };
const STATUS_TONE = { DRAFT: "neutral" };

const PROVIDER_LABELS = {
  sandbox: "Sandbox (simulação, sem envio real a nenhum banco)",
  manual: "Manual (corretor conduz o caso com o banco por fora do sistema)",
};

const APPLICANT_ROLE_LABELS = { PRINCIPAL: "Proponente principal", CO_APPLICANT: "Co-proponente" };

const DOCUMENT_TYPE_LABELS = {
  RG_CPF: "RG/CPF",
  COMPROVANTE_RENDA: "Comprovante de renda",
  COMPROVANTE_RESIDENCIA: "Comprovante de residência",
  MATRICULA_IMOVEL: "Matrícula do imóvel",
  CERTIDAO_ESTADO_CIVIL: "Certidão de estado civil",
  IPTU: "IPTU",
  OUTRO: "Outro",
};

const REQUIREMENT_STATUS_LABELS = {
  PENDING: "Pendente",
  SUBMITTED: "Enviado",
  VALIDATED: "Validado",
  REJECTED: "Rejeitado",
  EXPIRED: "Expirado",
};
const REQUIREMENT_STATUS_TONE = { PENDING: "warning", SUBMITTED: "info", VALIDATED: "success", REJECTED: "danger", EXPIRED: "neutral" };

export default function FinancingCaseDetailPage() {
  const { id } = useParams();
  const [financingCase, setFinancingCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [requirements, setRequirements] = useState([]);
  const [requirementsLoading, setRequirementsLoading] = useState(true);
  const [requirementsError, setRequirementsError] = useState("");
  const [newRequirementType, setNewRequirementType] = useState("RG_CPF");
  const [addingRequirement, setAddingRequirement] = useState(false);
  const [actionError, setActionError] = useState("");
  const [uploadingRequirementId, setUploadingRequirementId] = useState(null);

  function loadRequirements() {
    setRequirementsLoading(true);
    setRequirementsError("");
    listCaseRequirements(id)
      .then(setRequirements)
      .catch((err) => setRequirementsError(err?.message || "Não foi possível carregar o checklist de documentos."))
      .finally(() => setRequirementsLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    getFinancingCase(id)
      .then(setFinancingCase)
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar o caso de financiamento."))
      .finally(() => setLoading(false));
    loadRequirements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddRequirement() {
    setAddingRequirement(true);
    setActionError("");
    try {
      await createCaseRequirement(id, { documentType: newRequirementType });
      loadRequirements();
    } catch (err) {
      setActionError(err?.message || "Não foi possível adicionar o item ao checklist.");
    } finally {
      setAddingRequirement(false);
    }
  }

  async function handleUploadDocument(requirementId, file) {
    if (!file) return;
    setUploadingRequirementId(requirementId);
    setActionError("");
    try {
      const uploaded = await uploadFile(file);
      await uploadCaseDocument(id, { requirementId, fileId: uploaded.id });
      loadRequirements();
    } catch (err) {
      setActionError(err?.message || "Não foi possível enviar o documento.");
    } finally {
      setUploadingRequirementId(null);
    }
  }

  if (loading) {
    return (
      <AppShell title="Caso de financiamento" backHref="/painel/correspondente">
        <SkeletonDetail />
      </AppShell>
    );
  }

  if (loadError || !financingCase) {
    return (
      <AppShell title="Caso de financiamento" backHref="/painel/correspondente">
        <Alert tone="danger" title="Não foi possível carregar o caso de financiamento">{loadError || "Caso não encontrado."}</Alert>
      </AppShell>
    );
  }

  return (
    <AppShell title="Caso de financiamento" backHref="/painel/correspondente">
      {actionError ? (
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}
      <Card
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Status: <Badge tone={STATUS_TONE[financingCase.status] || "neutral"}>{STATUS_LABELS[financingCase.status] || financingCase.status}</Badge>
          </span>
        }
        subtitle={`Criado em ${formatDateTime(financingCase.created_at || financingCase.createdAt)}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <strong>Provider</strong>
            <p>{PROVIDER_LABELS[financingCase.providerCode] || financingCase.providerCode}</p>
          </div>

          <div>
            <strong>Imóvel</strong>
            <p>{financingCase.property ? `${financingCase.property.internalCode ? `${financingCase.property.internalCode} — ` : ""}${financingCase.property.title || ""}` : "Nenhum imóvel vinculado ainda."}</p>
          </div>

          <div>
            <strong>Proponentes</strong>
            {(financingCase.applicants || []).length === 0 ? (
              <p>Nenhum proponente.</p>
            ) : (
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {financingCase.applicants.map((applicant) => (
                  <li key={applicant.id}>
                    {applicant.person?.legalName || "—"} · {APPLICANT_ROLE_LABELS[applicant.role] || applicant.role}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Card
        title="Documentos"
        subtitle="Checklist de documentos exigidos para o caso — identidade e renda são sempre restritos, visíveis só por quem tem a permissão dedicada."
        style={{ marginTop: 16 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <FormField label="Novo item do checklist" htmlFor="new-requirement-type">
              <Select id="new-requirement-type" value={newRequirementType} onChange={(e) => setNewRequirementType(e.target.value)}>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>
            <Button variant="secondary" onClick={handleAddRequirement} loading={addingRequirement}>
              Adicionar ao checklist
            </Button>
          </div>

          {requirementsLoading ? (
            <p>Carregando checklist…</p>
          ) : requirementsError ? (
            <Alert tone="danger">{requirementsError}</Alert>
          ) : requirements.length === 0 ? (
            <p>Nenhum documento exigido cadastrado ainda para este caso.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {requirements.map((req) => {
                const currentDocument = (req.documents || []).find((d) => !d.supersededAt && !d.superseded_at);
                return (
                  <div key={req.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong>{DOCUMENT_TYPE_LABELS[req.documentType] || req.documentType}</strong>
                      <Badge tone={REQUIREMENT_STATUS_TONE[req.status] || "neutral"}>{REQUIREMENT_STATUS_LABELS[req.status] || req.status}</Badge>
                    </div>
                    {currentDocument ? (
                      <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-ink-soft)" }}>
                        {currentDocument.file?.fileName ? `Arquivo atual: ${currentDocument.file.fileName} (versão ${currentDocument.version})` : `Documento enviado (versão ${currentDocument.version}) — sem permissão para ver o nome do arquivo.`}
                      </p>
                    ) : null}
                    <div style={{ marginTop: 8 }}>
                      <FileDropInput
                        id={`requirement-upload-${req.id}`}
                        accept="image/*,application/pdf"
                        uploading={uploadingRequirementId === req.id}
                        fileNames={[]}
                        onFiles={(files) => files[0] && handleUploadDocument(req.id, files[0])}
                        helper={currentDocument ? "Enviar um novo arquivo substitui a versão vigente (a anterior fica preservada no histórico)." : "Nenhum arquivo enviado ainda."}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
