"use client";

// Gap real da auditoria externa (Abacus AI, 11/10/2026): "Billing mensal automático de
// locação (aluguel + IPTU + condomínio + água/luz, reajuste IGPM/IPCA) não foi encontrado —
// apenas lançamentos financeiros avulsos." e "Obrigações locatícias com comprovante de
// transferência (água/energia) — Nenhuma tela ou módulo encontrado." O backend
// (billingSchedule/rentAdjustment/utilities services) já existia pronto e testado; esta tela
// é o que faltava para um usuário conseguir operar isso de ponta a ponta.

import { useEffect, useMemo, useState } from "react";
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
import Modal from "@/components/organisms/Modal/Modal";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import { listContracts } from "@/lib/api/legal";
import {
  listBillingSchedules,
  generateBillingSchedule,
  registerBillingSchedulePayment,
  listRentAdjustments,
  requestRentAdjustment,
  listUtilityObligations,
  createUtilityObligation,
  recordUtilityPayment,
  listGuaranteedRentContracts,
  enrollGuaranteedRent,
  payGuaranteedRent,
  listRentAdvances,
  requestRentAdvance,
  proposeRentAdvance,
  acceptRentAdvance,
  payRentAdvance,
  recoverRentAdvance,
  checkCloseoutEligibility,
  closeoutContract,
} from "@/lib/api/billing";
import { formatBRL, formatDate, formatContractLabel, toNumber } from "@/lib/format";
import styles from "./page.module.css";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";

