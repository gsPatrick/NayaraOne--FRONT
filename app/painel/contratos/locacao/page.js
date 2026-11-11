"use client";

// Gap real da auditoria externa (Abacus AI, 11/10/2026): "Billing mensal automático de
// locação (aluguel + IPTU + condomínio + água/luz, reajuste IGPM/IPCA) não foi encontrado —
// apenas lançamentos financeiros avulsos." e "Obrigações locatícias com comprovante de
// transferência (água/energia) — Nenhuma tela ou módulo encontrado." O backend
// (billingSchedule/rentAdjustment/utilities services) já existia pronto e testado; esta tela
// é o que faltava para um usuário conseguir operar isso de ponta a ponta.

import { useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Tabs from "@/components/molecules/Tabs/Tabs";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import Modal from "@/components/organisms/Modal/Modal";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import { listContracts } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import UtilityObligationsTab from "./UtilityObligationsTab";
import RentAdvancesTab from "./RentAdvancesTab";
import CloseoutTab from "./CloseoutTab";
import GuaranteedRentTab from "./GuaranteedRentTab";
import {
  listBillingSchedules,
  generateBillingSchedule,
  registerBillingSchedulePayment,
  listRentAdjustments,
  requestRentAdjustment,
  listUtilityObligations,
  listGuaranteedRentContracts,
  listRentAdvances,
} from "@/lib/api/billing";
import { formatBRL, formatDate, formatContractLabel, toNumber, formatCompetence, parseCompetenceInput } from "@/lib/format";
import styles from "./page.module.css";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";

const COMPONENT_LABELS = { RENT: "Aluguel", CONDO: "Condomínio", IPTU: "IPTU", OTHER: "Outro" };
const SCHEDULE_STATUS_TONE = { OPEN: "warning", PARTIALLY_PAID: "info", PAID: "success" };
const SCHEDULE_STATUS_LABEL = { OPEN: "Em aberto", PARTIALLY_PAID: "Parcial", PAID: "Quitado" };
const ADJUSTMENT_STATUS_TONE = { PENDING_SOURCE: "warning", APPLIED: "success", FAILED: "danger" };
const ADJUSTMENT_STATUS_LABEL = { PENDING_SOURCE: "Aguardando índice", APPLIED: "Aplicado", FAILED: "Falhou" };

function currentPeriod() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}


const LEASE_LIKE_TYPES = ["LEASE", "LEASE_RESIDENTIAL", "LEASE_COMMERCIAL", "LEASE_SEASONAL", "PROPERTY_ADMIN"];

