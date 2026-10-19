"use client";

// GAP REAL CORRIGIDO (verificação cética final do Marco 4, 11/10/2026): finance.budgets_forecasts
// (§5 do Caderno — tabela obrigatória) foi implementado na varredura completa do Caderno
// (service, model, migration, rotas HTTP), mas ficou sem tela — mesma classe de problema já
// corrigida para o extrato bancário (FIN-TS-007). Esta tela cobre: lançar uma projeção
// orçada (despesa por centro de custo ou receita por centro de resultado) para um mês de
// competência, e comparar orçado x realizado desse mês (GET /finance/budget-forecasts/compare).

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
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import {
  listBudgetForecasts,
  createBudgetForecast,
  compareBudgetForecastToRealized,
  listCostCenters,
  listResultCenters,
} from "@/lib/api/finance";
import { formatBRL, toNumber, formatCompetence } from "@/lib/format";
import styles from "./page.module.css";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";

function currentCompetenceMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function OrcamentoPage() {
  const [competenceMonth, setCompetenceMonth] = useState(currentCompetenceMonth());
  const [costCenters, setCostCenters] = useState([]);
  const [resultCenters, setResultCenters] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [nature, setNature] = useState("PAYABLE");
  const [centerId, setCenterId] = useState("");
  const [description, setDescription] = useState("");
  const [forecastedAmount, setForecastedAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCostCenters(), listResultCenters()])
      .then(([cc, rc]) => {
        if (cancelled) return;
        setCostCenters(cc || []);
        setResultCenters(rc || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar os centros.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function reload(month) {
    setLoading(true);
    try {
      const [list, compare] = await Promise.all([
        listBudgetForecasts({ competenceMonth: month }),
        compareBudgetForecastToRealized(month),
      ]);
      setForecasts(list || []);
      setComparison(compare || []);
    } catch (err) {
      setLoadError(err?.message || "Não foi possível carregar o orçamento do mês.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload(competenceMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competenceMonth]);

  const centerOptions = nature === "PAYABLE" ? costCenters : resultCenters;

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!centerId) {
      setFormError(nature === "PAYABLE" ? "Selecione o centro de custo." : "Selecione o centro de resultado.");
      return;
    }
    const amountNumeric = toNumber(forecastedAmount);
    if (!Number.isFinite(amountNumeric) || amountNumeric <= 0) {
      setFormError("Informe um valor projetado maior que zero.");
      return;
    }
    setSaving(true);
    try {
      await createBudgetForecast({
        competenceMonth,
        nature,
        description: description || undefined,
        forecastedAmount: amountNumeric,
        ...(nature === "PAYABLE" ? { costCenterId: centerId } : { resultCenterId: centerId }),
      });
      setDescription("");
      setForecastedAmount("");
      setCenterId("");
      await reload(competenceMonth);
    } catch (err) {
      setFormError(err?.message || "Falha ao lançar a projeção.");
    } finally {
      setSaving(false);
    }
  }

  const forecastColumns = [
    { key: "nature", label: "Natureza", render: (row) => <Badge tone={row.nature === "PAYABLE" ? "danger" : "success"}>{row.nature === "PAYABLE" ? "Despesa" : "Receita"}</Badge> },
    { key: "description", label: "Descrição", render: (row) => row.description || "Sem descrição" },
    { key: "forecastedAmount", label: "Valor projetado", render: (row) => formatBRL(row.forecastedAmount) },
  ];

  const compareColumns = [
    { key: "nature", label: "Natureza", render: (row) => <Badge tone={row.nature === "PAYABLE" ? "danger" : "success"}>{row.nature === "PAYABLE" ? "Despesa" : "Receita"}</Badge> },
    { key: "forecasted", label: "Orçado", render: (row) => formatBRL(row.forecasted) },
    { key: "realized", label: "Realizado", render: (row) => formatBRL(row.realized) },
    {
      key: "variance",
      label: "Variação",
      render: (row) => {
        const variance = Number(row.realized) - Number(row.forecasted);
        return <span className={variance > 0 ? styles.over : styles.under}>{formatBRL(variance)}</span>;
      },
    },
  ];

  return (
    <AppShell title="Orçamento x realizado" backHref="/painel/financeiro">
      <div className={styles.wrap}>
        {loadError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{loadError}</Alert>
          </div>
        ) : null}

        <Card>
          <h2 className={styles.sectionTitle}>Mês de competência</h2>
          <FormField label="Mês" htmlFor="competenceMonth">
            <Input
              id="competenceMonth"
              type="month"
              value={competenceMonth}
              onChange={(e) => setCompetenceMonth(e.target.value)}
            />
          </FormField>
        </Card>

        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Nova projeção</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <FormField label="Natureza" htmlFor="nature">
              <Select
                id="nature"
                value={nature}
                onChange={(e) => {
                  setNature(e.target.value);
                  setCenterId("");
                }}
              >
                <option value="PAYABLE">Despesa (orçado por centro de custo)</option>
                <option value="RECEIVABLE">Receita (orçado por centro de resultado)</option>
              </Select>
            </FormField>

            <FormField label={nature === "PAYABLE" ? "Centro de custo" : "Centro de resultado"} htmlFor="centerId">
              <Select id="centerId" value={centerId} onChange={(e) => setCenterId(e.target.value)}>
                <option value="">Selecione...</option>
                {centerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Descrição (opcional)" htmlFor="description">
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>

            <FormField label="Valor projetado" htmlFor="forecastedAmount">
              <DecimalInput
                id="forecastedAmount"
                value={forecastedAmount}
                onChange={(e) => setForecastedAmount(e.target.value)}
              />
            </FormField>

            {formError ? <Alert tone="danger">{formError}</Alert> : null}

            <Button type="submit" disabled={saving}>
              {saving ? "Lançando..." : "Lançar projeção"}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className={styles.sectionTitle}>Orçado x realizado — {formatCompetence(competenceMonth)}</h2>
          <Table columns={compareColumns} rows={comparison} loading={loading} emptyMessage="Sem comparativo para este mês ainda." />
        </Card>

        <Card>
          <h2 className={styles.sectionTitle}>Projeções lançadas no mês</h2>
          <Table columns={forecastColumns} rows={forecasts} loading={loading} emptyMessage="Nenhuma projeção lançada para este mês ainda." />
        </Card>
      </div>

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
