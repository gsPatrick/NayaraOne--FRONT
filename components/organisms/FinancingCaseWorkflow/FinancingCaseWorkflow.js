"use client";

import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Alert from "@/components/molecules/Alert/Alert";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import FormField from "@/components/molecules/FormField/FormField";
import Modal from "@/components/organisms/Modal/Modal";
import Table from "@/components/organisms/Table/Table";
import { registerManualStatus, cancelFinancingCase, listFinancingProposals, reviewDuplicate } from "@/lib/api/correspondent";
import { formatBRL, formatDate, formatDateTime, toNumber } from "@/lib/format";
import { hasPermission } from "@/lib/rbac/permissions";
import { canMoveManually } from "@/app/painel/correspondente/_labels";

const MANUAL_OPTIONS = [
  { value: "UNDER_ANALYSIS", label: "Em análise no banco" },
  { value: "PENDING_CUSTOMER", label: "Aguardando documentos do cliente" },
  { value: "PENDING_PROPERTY", label: "Aguardando documentação do imóvel" },
  { value: "APPROVED", label: "Aprovado pelo banco" },
  { value: "REJECTED", label: "Recusado pelo banco" },
  { value: "CONTRACTING", label: "Em contratação" },
  { value: "COMPLETED", label: "Concluído (contrato assinado)" },
];
const PRE_SUBMISSION = ["DRAFT", "DOCUMENTS_PENDING", "READY_TO_SUBMIT"];
const FINAL = ["COMPLETED", "CANCELED"];
const WITH_PROPOSAL = ["APPROVED", "CONTRACTING"];
const EMPTY_PROPOSAL = { approvedAmount: "", annualRatePct: "", termMonths: "", monthlyPayment: "", validUntil: "" };

