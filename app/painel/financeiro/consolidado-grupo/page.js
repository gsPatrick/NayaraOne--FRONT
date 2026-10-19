"use client";

// Consolidado do grupo (Caderno §3/§15): só visão — soma por empresa e elimina, na
// apresentação, os dois lados das transferências intercompany entre empresas do relatório.

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import { getGroupConsolidatedReport } from "@/lib/api/finance";
import { formatBRL } from "@/lib/format";
import styles from "./page.module.css";

export default function GroupConsolidatedPage() {
  const [referenceMonth, setReferenceMonth] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getGroupConsolidatedReport(referenceMonth || undefined)
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((err) => {
        if (active) setError(err?.message || "Não foi possível carregar o consolidado.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [referenceMonth]);

  const companyName = (id) => report?.companies?.find((c) => c.companyId === id)?.name || id;

  const companyColumns = [
    { key: "name", label: "Empresa" },
    { key: "totalCredits", label: "Entradas", render: (r) => formatBRL(r.totalCredits) },
    { key: "totalDebits", label: "Saídas", render: (r) => formatBRL(r.totalDebits) },
    { key: "intercompanyCredits", label: "Intercompany (entradas eliminadas)", render: (r) => formatBRL(r.intercompanyCredits) },
    { key: "intercompanyDebits", label: "Intercompany (saídas eliminadas)", render: (r) => formatBRL(r.intercompanyDebits) },
  ];
  const eliminationColumns = [
    { key: "fromCompanyId", label: "Origem", render: (r) => companyName(r.fromCompanyId) },
    { key: "toCompanyId", label: "Destino", render: (r) => companyName(r.toCompanyId) },
    { key: "amount", label: "Valor eliminado", render: (r) => formatBRL(r.amount) },
  ];

  return (
    <AppShell title="Consolidado do grupo" backHref="/painel/financeiro">
      <div className={styles.wrap}>
        <Card className={styles.formCard}>
          <p className={styles.helper}>
            Somente visão: não mistura ledger nem saldos. Transferências intercompany entre empresas do relatório são eliminadas no total consolidado.
          </p>
          <FormField label="Competência (deixe vazio para todas)" htmlFor="referenceMonth">
            <Input id="referenceMonth" type="month" value={referenceMonth} onChange={(e) => setReferenceMonth(e.target.value)} />
          </FormField>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {report ? (
            <p className={styles.helper} data-testid="consolidated-totals">
              Consolidado: entradas {formatBRL(report.consolidated?.totalCredits)} · saídas {formatBRL(report.consolidated?.totalDebits)} · resultado{" "}
              <strong>{formatBRL(report.consolidated?.net)}</strong>
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className={styles.sectionTitle}>Por empresa</h2>
          <Table columns={companyColumns} rows={(report?.companies || []).map((c) => ({ ...c, id: c.companyId }))} loading={loading} emptyMessage="Nenhuma empresa com acesso ao Financeiro." />
        </Card>

        <Card>
          <h2 className={styles.sectionTitle}>Eliminações intercompany</h2>
          <Table columns={eliminationColumns} rows={(report?.eliminations || []).map((e) => ({ ...e, id: e.transferId }))} loading={loading} emptyMessage="Nenhuma transferência a eliminar." />
        </Card>

        {report?.excludedCompanies?.length ? (
          <Alert tone="warning">
            Fora do relatório (sem permissão): {report.excludedCompanies.map((c) => c.name).join(", ")}.
          </Alert>
        ) : null}
      </div>

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