export default function LocacaoPage() {
  const [contracts, setContracts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [guaranteedRents, setGuaranteedRents] = useState([]);
  const [rentAdvances, setRentAdvances] = useState([]);
  const [actionError, setActionError] = useState("");

  const [generateOpen, setGenerateOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  const [scheduleForm, setScheduleForm] = useState({ contractId: "", period: currentPeriod(), dueDate: "", componentType: "RENT", amount: "" });
  const [adjustForm, setAdjustForm] = useState({ contractId: "", period: currentPeriod(), indexCode: "IGPM", oldRentAmount: "" });

  // GAP REAL CORRIGIDO (varredura completa do Marco 5 contra o addendum "Cobrança de locação +
  // utilidades" do Caderno, 12/10/2026): aluguel garantido, antecipação de aluguel e
  // encerramento (closeout) tinham backend completo desde a mesma rodada do billing mensal,
  // mas nenhuma tela chamava nada — ver lib/api/billing.js.



  // M9-D940: carregando, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  const loadQuery = useAsyncState(() => Promise.all([
    listContracts(),
    listBillingSchedules(),
    listRentAdjustments(),
    listUtilityObligations(),
    listGuaranteedRentContracts(),
    listRentAdvances(),
  ]).then(([c, s, a, u, g, r]) => {
    setContracts(c || []);
    setSchedules(s || []);
    setAdjustments(a || []);
    setUtilities(u || []);
    setGuaranteedRents(g || []);
    setRentAdvances(r || []);
    return true;
  }), { isEmpty: () => false });

  // As ações recarregam as listas; o AsyncState mantém as abas na tela durante a releitura.
  function load() { loadQuery.reload(); }

  // Subtipos de locação (JUR, Caderno seção 3): LEASE genérico + LEASE_RESIDENTIAL/
  // LEASE_COMMERCIAL/LEASE_SEASONAL/PROPERTY_ADMIN.
  const leaseContracts = useMemo(() => contracts.filter((c) => LEASE_LIKE_TYPES.includes(c.contractType)), [contracts]);

  async function handleGenerateSchedule() {
    setActionError("");
    try {
      await generateBillingSchedule({
        contractId: scheduleForm.contractId,
        period: parseCompetenceInput(scheduleForm.period) || scheduleForm.period,
        dueDate: scheduleForm.dueDate,
        items: [{ componentType: scheduleForm.componentType, amount: toNumber(scheduleForm.amount) }],
      });
      setGenerateOpen(false);
      setScheduleForm({ contractId: "", period: currentPeriod(), dueDate: "", componentType: "RENT", amount: "" });
      load();
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao gerar cobrança."));
    }
  }

  async function handlePay() {
    setActionError("");
    try {
      await registerBillingSchedulePayment(payTarget.id, toNumber(payAmount));
      setPayTarget(null);
      setPayAmount("");
      load();
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao registrar pagamento."));
    }
  }

  async function handleRequestAdjustment() {
    setActionError("");
    try {
      await requestRentAdjustment({
        contractId: adjustForm.contractId,
        period: parseCompetenceInput(adjustForm.period) || adjustForm.period,
        indexCode: adjustForm.indexCode,
        oldRentAmount: toNumber(adjustForm.oldRentAmount),
      });
      setAdjustOpen(false);
      setAdjustForm({ contractId: "", period: currentPeriod(), indexCode: "IGPM", oldRentAmount: "" });
      load();
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao solicitar reajuste."));
    }
  }




  const scheduleColumns = [
    { key: "contractId", label: "Contrato", render: (row) => formatContractLabel(leaseContracts.find((c) => c.id === row.contractId)) || row.contractId.slice(0, 8) },
    { key: "period", label: "Competência", render: (row) => formatCompetence(row.period) },
    { key: "dueDate", label: "Vencimento", render: (row) => formatDate(row.dueDate) },
    { key: "totalAmount", label: "Total", render: (row) => formatBRL(row.totalAmount) },
    { key: "balance", label: "Saldo", render: (row) => formatBRL(row.balance) },
    { key: "status", label: "Status", render: (row) => <Badge tone={SCHEDULE_STATUS_TONE[row.status] || "neutral"}>{SCHEDULE_STATUS_LABEL[row.status] || row.status}</Badge> },
    {
      key: "actions",
      label: "Ações",
      render: (row) =>
        row.status !== "PAID" ? (
          <Button variant="secondary" size="sm" onClick={() => { setPayTarget(row); setPayAmount(""); }}>
            Registrar pagamento
          </Button>
        ) : "Paga — nada a fazer",
    },
  ];

  const adjustmentColumns = [
    { key: "contractId", label: "Contrato", render: (row) => formatContractLabel(leaseContracts.find((c) => c.id === row.contractId)) || row.contractId.slice(0, 8) },
    { key: "period", label: "Competência", render: (row) => formatCompetence(row.period) },
    { key: "indexCode", label: "Índice" },
    { key: "oldRentAmount", label: "Aluguel anterior", render: (row) => formatBRL(row.oldRentAmount) },
    { key: "newRentAmount", label: "Novo aluguel", render: (row) => (row.newRentAmount != null ? formatBRL(row.newRentAmount) : "Aguardando índice") },
    { key: "status", label: "Status", render: (row) => <Badge tone={ADJUSTMENT_STATUS_TONE[row.status] || "neutral"}>{ADJUSTMENT_STATUS_LABEL[row.status] || row.status}</Badge> },
  ];



  return (
    <AppShell title="Locação (cobrança e reajuste)" backHref="/painel/contratos">
      <div className={styles.wrap}>
        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}

        <p className={styles.helper}>
          Cobrança mensal (aluguel + IPTU + condomínio), reajuste por índice (IGPM/IPCA) e obrigações de água/luz com
          comprovante de transferência. A competência do mês corrente é gerada automaticamente todo dia para contratos
          de locação ativos — use “Gerar cobrança” aqui só para competências adicionais ou itens extras (IPTU/condomínio).
        </p>

        <AsyncState result={loadQuery} loadingLabel="Carregando dados de locação...">
        <Tabs
          items={[
            {
              label: "Cobranças",
              content: (
                <Card title="Cronograma de cobrança por competência">
                  <div className={styles.toolbarRow}>
                    <Button onClick={() => setGenerateOpen(true)}>Gerar cobrança</Button>
                  </div>
                  <Table columns={scheduleColumns} rows={schedules} emptyMessage="Nenhuma cobrança gerada ainda." />
                </Card>
              ),
            },
            {
              label: "Reajustes",
              content: (
                <Card title="Reajuste de aluguel por índice (IGPM/IPCA)">
                  <div className={styles.toolbarRow}>
                    <Button onClick={() => setAdjustOpen(true)}>Solicitar reajuste</Button>
                  </div>
                  <Table columns={adjustmentColumns} rows={adjustments} emptyMessage="Nenhum reajuste solicitado ainda." />
                </Card>
              ),
            },
            {
              label: "Obrigações (água/luz)",
              content: <UtilityObligationsTab utilities={utilities} leaseContracts={leaseContracts} onChanged={load} onError={setActionError} />,
            },
            {
              label: "Aluguel garantido",
              content: <GuaranteedRentTab guaranteedRents={guaranteedRents} leaseContracts={leaseContracts} onChanged={load} onError={setActionError} />,
            },
            {
              label: "Antecipação",
              content: <RentAdvancesTab rentAdvances={rentAdvances} leaseContracts={leaseContracts} onChanged={load} onError={setActionError} />,
            },
            {
              label: "Encerramento",
              content: <CloseoutTab leaseContracts={leaseContracts} onChanged={load} onError={setActionError} />,
            },
          ]}
        />
        </AsyncState>
      </div>

      <StickyActionBar>
        <ContractsNavMenu />
      </StickyActionBar>

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Gerar cobrança"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGenerateOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerateSchedule} disabled={!scheduleForm.contractId || !scheduleForm.dueDate || !scheduleForm.amount}>Gerar</Button>
          </>
        }
      >
        <FormField label="Contrato" required>
          <Select value={scheduleForm.contractId} onChange={(e) => setScheduleForm((f) => ({ ...f, contractId: e.target.value }))}>
            <option value="">Selecione...</option>
            {leaseContracts.map((c) => <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>)}
          </Select>
        </FormField>
        <FormField label="Competência (MM/AAAA)" required>
          <Input value={scheduleForm.period} onChange={(e) => setScheduleForm((f) => ({ ...f, period: e.target.value }))} placeholder="10/2026" />
        </FormField>
        <FormField label="Vencimento" required>
          <Input type="date" value={scheduleForm.dueDate} onChange={(e) => setScheduleForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </FormField>
        <FormField label="Componente">
          <Select value={scheduleForm.componentType} onChange={(e) => setScheduleForm((f) => ({ ...f, componentType: e.target.value }))}>
            {Object.entries(COMPONENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormField>
        <FormField label="Valor" required>
          <DecimalInput value={scheduleForm.amount} onChange={(e) => setScheduleForm((f) => ({ ...f, amount: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Registrar pagamento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayTarget(null)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={!payAmount}>Registrar</Button>
          </>
        }
      >
        <p className={styles.helper}>Saldo atual: {payTarget ? formatBRL(payTarget.balance) : ""}</p>
        <FormField label="Valor pago" required>
          <DecimalInput value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
        </FormField>
      </Modal>

      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Solicitar reajuste de aluguel"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
            <Button onClick={handleRequestAdjustment} disabled={!adjustForm.contractId || !adjustForm.oldRentAmount}>Solicitar</Button>
          </>
        }
      >
        <FormField label="Contrato" required>
          <Select value={adjustForm.contractId} onChange={(e) => setAdjustForm((f) => ({ ...f, contractId: e.target.value }))}>
            <option value="">Selecione...</option>
            {leaseContracts.map((c) => <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>)}
          </Select>
        </FormField>
        <FormField label="Competência (MM/AAAA)" required>
          <Input value={adjustForm.period} onChange={(e) => setAdjustForm((f) => ({ ...f, period: e.target.value }))} placeholder="10/2026" />
        </FormField>
        <FormField label="Índice">
          <Select value={adjustForm.indexCode} onChange={(e) => setAdjustForm((f) => ({ ...f, indexCode: e.target.value }))}>
            <option value="IGPM">IGPM</option>
            <option value="IPCA">IPCA</option>
          </Select>
        </FormField>
        <FormField label="Aluguel atual" required>
          <DecimalInput value={adjustForm.oldRentAmount} onChange={(e) => setAdjustForm((f) => ({ ...f, oldRentAmount: e.target.value }))} />
        </FormField>
      </Modal>
    </AppShell>
  );
}