const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const percent = (v) => `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;

export default function FinancingCaseWorkflow({ financingCase, onChanged }) {
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [canWrite, setCanWrite] = useState(false);
  const [note, setNote] = useState("");
  const [proposal, setProposal] = useState(EMPTY_PROPOSAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const [dupOpen, setDupOpen] = useState(false);
  const [dupDecision, setDupDecision] = useState("DISMISS");
  const [dupNote, setDupNote] = useState("");
  const [dupSaving, setDupSaving] = useState(false);
  const [dupError, setDupError] = useState("");

  const id = financingCase.id;
  const dupPending = (financingCase.duplicateReviewStatus || financingCase.duplicate_review_status) === "PENDING";
  const dupOfId = financingCase.possibleDuplicateOfCaseId || financingCase.possible_duplicate_of_case_id;
  const isManual = financingCase.providerCode === "manual" || financingCase.provider_code === "manual";
  const current = financingCase.status;
  const canRegister = isManual && !PRE_SUBMISSION.includes(current) && !FINAL.includes(current);
  const canCancel = !FINAL.includes(current);
  const manualOptions = MANUAL_OPTIONS.filter((o) => canMoveManually(current, o.value));
  useEffect(() => { setCanWrite(hasPermission("correspondent:create")); }, []);
  // Mantém a opção escolhida sempre válida para a etapa atual.
  useEffect(() => {
    if (!manualOptions.some((o) => o.value === status)) setStatus(manualOptions[0]?.value || "");
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadProposals() {
    setProposalsLoading(true);
    listFinancingProposals(id)
      .then((rows) => setProposals(rows || []))
      .catch(() => setProposals([]))
      .finally(() => setProposalsLoading(false));
  }
  useEffect(() => { loadProposals(); }, [id, current]); // eslint-disable-line react-hooks/exhaustive-deps

  const proposalNeeded = WITH_PROPOSAL.includes(status);
  const proposalFilled = Object.values(proposal).some((v) => v !== "");
  const proposalValid = !proposalFilled || (proposal.approvedAmount !== "" && toNumber(proposal.approvedAmount) > 0 && proposal.termMonths !== "" && Number.isInteger(Number(proposal.termMonths)) && Number(proposal.termMonths) >= 1 && Number(proposal.termMonths) <= 480);
  const validUntilPast = proposal.validUntil !== "" && proposal.validUntil < todayIso();
  const paymentAboveAmount = proposal.monthlyPayment !== "" && proposal.approvedAmount !== "" && toNumber(proposal.monthlyPayment) > toNumber(proposal.approvedAmount);
  const canSave = canWrite && Boolean(status) && !validUntilPast && !paymentAboveAmount && !saving && proposalValid && (status !== "REJECTED" || note.trim().length >= 3);

  async function handleRegister() {
    if (saving || !canSave) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = { status, note: note.trim() || undefined };
      if (proposalNeeded && proposalFilled) {
        payload.proposal = {
          approvedAmount: toNumber(proposal.approvedAmount),
          annualRatePct: proposal.annualRatePct === "" ? undefined : toNumber(proposal.annualRatePct),
          termMonths: Number(proposal.termMonths),
          monthlyPayment: proposal.monthlyPayment === "" ? undefined : toNumber(proposal.monthlyPayment),
          validUntil: proposal.validUntil || undefined,
        };
      }
      await registerManualStatus(id, payload);
      setNotice("Resultado do banco registrado.");
      setNote("");
      setProposal(EMPTY_PROPOSAL);
      loadProposals();
      onChanged?.();
    } catch (err) {
      setError(err?.message || "Não foi possível registrar o resultado do banco.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReviewDuplicate() {
    if (dupSaving) return;
    setDupSaving(true);
    setDupError("");
    try {
      await reviewDuplicate(id, { decision: dupDecision, note: dupNote.trim() });
      setDupOpen(false);
      setDupNote("");
      onChanged?.();
    } catch (err) {
      setDupError(err?.message || "Não foi possível registrar a decisão.");
    } finally {
      setDupSaving(false);
    }
  }

  async function handleCancel() {
    if (canceling) return;
    setCanceling(true);
    setCancelError("");
    try {
      await cancelFinancingCase(id, cancelReason.trim());
      setCancelOpen(false);
      setCancelReason("");
      onChanged?.();
    } catch (err) {
      setCancelError(err?.message || "Não foi possível cancelar o caso.");
    } finally {
      setCanceling(false);
    }
  }

  const proposalColumns = [
    { key: "approvedAmount", label: "Valor aprovado", render: (p) => formatBRL(p.approvedAmount) },
    { key: "annualRatePct", label: "Taxa ao ano", render: (p) => (p.annualRatePct === null || p.annualRatePct === undefined ? "Sem taxa informada pelo banco" : percent(p.annualRatePct)) },
    { key: "termMonths", label: "Prazo", render: (p) => `${p.termMonths} meses` },
    { key: "monthlyPayment", label: "Parcela", render: (p) => (p.monthlyPayment ? formatBRL(p.monthlyPayment) : "Sem parcela informada pelo banco") },
    { key: "validUntil", label: "Válida até", render: (p) => (p.validUntil ? formatDate(p.validUntil) : "Sem validade definida") },
    { key: "source", label: "Origem", render: (p) => (p.source === "PROVIDER" ? "Enviada pelo provider" : p.source === "MANUAL" ? "Informada por uma pessoa" : "Origem não identificada") },
    { key: "createdAt", label: "Registrada em", render: (p) => formatDateTime(p.createdAt || p.created_at) },
    { key: "status", label: "Situação", render: (p) => <Badge tone={p.status === "ACTIVE" ? "success" : "neutral"}>{p.status === "ACTIVE" ? "Vigente" : "Substituída"}</Badge> },
  ];

  return (
    <>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error && !canRegister ? <Alert tone="danger">{error}</Alert> : null}
      {dupPending ? (
        <Alert tone="warning" title="Possível duplicata aguardando revisão">
          Este caso tem o mesmo proponente e imóvel de outro caso aberto dentro da janela de possível duplicata definida em Parâmetros. O sistema não bloqueia nada sozinho: uma pessoa decide.
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dupOfId ? <Button variant="secondary" href={`/painel/correspondente/${dupOfId}`}>Ver o caso original</Button> : null}
            {canWrite ? <Button onClick={() => { setDupDecision("DISMISS"); setDupNote(""); setDupError(""); setDupOpen(true); }}>Revisar</Button> : null}
          </div>
        </Alert>
      ) : null}

      {current === "CANCELED" ? (
        <Alert tone="danger" title="Caso cancelado">
          Motivo: {financingCase.canceledReason || financingCase.canceled_reason || "não informado"}. Cancelado em {formatDateTime(financingCase.canceledAt || financingCase.canceled_at)}.
          O caso não aceita novos documentos, simulações, avaliações nem envios, e o histórico continua preservado.
        </Alert>
      ) : null}

      {canRegister ? (
        <Card
          title="Resultado do banco"
          subtitle="Este caso é conduzido manualmente com o banco. Aqui você informa o que o banco respondeu: o caso segue pelos mesmos estados e eventos de um caso com integração."
          style={{ marginTop: 16 }}
        >
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FormField label="Resultado" htmlFor="manual-status" helper="Só aparecem os resultados possíveis a partir da etapa atual do caso.">
              <Select id="manual-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {manualOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </FormField>
            <FormField label={status === "REJECTED" ? "Motivo da recusa" : "Observação"} htmlFor="manual-note" required={status === "REJECTED"} helper={status === "REJECTED" ? "Obrigatório: o motivo fica registrado na auditoria." : "Opcional: com quem você falou, o que o banco pediu."}>
              <Input id="manual-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            </FormField>
            {proposalNeeded ? (
              <>
                <p style={{ margin: 0, fontSize: 13 }}>Condições da proposta do banco (opcional; se preencher, valor aprovado e prazo são obrigatórios):</p>
                <FormField label="Valor aprovado (R$)" htmlFor="proposal-amount">
                  <DecimalInput id="proposal-amount" maxDecimals={2} value={proposal.approvedAmount} onChange={(e) => setProposal((p) => ({ ...p, approvedAmount: e.target.value }))} placeholder="0,00" />
                </FormField>
                <FormField label="Taxa ao ano (%)" htmlFor="proposal-rate">
                  <DecimalInput id="proposal-rate" maxDecimals={4} value={proposal.annualRatePct} onChange={(e) => setProposal((p) => ({ ...p, annualRatePct: e.target.value }))} placeholder="0,00" />
                </FormField>
                <FormField label="Prazo (meses)" htmlFor="proposal-term" helper="De 1 a 480 meses.">
                  <Input id="proposal-term" inputMode="numeric" value={proposal.termMonths} onChange={(e) => setProposal((p) => ({ ...p, termMonths: e.target.value.replace(/\D/g, "") }))} />
                </FormField>
                <FormField label="Parcela (R$)" htmlFor="proposal-payment" error={paymentAboveAmount ? "A parcela não pode ser maior que o valor aprovado." : undefined}>
                  <DecimalInput id="proposal-payment" maxDecimals={2} value={proposal.monthlyPayment} onChange={(e) => setProposal((p) => ({ ...p, monthlyPayment: e.target.value }))} placeholder="0,00" />
                </FormField>
                <FormField label="Proposta válida até" htmlFor="proposal-valid" error={validUntilPast ? "A validade não pode estar no passado." : undefined}>
                  <Input id="proposal-valid" type="date" value={proposal.validUntil} onChange={(e) => setProposal((p) => ({ ...p, validUntil: e.target.value }))} />
                </FormField>
              </>
            ) : null}
            <div>
              <Button onClick={handleRegister} loading={saving} disabled={!canSave}>Registrar resultado do banco</Button>
              {!canWrite ? <p style={{ margin: "8px 0 0", fontSize: 13 }}>Seu perfil não tem permissão para registrar o resultado do banco.</p> : null}
            </div>
          </div>
        </Card>
      ) : null}

      {proposals.length > 0 || WITH_PROPOSAL.includes(current) ? (
        <Card title="Proposta do banco" subtitle="Condições devolvidas pelo banco. Só uma fica vigente; as anteriores permanecem no histórico." style={{ marginTop: 16 }}>
          <Table columns={proposalColumns} rows={proposals} loading={proposalsLoading} emptyMessage="O banco ainda não informou as condições da proposta para este caso." />
        </Card>
      ) : null}

      {canCancel && canWrite ? (
        <Card title="Cancelar caso" subtitle="Use quando o cliente desistir ou o caso não vai mais seguir. Exige um motivo, fica na auditoria e impede novas ações no caso." style={{ marginTop: 16 }}>
          <Button variant="danger" onClick={() => { setCancelReason(""); setCancelError(""); setNotice(""); setCancelOpen(true); }}>Cancelar este caso</Button>
        </Card>
      ) : null}

      <Modal
        open={dupOpen}
        onClose={() => { if (!dupSaving) { setDupOpen(false); setDupError(""); } }}
        title="Revisar possível duplicata"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDupOpen(false); setDupError(""); }} disabled={dupSaving}>Voltar</Button>
            <Button onClick={handleReviewDuplicate} loading={dupSaving} disabled={dupNote.trim().length < 3}>Registrar decisão</Button>
          </>
        }
      >
        {dupError ? <Alert tone="danger">{dupError}</Alert> : null}
        <FormField label="Decisão" htmlFor="dup-decision">
          <Select id="dup-decision" value={dupDecision} onChange={(e) => setDupDecision(e.target.value)}>
            <option value="DISMISS">Não é duplicata: este caso segue normalmente</option>
            <option value="CONFIRM">É duplicata: cancelar este caso e continuar no original</option>
          </Select>
        </FormField>
        <FormField label="Observação" htmlFor="dup-note" required helper="Obrigatória. Fica registrada na auditoria.">
          <Input id="dup-note" maxLength={300} value={dupNote} onChange={(e) => setDupNote(e.target.value)} />
        </FormField>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => { if (!canceling) { setCancelOpen(false); setCancelError(""); } }}
        title="Cancelar caso de financiamento"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCancelOpen(false); setCancelError(""); }} disabled={canceling}>Voltar</Button>
            <Button variant="danger" onClick={handleCancel} loading={canceling} disabled={cancelReason.trim().length < 3}>Cancelar caso</Button>
          </>
        }
      >
        {cancelError ? <Alert tone="danger">{cancelError}</Alert> : null}
        <FormField label="Motivo do cancelamento" htmlFor="cancel-reason" required helper="Obrigatório. Fica registrado na auditoria e não pode ser desfeito.">
          <Input id="cancel-reason" maxLength={300} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        </FormField>
      </Modal>
    </>
  );
}
