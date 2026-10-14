"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { getFinancingCase } from "@/lib/api/correspondent";
import { formatDateTime } from "@/lib/format";

const STATUS_LABELS = { DRAFT: "Rascunho" };
const STATUS_TONE = { DRAFT: "neutral" };

const PROVIDER_LABELS = {
  sandbox: "Sandbox (simulação, sem envio real a nenhum banco)",
  manual: "Manual (corretor conduz o caso com o banco por fora do sistema)",
};

const APPLICANT_ROLE_LABELS = { PRINCIPAL: "Proponente principal", CO_APPLICANT: "Co-proponente" };

export default function FinancingCaseDetailPage() {
  const { id } = useParams();
  const [financingCase, setFinancingCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    getFinancingCase(id)
      .then(setFinancingCase)
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar o caso de financiamento."))
      .finally(() => setLoading(false));
  }, [id]);

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
    </AppShell>
  );
}
