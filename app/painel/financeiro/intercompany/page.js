"use client";

// FIN-TS-016 (auditoria externa Abacus AI, 11/10/2026): "Intercompany — Funcionalidade não
// encontrada". O backend (createIntercompanyTransfer: cria 2 lançamentos vinculados, um em
// cada empresa do mesmo grupo, com step-up MFA obrigatório) já existia e já tinha teste de
// service, mas nunca ganhou tela — mesma classe de gap do extrato, orçamento e fechamento.

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import {
  listIntercompanyTransfers,
  createIntercompanyTransfer,
  reconcileIntercompanyTransfer,
} from "@/lib/api/finance";
import { listCompanies } from "@/lib/api/companies";
import { useCompany } from "@/lib/context/CompanyContext";
import { formatBRL, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function IntercompanyPage() {
  const { company } = useCompany();

  const [companies, setCompanies] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [toCompanyId, setToCompanyId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [mfaOpen, setMfaOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const [companyList, transferList] = await Promise.all([listCompanies(), listIntercompanyTransfers()]);
      setCompanies(companyList || []);
      setTransfers(transferList || []);
    } catch (err) {
      setLoadError(err?.message || "Não foi possível carregar as transferências intercompany.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const otherCompanies = companies.filter((c) => c.id !== company?.id);

  function handleCreateClick(e) {
    e.preventDefault();
    setFormError("");
    if (!toCompanyId) {
      setFormError("Selecione a empresa de destino.");
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }
    // Criar transferência intercompany é step-up MFA obrigatório no backend — mesmo padrão já
    // usado em liquidar lançamento (lancamentos/[id]/page.js).
    setMfaOpen(true);
  }

  async function runCreate() {
    setSaving(true);
    try {
      await createIntercompanyTransfer({
        toCompanyId,
        amount: Number(amount),
        reason: reason || undefined,
      });
      setAmount("");
      setReason("");
      setToCompanyId("");
      await reload();
    } catch (err) {
      setFormError(err?.message || "Falha ao criar a transferência.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReconcile(id) {
    try {
      await reconcileIntercompanyTransfer(id);
      await reload();
    } catch (err) {
      setLoadError(err?.message || "Falha ao conciliar a transferência.");
    }
  }

  const columns = [
    { key: "createdAt", label: "Data", render: (row) => formatDateTime(row.createdAt) },
    { key: "fromCompanyId", label: "Origem", render: (row) => (row.fromCompanyId === company?.id ? "Esta empresa" : row.fromCompanyId) },
    {
      key: "toCompanyId",
      label: "Destino",
      render: (row) => companies.find((c) => c.id === row.toCompanyId)?.name || row.toCompanyId,
    },
    { key: "amount", label: "Valor", render: (row) => formatBRL(row.amount) },
    { key: "reason", label: "Motivo", render: (row) => row.reason || "—" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge tone={row.status === "RECONCILED" ? "success" : "neutral"}>{row.status === "RECONCILED" ? "Conciliada" : "Pendente"}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (row) =>
        row.status !== "RECONCILED" ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => handleReconcile(row.id)}>
            Conciliar
          </Button>
        ) : null,
    },
  ];

  return (
    <AppShell title="Transferências intercompany" backHref="/painel/financeiro">
      <div className={styles.wrap}>
        {loadError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{loadError}</Alert>
          </div>
        ) : null}

        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Nova transferência</h2>
          <p className={styles.helper}>Move dinheiro desta empresa para outra do mesmo grupo — cria um lançamento vinculado em cada lado.</p>
          <form onSubmit={handleCreateClick} className={styles.form}>
            <FormField label="Empresa de destino" htmlFor="toCompanyId">
              <Select id="toCompanyId" value={toCompanyId} onChange={(e) => setToCompanyId(e.target.value)}>
                <option value="">Selecione...</option>
                {otherCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Valor" htmlFor="amount">
              <Input id="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </FormField>

            <FormField label="Motivo (opcional)" htmlFor="reason">
              <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormField>

            {formError ? <Alert tone="danger">{formError}</Alert> : null}

            <Button type="submit" disabled={saving}>
              {saving ? "Transferindo..." : "Transferir"}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className={styles.sectionTitle}>Histórico</h2>
          <Table columns={columns} rows={transfers} loading={loading} emptyMessage="Nenhuma transferência intercompany ainda." />
        </Card>
      </div>

      <MfaVerifyModal
        open={mfaOpen}
        onClose={() => setMfaOpen(false)}
        actionLabel="criar esta transferência intercompany"
        onVerified={async () => {
          setMfaOpen(false);
          await runCreate();
        }}
      />

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