const COMPONENT_LABELS = { RENT: "Aluguel", CONDO: "Condomínio", IPTU: "IPTU", OTHER: "Outro" };
const SCHEDULE_STATUS_TONE = { OPEN: "warning", PARTIALLY_PAID: "info", PAID: "success" };
const SCHEDULE_STATUS_LABEL = { OPEN: "Em aberto", PARTIALLY_PAID: "Parcial", PAID: "Quitado" };
const ADJUSTMENT_STATUS_TONE = { PENDING_SOURCE: "warning", APPLIED: "success", FAILED: "danger" };
const ADJUSTMENT_STATUS_LABEL = { PENDING_SOURCE: "Aguardando índice", APPLIED: "Aplicado", FAILED: "Falhou" };
const UTILITY_TYPE_LABELS = { WATER: "Água", ELECTRICITY: "Energia", GAS: "Gás", CONDO: "Condomínio", IPTU: "IPTU", SPU: "SPU", OTHER: "Outra" };
const UTILITY_STATUS_TONE = { ACTIVE: "success", TRANSFER_PENDING: "warning", TRANSFERRED: "info" };
const UTILITY_STATUS_LABEL = { ACTIVE: "Ativa", TRANSFER_PENDING: "Transferência pendente", TRANSFERRED: "Transferida" };
const GUARANTEED_RENT_STATUS_TONE = { ACTIVE: "success", SUSPENDED: "warning", CANCELLED: "neutral" };
const GUARANTEED_RENT_STATUS_LABEL = { ACTIVE: "Ativo", SUSPENDED: "Suspenso", CANCELLED: "Cancelado" };
const RENT_ADVANCE_STATUS_TONE = { ELIGIBLE: "neutral", PROPOSED: "warning", ACCEPTED: "info", PAID: "success", RECOVERING: "warning", RECOVERED: "success" };
const RENT_ADVANCE_STATUS_LABEL = { ELIGIBLE: "Elegível", PROPOSED: "Proposto", ACCEPTED: "Aceito", PAID: "Pago", RECOVERING: "Recuperando", RECOVERED: "Recuperado" };

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function LocacaoPage() {
  const [contracts, setContracts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [guaranteedRents, setGuaranteedRents] = useState([]);
  const [rentAdvances, setRentAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [generateOpen, setGenerateOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [utilityOpen, setUtilityOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [utilityPayTarget, setUtilityPayTarget] = useState(null);
  const [utilityPayAmount, setUtilityPayAmount] = useState("");
  const [utilityPaidBy, setUtilityPaidBy] = useState("TENANT");

  const [scheduleForm, setScheduleForm] = useState({ contractId: "", period: currentPeriod(), dueDate: "", componentType: "RENT", amount: "" });
  const [adjustForm, setAdjustForm] = useState({ contractId: "", period: currentPeriod(), indexCode: "IGPM", oldRentAmount: "" });
  const [utilityForm, setUtilityForm] = useState({ contractId: "", utilityType: "WATER", responsibleParty: "TENANT", provider: "", transferRequired: false });

  // GAP REAL CORRIGIDO (varredura completa do Marco 5 contra o addendum "Cobrança de locação +
  // utilidades" do Caderno, 12/10/2026): aluguel garantido, antecipação de aluguel e
  // encerramento (closeout) tinham backend completo desde a mesma rodada do billing mensal,
  // mas nenhuma tela chamava nada — ver lib/api/billing.js.
  const [guaranteedOpen, setGuaranteedOpen] = useState(false);
  const [guaranteedForm, setGuaranteedForm] = useState({ contractId: "", coverageStartsAt: "" });
  const [guaranteedPayTarget, setGuaranteedPayTarget] = useState(null);
  const [guaranteedPayAmount, setGuaranteedPayAmount] = useState("");

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ contractId: "", monthsAdvanced: "", principalAmount: "", costAmount: "" });
  const [recoverTarget, setRecoverTarget] = useState(null);
  const [recoverAmount, setRecoverAmount] = useState("");

  const [closeoutContractId, setCloseoutContractId] = useState("");
  const [closeoutResult, setCloseoutResult] = useState(null);
  const [closeoutBusy, setCloseoutBusy] = useState(false);

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([
      listContracts(),
      listBillingSchedules(),
      listRentAdjustments(),
      listUtilityObligations(),
      listGuaranteedRentContracts(),
      listRentAdvances(),
    ])
      .then(([c, s, a, u, g, r]) => {
        setContracts(c || []);
        setSchedules(s || []);
        setAdjustments(a || []);
        setUtilities(u || []);
        setGuaranteedRents(g || []);
        setRentAdvances(r || []);
      })
      .catch((err) => setLoadError(err.message || "Erro ao carregar dados de locação."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // Subtipos de locação (JUR, Caderno seção 3): LEASE genérico + LEASE_RESIDENTIAL/
  // LEASE_COMMERCIAL/LEASE_SEASONAL/PROPERTY_ADMIN.
  const LEASE_LIKE_TYPES = ["LEASE", "LEASE_RESIDENTIAL", "LEASE_COMMERCIAL", "LEASE_SEASONAL", "PROPERTY_ADMIN"];
  const leaseContracts = useMemo(() => contracts.filter((c) => LEASE_LIKE_TYPES.includes(c.contractType)), [contracts]);

  async function handleGenerateSchedule() {
    setActionError("");
    try {
      await generateBillingSchedule({
        contractId: scheduleForm.contractId,
        period: scheduleForm.period,
        dueDate: scheduleForm.dueDate,
        items: [{ componentType: scheduleForm.componentType, amount: toNumber(scheduleForm.amount) }],
      });
      setGenerateOpen(false);
      setScheduleForm({ contractId: "", period: currentPeriod(), dueDate: "", componentType: "RENT", amount: "" });
      load();
    } catch (err) {
      setActionError(err.message || "Erro ao gerar cobrança.");
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
      setActionError(err.message || "Erro ao registrar pagamento.");
    }
  }

  async function handleRequestAdjustment() {
    setActionError("");
    try {
      await requestRentAdjustment({
        contractId: adjustForm.contractId,
        period: adjustForm.period,
        indexCode: adjustForm.indexCode,
        oldRentAmount: toNumber(adjustForm.oldRentAmount),
      });
      setAdjustOpen(false);
      setAdjustForm({ contractId: "", period: currentPeriod(), indexCode: "IGPM", oldRentAmount: "" });
      load();
    } catch (err) {
      setActionError(err.message || "Erro ao solicitar reajuste.");
    }
  }

  async function handleCreateUtility() {
    setActionError("");
    try {
      await createUtilityObligation({
        contractId: utilityForm.contractId,
        utilityType: utilityForm.utilityType,
        responsibleParty: utilityForm.responsibleParty,
        provider: utilityForm.provider || undefined,
        transferRequired: utilityForm.transferRequired,
      });
      setUtilityOpen(false);
      setUtilityForm({ contractId: "", utilityType: "WATER", responsibleParty: "TENANT", provider: "", transferRequired: false });
      load();
    } catch (err) {
      setActionError(err.message || "Erro ao criar obrigação.");
    }
  }

  async function handleUtilityPay() {
    setActionError("");
    try {
      await recordUtilityPayment(utilityPayTarget.id, { amount: toNumber(utilityPayAmount), paidByParty: utilityPaidBy });
      setUtilityPayTarget(null);
      setUtilityPayAmount("");
      load();
    } catch (err) {
      setActionError(err.message || "Erro ao registrar pagamento da obrigação.");
    }
  }

  async function handleEnrollGuaranteed() {
    setActionError("");
    try {
      await enrollGuaranteedRent({ contractId: guaranteedForm.contractId, coverageStartsAt: guaranteedForm.coverageStartsAt });
      setGuaranteedOpen(false);
      setGuaranteedForm({ contractId: "", coverageStartsAt: "" });
      load();
    } catch (err) {
      setActionError(err.message || "Erro ao matricular aluguel garantido.");
    }
  }

  async function handleGuaranteedPay() {
    setActionError("");
    try {
      await payGuaranteedRent(guaranteedPayTarget.id, { amount: toNumber(guaranteedPayAmount) });
      setGuaranteedPayTarget(null);
      setGuaranteedPayAmount("");
      load();
    } catch (err) {
      setActionError(err.message || "Erro ao pagar repasse de aluguel garantido.");
    }
  }

  async function handleRequestAdvance() {
    setActionError("");
    try {
      await requestRentAdvance({
        contractId: advanceForm.contractId,
        monthsAdvanced: Number(advanceForm.monthsAdvanced),
        principalAmount: toNumber(advanceForm.principalAmount),
        costAmount: advanceForm.costAmount ? toNumber(advanceForm.costAmount) : undefined,
      });
      setAdvanceOpen(false);
      setAdvanceForm({ contractId: "", monthsAdvanced: "", principalAmount: "", costAmount: "" });
      load();
    } catch (err) {
      setActionError(err.message || "Erro ao solicitar antecipação de aluguel.");
    }
  }

  async function handleAdvanceTransition(id, fn) {
    setActionError("");
    try {
      await fn(id);
      load();
    } catch (err) {
      setActionError(err.message || "Erro ao atualizar antecipação de aluguel.");
    }
  }

  async function handleRecoverAdvance() {
    setActionError("");
    try {
      await recoverRentAdvance(recoverTarget.id, toNumber(recoverAmount));
      setRecoverTarget(null);
      setRecoverAmount("");
      load();
    } catch (err) {
      setActionError(err.message || "Erro ao registrar recuperação da antecipação.");
    }
  }

  async function handleCheckCloseout() {
    if (!closeoutContractId) return;
    setCloseoutBusy(true);
    setCloseoutResult(null);
    setActionError("");
    try {
      const reasons = await checkCloseoutEligibility(closeoutContractId);
      setCloseoutResult({ reasons: reasons || [] });
    } catch (err) {
      setActionError(err.message || "Erro ao checar elegibilidade de encerramento.");
    } finally {
      setCloseoutBusy(false);
    }
  }

  async function handleCloseout() {
    if (!closeoutContractId) return;
    setCloseoutBusy(true);
    setActionError("");
    try {
      await closeoutContract(closeoutContractId);
      setCloseoutResult({ reasons: [], closed: true });
      load();
    } catch (err) {
      if (err?.code === "CLOSEOUT_BLOCKED") {
        setCloseoutResult({ reasons: err.details?.reasons || [], closed: false });
      } else {
        setActionError(err.message || "Erro ao encerrar contrato.");
      }
    } finally {
      setCloseoutBusy(false);
    }
  }

  const scheduleColumns = [
    { key: "contractId", label: "Contrato", render: (row) => formatContractLabel(leaseContracts.find((c) => c.id === row.contractId)) || row.contractId.slice(0, 8) },
    { key: "period", label: "Competência" },
    { key: "dueDate", label: "Vencimento", render: (row) => formatDate(row.dueDate) },
    { key: "totalAmount", label: "Total", render: (row) => formatBRL(row.totalAmount) },
    { key: "balance", label: "Saldo", render: (row) => formatBRL(row.balance) },
    { key: "status", label: "Status", render: (row) => <Badge tone={SCHEDULE_STATUS_TONE[row.status] || "neutral"}>{SCHEDULE_STATUS_LABEL[row.status] || row.status}</Badge> },
    {
      key: "actions",
      label: "",
      render: (row) =>
        row.status !== "PAID" ? (
          <Button variant="secondary" size="sm" onClick={() => { setPayTarget(row); setPayAmount(""); }}>
            Registrar pagamento
          </Button>
        ) : null,
    },
  ];

  const adjustmentColumns = [
    { key: "contractId", label: "Contrato", render: (row) => formatContractLabel(leaseContracts.find((c) => c.id === row.contractId)) || row.contractId.slice(0, 8) },
    { key: "period", label: "Competência" },
    { key: "indexCode", label: "Índice" },
    { key: "oldRentAmount", label: "Aluguel anterior", render: (row) => formatBRL(row.oldRentAmount) },
    { key: "newRentAmount", label: "Novo aluguel", render: (row) => (row.newRentAmount != null ? formatBRL(row.newRentAmount) : "—") },
    { key: "status", label: "Status", render: (row) => <Badge tone={ADJUSTMENT_STATUS_TONE[row.status] || "neutral"}>{ADJUSTMENT_STATUS_LABEL[row.status] || row.status}</Badge> },
  ];

  const utilityColumns = [
    { key: "contractId", label: "Contrato", render: (row) => formatContractLabel(leaseContracts.find((c) => c.id === row.contractId)) || row.contractId.slice(0, 8) },
    { key: "utilityType", label: "Tipo", render: (row) => UTILITY_TYPE_LABELS[row.utilityType] || row.utilityType },
    { key: "responsibleParty", label: "Responsável", render: (row) => (row.responsibleParty === "TENANT" ? "Locatário" : "Locador") },
    { key: "status", label: "Status", render: (row) => <Badge tone={UTILITY_STATUS_TONE[row.status] || "neutral"}>{UTILITY_STATUS_LABEL[row.status] || row.status}</Badge> },
    {
      key: "evidence",
      label: "Comprovante",
      render: (row) => (row.evidenceFileId ? <Badge tone="success">Anexado</Badge> : <span className={styles.helper}>Sem comprovante</span>),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Button variant="secondary" size="sm" onClick={() => { setUtilityPayTarget(row); setUtilityPayAmount(""); setUtilityPaidBy(row.responsibleParty); }}>
          Registrar pagamento
        </Button>
      ),
    },
  ];

  const guaranteedRentColumns = [
    { key: "contractId", label: "Contrato", render: (row) => formatContractLabel(leaseContracts.find((c) => c.id === row.contractId)) || row.contractId.slice(0, 8) },
    { key: "coverageStartsAt", label: "Cobertura desde", render: (row) => formatDate(row.coverageStartsAt) },
    { key: "status", label: "Status", render: (row) => <Badge tone={GUARANTEED_RENT_STATUS_TONE[row.status] || "neutral"}>{GUARANTEED_RENT_STATUS_LABEL[row.status] || row.status}</Badge> },
    {
      key: "actions",
      label: "",
      render: (row) => (
        row.status === "ACTIVE" ? (
          <Button variant="secondary" size="sm" onClick={() => { setGuaranteedPayTarget(row); setGuaranteedPayAmount(""); }}>
            Pagar repasse
          </Button>
        ) : null
      ),
    },
  ];

  const rentAdvanceColumns = [
    { key: "contractId", label: "Contrato", render: (row) => formatContractLabel(leaseContracts.find((c) => c.id === row.contractId)) || row.contractId.slice(0, 8) },
    { key: "monthsAdvanced", label: "Meses", render: (row) => row.monthsAdvanced },
    { key: "principalAmount", label: "Principal", render: (row) => formatBRL(row.principalAmount) },
    { key: "status", label: "Status", render: (row) => <Badge tone={RENT_ADVANCE_STATUS_TONE[row.status] || "neutral"}>{RENT_ADVANCE_STATUS_LABEL[row.status] || row.status}</Badge> },
    {
      key: "actions",
      label: "",
      render: (row) => {
        if (row.status === "ELIGIBLE") return <Button variant="secondary" size="sm" onClick={() => handleAdvanceTransition(row.id, proposeRentAdvance)}>Propor</Button>;
        if (row.status === "PROPOSED") return <Button variant="secondary" size="sm" onClick={() => handleAdvanceTransition(row.id, acceptRentAdvance)}>Aceitar</Button>;
        if (row.status === "ACCEPTED") return <Button variant="secondary" size="sm" onClick={() => handleAdvanceTransition(row.id, payRentAdvance)}>Pagar</Button>;
        if (row.status === "PAID" || row.status === "RECOVERING") return <Button variant="secondary" size="sm" onClick={() => { setRecoverTarget(row); setRecoverAmount(""); }}>Registrar recuperação</Button>;
        return null;
      },
    },
  ];

  return (
    <AppShell title="Locação (cobrança e reajuste)" backHref="/painel/contratos">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <p className={styles.helper}>
          Cobrança mensal (aluguel + IPTU + condomínio), reajuste por índice (IGPM/IPCA) e obrigações de água/luz com
          comprovante de transferência. A competência do mês corrente é gerada automaticamente todo dia para contratos
          de locação ativos — use “Gerar cobrança” aqui só para competências adicionais ou itens extras (IPTU/condomínio).
        </p>

        <Tabs
          items={[
            {
              label: "Cobranças",
              content: (
                <Card title="Cronograma de cobrança por competência">
                  <div className={styles.toolbarRow}>
                    <Button onClick={() => setGenerateOpen(true)}>Gerar cobrança</Button>
                  </div>
                  <Table columns={scheduleColumns} rows={schedules} loading={loading} emptyMessage="Nenhuma cobrança gerada ainda." />
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
                  <Table columns={adjustmentColumns} rows={adjustments} loading={loading} emptyMessage="Nenhum reajuste solicitado ainda." />
                </Card>
              ),
            },
            {
              label: "Obrigações (água/luz)",
              content: (
                <Card title="Obrigações locatícias e comprovante de transferência">
                  <div className={styles.toolbarRow}>
                    <Button onClick={() => setUtilityOpen(true)}>Nova obrigação</Button>
                  </div>
                  <Table columns={utilityColumns} rows={utilities} loading={loading} emptyMessage="Nenhuma obrigação cadastrada ainda." />
                </Card>
              ),
            },
            {
              label: "Aluguel garantido",
              content: (
                <Card title="Aluguel garantido" subtitle="Obrigação da empresa ao proprietário + crédito a recuperar do locatário">
                  <div className={styles.toolbarRow}>
                    <Button onClick={() => setGuaranteedOpen(true)}>Matricular contrato</Button>
                  </div>
                  <Table columns={guaranteedRentColumns} rows={guaranteedRents} loading={loading} emptyMessage="Nenhum contrato matriculado em aluguel garantido." />
                </Card>
              ),
            },
            {
              label: "Antecipação",
              content: (
                <Card title="Antecipação de aluguel" subtitle="Produto separado — principal e custo ficam separados no Financeiro">
                  <div className={styles.toolbarRow}>
                    <Button onClick={() => setAdvanceOpen(true)}>Solicitar antecipação</Button>
                  </div>
                  <Table columns={rentAdvanceColumns} rows={rentAdvances} loading={loading} emptyMessage="Nenhuma antecipação solicitada ainda." />
                </Card>
              ),
            },
            {
              label: "Encerramento",
              content: (
                <Card title="Encerramento de contrato" subtitle="Bloqueado enquanto houver cobrança em aberto ou transferência de utilidade pendente">
                  <div className={styles.form}>
                    <FormField label="Contrato" required>
                      <Select value={closeoutContractId} onChange={(e) => { setCloseoutContractId(e.target.value); setCloseoutResult(null); }}>
                        <option value="">Selecione...</option>
                        {leaseContracts.map((c) => <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>)}
                      </Select>
                    </FormField>
                    <div className={styles.toolbarRow}>
                      <Button variant="secondary" onClick={handleCheckCloseout} loading={closeoutBusy} disabled={!closeoutContractId || closeoutBusy}>Checar elegibilidade</Button>
                      <Button onClick={handleCloseout} loading={closeoutBusy} disabled={!closeoutContractId || closeoutBusy}>Encerrar contrato</Button>
                    </div>
                    {closeoutResult?.closed ? (
                      <Alert tone="success">Contrato encerrado com sucesso.</Alert>
                    ) : closeoutResult ? (
                      closeoutResult.reasons.length === 0 ? (
                        <Alert tone="success">Elegível para encerramento — nenhuma pendência crítica.</Alert>
                      ) : (
                        <Alert tone="warning">
                          Bloqueado por {closeoutResult.reasons.length} pendência(s):
                          <ul>{closeoutResult.reasons.map((r, i) => <li key={i}>{r.detail}</li>)}</ul>
                        </Alert>
                      )
                    ) : null}
                  </div>
                </Card>
              ),
            },
          ]}
        />
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
        <FormField label="Competência (AAAA-MM)" required>
          <Input value={scheduleForm.period} onChange={(e) => setScheduleForm((f) => ({ ...f, period: e.target.value }))} placeholder="2026-10" />
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
        <FormField label="Competência (AAAA-MM)" required>
          <Input value={adjustForm.period} onChange={(e) => setAdjustForm((f) => ({ ...f, period: e.target.value }))} placeholder="2026-10" />
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

      <Modal
        open={utilityOpen}
        onClose={() => setUtilityOpen(false)}
        title="Nova obrigação locatícia"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUtilityOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUtility} disabled={!utilityForm.contractId}>Criar</Button>
          </>
        }
      >
        <FormField label="Contrato" required>
          <Select value={utilityForm.contractId} onChange={(e) => setUtilityForm((f) => ({ ...f, contractId: e.target.value }))}>
            <option value="">Selecione...</option>
            {leaseContracts.map((c) => <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>)}
          </Select>
        </FormField>
        <FormField label="Tipo">
          <Select value={utilityForm.utilityType} onChange={(e) => setUtilityForm((f) => ({ ...f, utilityType: e.target.value }))}>
            {Object.entries(UTILITY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormField>
        <FormField label="Parte responsável">
          <Select value={utilityForm.responsibleParty} onChange={(e) => setUtilityForm((f) => ({ ...f, responsibleParty: e.target.value }))}>
            <option value="TENANT">Locatário</option>
            <option value="LANDLORD">Locador</option>
          </Select>
        </FormField>
        <FormField label="Fornecedor" helper="Opcional">
          <Input value={utilityForm.provider} onChange={(e) => setUtilityForm((f) => ({ ...f, provider: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(utilityPayTarget)}
        onClose={() => setUtilityPayTarget(null)}
        title="Registrar pagamento de obrigação"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUtilityPayTarget(null)}>Cancelar</Button>
            <Button onClick={handleUtilityPay} disabled={!utilityPayAmount}>Registrar</Button>
          </>
        }
      >
        <FormField label="Quem pagou">
          <Select value={utilityPaidBy} onChange={(e) => setUtilityPaidBy(e.target.value)}>
            <option value="TENANT">Locatário</option>
            <option value="LANDLORD">Locador</option>
          </Select>
        </FormField>
        <FormField label="Valor" required>
          <DecimalInput value={utilityPayAmount} onChange={(e) => setUtilityPayAmount(e.target.value)} />
        </FormField>
      </Modal>

      <Modal
        open={guaranteedOpen}
        onClose={() => setGuaranteedOpen(false)}
        title="Matricular contrato em aluguel garantido"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGuaranteedOpen(false)}>Cancelar</Button>
            <Button onClick={handleEnrollGuaranteed} disabled={!guaranteedForm.contractId || !guaranteedForm.coverageStartsAt}>Matricular</Button>
          </>
        }
      >
        <FormField label="Contrato" required>
          <Select value={guaranteedForm.contractId} onChange={(e) => setGuaranteedForm((f) => ({ ...f, contractId: e.target.value }))}>
            <option value="">Selecione...</option>
            {leaseContracts.map((c) => <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>)}
          </Select>
        </FormField>
        <FormField label="Início da cobertura" required>
          <Input type="date" value={guaranteedForm.coverageStartsAt} onChange={(e) => setGuaranteedForm((f) => ({ ...f, coverageStartsAt: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(guaranteedPayTarget)}
        onClose={() => setGuaranteedPayTarget(null)}
        title="Pagar repasse ao proprietário"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGuaranteedPayTarget(null)}>Cancelar</Button>
            <Button onClick={handleGuaranteedPay} disabled={!guaranteedPayAmount}>Registrar</Button>
          </>
        }
      >
        <FormField label="Valor" required>
          <DecimalInput value={guaranteedPayAmount} onChange={(e) => setGuaranteedPayAmount(e.target.value)} />
        </FormField>
      </Modal>

      <Modal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        title="Solicitar antecipação de aluguel"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdvanceOpen(false)}>Cancelar</Button>
            <Button onClick={handleRequestAdvance} disabled={!advanceForm.contractId || !advanceForm.monthsAdvanced || !advanceForm.principalAmount}>Solicitar</Button>
          </>
        }
      >
        <FormField label="Contrato" required>
          <Select value={advanceForm.contractId} onChange={(e) => setAdvanceForm((f) => ({ ...f, contractId: e.target.value }))}>
            <option value="">Selecione...</option>
            {leaseContracts.map((c) => <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>)}
          </Select>
        </FormField>
        <FormField label="Meses antecipados" required>
          <Input type="number" min="1" step="1" value={advanceForm.monthsAdvanced} onChange={(e) => setAdvanceForm((f) => ({ ...f, monthsAdvanced: e.target.value }))} />
        </FormField>
        <FormField label="Valor principal" required>
          <DecimalInput value={advanceForm.principalAmount} onChange={(e) => setAdvanceForm((f) => ({ ...f, principalAmount: e.target.value }))} />
        </FormField>
        <FormField label="Custo da operação" helper="Opcional — fica separado do principal no Financeiro.">
          <DecimalInput value={advanceForm.costAmount} onChange={(e) => setAdvanceForm((f) => ({ ...f, costAmount: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(recoverTarget)}
        onClose={() => setRecoverTarget(null)}
        title="Registrar recuperação de antecipação"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRecoverTarget(null)}>Cancelar</Button>
            <Button onClick={handleRecoverAdvance} disabled={!recoverAmount}>Registrar</Button>
          </>
        }
      >
        <FormField label="Valor recuperado do locatário" required>
          <DecimalInput value={recoverAmount} onChange={(e) => setRecoverAmount(e.target.value)} />
        </FormField>
      </Modal>
    </AppShell>
  );
}
