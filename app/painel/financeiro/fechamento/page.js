"use client";

// FIN-TS-010 (auditoria externa Abacus AI, 11/10/2026): "Fechamento — Tela não encontrada". O
// backend (periodClosures.service.js: fechar um mês trava criação/edição de lançamentos nele;
// reabrir exige motivo e fica auditado) já existia e já tinha teste de service, mas nunca
// ganhou tela — mesma classe de gap da importação de extrato (FIN-TS-007) e do orçamento
// (achado na verificação cética final do Marco 4, 11/10/2026).

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import { listPeriodClosures, closePeriod, reopenPeriod } from "@/lib/api/finance";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

function currentReferenceMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function FechamentoPage() {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [monthToClose, setMonthToClose] = useState(currentReferenceMonth());
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");

  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState("");

  async function reload() {
    setLoading(true);
    try {
      const items = await listPeriodClosures();
      setClosures(items || []);
    } catch (err) {
      setLoadError(err?.message || "Não foi possível carregar os fechamentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleClose(e) {
    e.preventDefault();
    setCloseError("");
    setClosing(true);
    try {
      await closePeriod(monthToClose);
      await reload();
    } catch (err) {
      setCloseError(err?.message || "Falha ao fechar o período.");
    } finally {
      setClosing(false);
    }
  }

  async function handleReopen(e) {
    e.preventDefault();
    setReopenError("");
    if (!reopenReason.trim()) {
      setReopenError("Informe o motivo da reabertura — é obrigatório e fica auditado.");
      return;
    }
    setReopening(true);
    try {
      await reopenPeriod(reopenTarget.referenceMonth, reopenReason.trim());
      setReopenTarget(null);
      setReopenReason("");
      await reload();
    } catch (err) {
      setReopenError(err?.message || "Falha ao reabrir o período.");
    } finally {
      setReopening(false);
    }
  }

  const columns = [
    { key: "referenceMonth", label: "Mês" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge tone={row.status === "CLOSED" ? "danger" : "success"}>{row.status === "CLOSED" ? "Fechado" : "Aberto"}</Badge>,
    },
    { key: "closedAt", label: "Fechado em", render: (row) => (row.closedAt ? formatDateTime(row.closedAt) : "—") },
    { key: "reopenedAt", label: "Última reabertura", render: (row) => (row.reopenedAt ? formatDateTime(row.reopenedAt) : "—") },
    { key: "reopenReason", label: "Motivo da reabertura", render: (row) => row.reopenReason || "—" },
    {
      key: "actions",
      label: "",
      render: (row) =>
        row.status === "CLOSED" ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setReopenTarget(row)}>
            Reabrir
          </Button>
        ) : null,
    },
  ];

  return (
    <AppShell title="Fechamento de período" backHref="/painel/financeiro">
      <div className={styles.wrap}>
        {loadError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{loadError}</Alert>
          </div>
        ) : null}

        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Fechar um mês</h2>
          <p className={styles.helper}>
            Depois de fechado, nenhum lançamento daquele mês pode ser criado ou editado até o
            período ser reaberto com motivo.
          </p>
          <form onSubmit={handleClose} className={styles.inlineForm}>
            <FormField label="Mês de referência" htmlFor="monthToClose">
              <Input id="monthToClose" type="month" value={monthToClose} onChange={(e) => setMonthToClose(e.target.value)} />
            </FormField>
            <Button type="submit" disabled={closing}>
              {closing ? "Fechando..." : "Fechar período"}
            </Button>
          </form>
          {closeError ? <Alert tone="danger">{closeError}</Alert> : null}
        </Card>

        {reopenTarget ? (
          <Card className={styles.formCard}>
            <h2 className={styles.sectionTitle}>Reabrir {reopenTarget.referenceMonth}</h2>
            <form onSubmit={handleReopen} className={styles.inlineForm}>
              <FormField label="Motivo (obrigatório, fica auditado)" htmlFor="reopenReason">
                <textarea
                  id="reopenReason"
                  className={styles.textarea}
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                />
              </FormField>
              <div className={styles.reopenActions}>
                <Button type="submit" disabled={reopening}>
                  {reopening ? "Reabrindo..." : "Confirmar reabertura"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setReopenTarget(null);
                    setReopenReason("");
                    setReopenError("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
              {reopenError ? <Alert tone="danger">{reopenError}</Alert> : null}
            </form>
          </Card>
        ) : null}

        <Card>
          <h2 className={styles.sectionTitle}>Histórico de fechamentos</h2>
          <Table columns={columns} rows={closures} loading={loading} emptyMessage="Nenhum período fechado ainda." />
        </Card>
      </div>

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
