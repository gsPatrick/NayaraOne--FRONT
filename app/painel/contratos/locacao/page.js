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
} from "@/lib/api/billing";
import { formatBRL, formatDate, formatContractLabel } from "@/lib/format";
import styles from "./page.module.css";

const COMPONENT_LABELS = { RENT: "Aluguel", CONDO: "Condomínio", IPTU: "IPTU", OTHER: "Outro" };
const SCHEDULE_STATUS_TONE = { OPEN: "warning", PARTIALLY_PAID: "info", PAID: "success" };
const SCHEDULE_STATUS_LABEL = { OPEN: "Em aberto", PARTIALLY_PAID: "Parcial", PAID: "Quitado" };
const ADJUSTMENT_STATUS_TONE = { PENDING_SOURCE: "warning", APPLIED: "success", FAILED: "danger" };
const ADJUSTMENT_STATUS_LABEL = { PENDING_SOURCE: "Aguardando índice", APPLIED: "Aplicado", FAILED: "Falhou" };
const UTILITY_TYPE_LABELS = { WATER: "Água", ELECTRICITY: "Energia", GAS: "Gás", CONDO: "Condomínio", IPTU: "IPTU", SPU: "SPU", OTHER: "Outra" };
const UTILITY_STATUS_TONE = { ACTIVE: "success", TRANSFER_PENDING: "warning", TRANSFERRED: "info" };
const UTILITY_STATUS_LABEL = { ACTIVE: "Ativa", TRANSFER_PENDING: "Transferência pendente", TRANSFERRED: "Transferida" };

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function LocacaoPage() {
  const [contracts, setContracts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [utilities, setUtilities] = useState([]);
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

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listContracts(), listBillingSchedules(), listRentAdjustments(), listUtilityObligations()])
      .then(([c, s, a, u]) => {
        setContracts(c || []);
        setSchedules(s || []);
        setAdjustments(a || []);
        setUtilities(u || []);
      })
      .catch((err) => setLoadError(err.message || "Erro ao carregar dados de locação."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const leaseContracts = useMemo(() => contracts.filter((c) => c.contractType === "LEASE"), [contracts]);

  async function handleGenerateSchedule() {
    setActionError("");
    try {
      await generateBillingSchedule({
        contractId: scheduleForm.contractId,
        period: scheduleForm.period,
        dueDate: scheduleForm.dueDate,
        items: [{ componentType: scheduleForm.componentType, amount: Number(scheduleForm.amount) }],
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
      await registerBillingSchedulePayment(payTarget.id, Number(payAmount));
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
        oldRentAmount: Number(adjustForm.oldRentAmount),
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
      await recordUtilityPayment(utilityPayTarget.id, { amount: Number(utilityPayAmount), paidByParty: utilityPaidBy });
      setUtilityPayTarget(null);
      setUtilityPayAmount("");
      load();
    } catch (err) {
      setActionError(err.message || "Erro ao registrar pagamento da obrigação.");
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

  return (
    <AppShell title="Locação" backHref="/painel/contratos">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <p className={styles.helper}>
          Cobrança mensal (aluguel + IPTU + condomínio), reajuste por índice (IGPM/IPCA) e obrigações de água/luz com
          comprovante de transferência. A competência do mês corrente é gerada automaticamente todo dia para contratos
          de locação ativos — use "Gerar cobrança" aqui só para competências adicionais ou itens extras (IPTU/condomínio).
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
          <Input type="number" min="0.01" step="0.01" value={scheduleForm.amount} onChange={(e) => setScheduleForm((f) => ({ ...f, amount: e.target.value }))} />
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
          <Input type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
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
          <Input type="number" min="0.01" step="0.01" value={adjustForm.oldRentAmount} onChange={(e) => setAdjustForm((f) => ({ ...f, oldRentAmount: e.target.value }))} />
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
          <Input type="number" min="0.01" step="0.01" value={utilityPayAmount} onChange={(e) => setUtilityPayAmount(e.target.value)} />
        </FormField>
      </Modal>
    </AppShell>
  );
}
