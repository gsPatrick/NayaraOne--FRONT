"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import { listInsurancePolicies, quoteInsurancePolicy, issueInsurancePolicy } from "@/lib/api/procurement";
import { formatDateTime, formatBRL } from "@/lib/format";

const POLICY_STATUS_LABELS = { DRAFT: "Rascunho", QUOTED: "Cotada", ISSUED: "Emitida", ACTIVE: "Ativa", EXPIRED: "Expirada", CANCELED: "Cancelada" };
const POLICY_STATUS_TONE = { DRAFT: "neutral", QUOTED: "info", ISSUED: "info", ACTIVE: "success", EXPIRED: "warning", CANCELED: "danger" };

export default function SegurosPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    setLoadError("");
    listInsurancePolicies()
      .then((data) => setPolicies(data || []))
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar as apólices."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleQuote(id) {
    setBusyId(id);
    setActionError("");
    try {
      await quoteInsurancePolicy(id, {});
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível cotar a apólice.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleIssue(id) {
    setBusyId(id);
    setActionError("");
    try {
      const today = new Date();
      const nextYear = new Date(today);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      await issueInsurancePolicy(id, {
        effectiveDate: today.toISOString().slice(0, 10),
        expiryDate: nextYear.toISOString().slice(0, 10),
      });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível emitir a apólice.");
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: "status", label: "Status", width: "14%", render: (row) => <Badge tone={POLICY_STATUS_TONE[row.status]}>{POLICY_STATUS_LABELS[row.status]}</Badge> },
    { key: "provider", label: "Seguradora", width: "16%", render: (row) => row.provider || "sandbox" },
    { key: "number", label: "Nº da apólice", width: "18%", render: (row) => row.externalPolicyNumber || "—" },
    { key: "premium", label: "Prêmio", width: "14%", render: (row) => (row.premiumAmount ? formatBRL(row.premiumAmount) : "—") },
    { key: "created", label: "Criada em", width: "18%", render: (row) => formatDateTime(row.created_at) },
    {
      key: "actions",
      label: "",
      width: "20%",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button size="sm" variant="secondary" onClick={() => router.push(`/painel/compras/seguros/${row.id}`)}>Ver</Button>
          {row.status === "DRAFT" ? (
            <Button size="sm" onClick={() => handleQuote(row.id)} loading={busyId === row.id}>Cotar</Button>
          ) : null}
          {["DRAFT", "QUOTED"].includes(row.status) ? (
            <Button size="sm" onClick={() => handleIssue(row.id)} loading={busyId === row.id}>Emitir</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Seguros" backHref="/painel/compras">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar as apólices">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <Card title="Apólices de seguro" subtitle="Insurance Hub — cotação → emissão → sinistro → liquidação, integrado ao Financeiro.">
        <Table columns={columns} rows={loading ? [] : policies} loading={loading} emptyMessage="Nenhuma apólice registrada." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => router.push("/painel/compras/seguros/novo")}>
          <Icon name="plus" size={18} /> Nova apólice
        </Button>
      </StickyActionBar>
    </AppShell>
  );
}
