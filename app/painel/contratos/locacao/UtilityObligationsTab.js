"use client";

// Obrigações da locação (Caderno M5 §12 "Cada obrigação possui responsável, periodicidade, comprovante e status";
// tabela legal.lease_obligations, mesma rota /billing/utility-obligations). Periodicidade e dia do vencimento na
// criação; início e próximo vencimento são definidos pela entrega das chaves; a troca de titularidade tem prazo
// (contado da entrega das chaves) e aparece vencida quando passa. Cada obrigação tem vencimentos (ciclos): o pagamento é
// de um vencimento, com comprovante (UtilityPaymentModal), e a lista de vencimentos mostra a situação de cada um e permite
// a dispensa com motivo (UtilityCyclesModal). As POST mandam Idempotency-Key (lib/api/billing).
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import { uploadFile } from "@/lib/api/legal";
import { requestOwnershipTransfer, completeOwnershipTransferTask } from "@/lib/api/billing";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { OBLIGATION_PERIODICITY_LABELS } from "@/lib/labels/juridico";
import { formatDate, formatContractLabel } from "@/lib/format";
import UtilityObligationForm, { UTILITY_TYPE_LABELS } from "./UtilityObligationForm";
import UtilityPaymentModal from "./UtilityPaymentModal";
import UtilityCyclesModal from "./UtilityCyclesModal";
import styles from "./page.module.css";

const UTILITY_STATUS_TONE = { ACTIVE: "success", TRANSFER_PENDING: "warning", TRANSFERRED: "info" };
const UTILITY_STATUS_LABEL = { ACTIVE: "Ativa", TRANSFER_PENDING: "Transferência pendente", TRANSFERRED: "Transferida" };

const todaySaoPaulo = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export default function UtilityObligationsTab({ utilities, leaseContracts, onChanged, onError }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null); // { obligation, cycleId }
  const [cyclesTarget, setCyclesTarget] = useState(null);
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestPerson, setRequestPerson] = useState({ name: "", personId: null });
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completePerson, setCompletePerson] = useState({ name: "", personId: null });
  const [evidence, setEvidence] = useState({ fileId: "", fileName: "" });
  const [uploading, setUploading] = useState(false);
  const [transferError, setTransferError] = useState("");

  async function guarded(fn, fallback) {
    onError("");
    try {
      await fn();
      onChanged();
    } catch (err) {
      onError(legalErrorMessage(err, fallback));
    }
  }

  const handleRequest = () =>
    guarded(async () => {
      await requestOwnershipTransfer(requestTarget.id, { toPersonId: requestPerson.personId || undefined });
      setRequestTarget(null);
      setRequestPerson({ name: "", personId: null });
    }, "Erro ao solicitar a transferência de titularidade.");

  function openComplete(row, task) {
    setCompleteTarget({ obligation: row, task });
    setCompletePerson({ name: "", personId: task.toPersonId || null });
    setEvidence({ fileId: "", fileName: "" });
    setTransferError("");
  }

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    setTransferError("");
    try {
      const uploaded = await uploadFile(file);
      setEvidence({ fileId: uploaded.id, fileName: file.name });
    } catch (err) {
      setTransferError(legalErrorMessage(err, "Erro ao enviar o comprovante."));
    } finally {
      setUploading(false);
    }
  }

  async function handleComplete() {
    setTransferError("");
    try {
      await completeOwnershipTransferTask(completeTarget.task.id, { evidenceFileId: evidence.fileId, toPersonId: completePerson.personId || undefined });
      setCompleteTarget(null);
      onChanged();
    } catch (err) {
      setTransferError(legalErrorMessage(err, "Erro ao concluir a transferência de titularidade."));
    }
  }

  const contractLabel = (id) => formatContractLabel(leaseContracts.find((c) => c.id === id)) || "Contrato";

  const columns = [
    { key: "contractId", label: "Contrato", render: (row) => contractLabel(row.contractId) },
    { key: "utilityType", label: "Tipo", render: (row) => UTILITY_TYPE_LABELS[row.utilityType] || "Outra" },
    { key: "responsibleParty", label: "Responsável", render: (row) => (row.responsibleParty === "TENANT" ? "Locatário" : "Locador") },
    {
      key: "periodicity",
      label: "Periodicidade",
      render: (row) => (
        <span>
          {OBLIGATION_PERIODICITY_LABELS[row.periodicity] || "Padrão da empresa"}
          {row.dueDay ? ` · vence dia ${row.dueDay}` : ""}
        </span>
      ),
    },
    {
      key: "schedule",
      label: "Vencimentos",
      render: (row) =>
        row.startsOn ? (
          <span className={styles.helper}>Desde {formatDate(row.startsOn)}{row.nextDueOn ? ` · próximo ${formatDate(row.nextDueOn)}` : ""}</span>
        ) : (
          <span className={styles.helper}>Começa na entrega das chaves</span>
        ),
    },
    { key: "status", label: "Situação", render: (row) => <Badge tone={UTILITY_STATUS_TONE[row.status] || "neutral"}>{UTILITY_STATUS_LABEL[row.status] || "Situação desconhecida"}</Badge> },
    {
      key: "evidence",
      label: "Comprovante",
      render: (row) => {
        const pending = (row.transferTasks || []).find((t) => t.status === "PENDING");
        const late = pending?.dueDate && pending.dueDate < todaySaoPaulo();
        return (
          <div className={styles.rowActions}>
            {row.evidenceFileId ? <Badge tone="success">Anexado</Badge> : <span className={styles.helper}>Sem comprovante</span>}
            {pending ? (
              <Badge tone={late ? "danger" : "warning"}>
                {pending.dueDate ? `Troca de titular até ${formatDate(pending.dueDate)}${late ? " — vencida" : ""}` : "Troca de titular sem prazo definido"}
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Ações",
      render: (row) => {
        const pendingTask = (row.transferTasks || []).find((t) => t.status === "PENDING");
        return (
          <div className={styles.rowActions}>
            {row.status === "ACTIVE" ? (
              <Button variant="secondary" size="sm" onClick={() => { setRequestTarget(row); setRequestPerson({ name: "", personId: null }); }}>Solicitar transferência</Button>
            ) : null}
            {pendingTask ? <Button variant="secondary" size="sm" onClick={() => openComplete(row, pendingTask)}>Concluir transferência</Button> : null}
            <Button variant="secondary" size="sm" onClick={() => setCyclesTarget(row)}>Vencimentos</Button>
            <Button variant="secondary" size="sm" onClick={() => setPayTarget({ obligation: row, cycleId: "" })}>Registrar pagamento</Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Card title="Obrigações locatícias e comprovante de transferência">
        <div className={styles.toolbarRow}>
          <Button onClick={() => setCreateOpen(true)}>Nova obrigação</Button>
        </div>
        <Table columns={columns} rows={utilities} emptyMessage="Nenhuma obrigação cadastrada ainda." />
      </Card>

      <UtilityObligationForm
        open={createOpen}
        leaseContracts={leaseContracts}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          onChanged();
        }}
      />

      <Modal
        open={Boolean(requestTarget)}
        onClose={() => setRequestTarget(null)}
        title="Solicitar transferência de titularidade"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRequestTarget(null)}>Cancelar</Button>
            <Button onClick={handleRequest}>Solicitar</Button>
          </>
        }
      >
        <FormField label="Novo titular" helper="Opcional agora; é obrigatório para concluir a transferência.">
          <PersonPicker id="utility-transfer-request-person" value={requestPerson.name} personId={requestPerson.personId} onSelect={setRequestPerson} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        title="Concluir transferência de titularidade"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleteTarget(null)}>Cancelar</Button>
            <Button onClick={handleComplete} disabled={!evidence.fileId || !completePerson.personId || uploading}>Concluir</Button>
          </>
        }
      >
        {transferError ? <Alert tone="danger">{transferError}</Alert> : null}
        {completeTarget?.task?.dueDate ? (
          <p className={styles.helper}>Prazo da troca de titularidade: {formatDate(completeTarget.task.dueDate)} (contado da entrega das chaves).</p>
        ) : null}
        <FormField label="Novo titular" required>
          <PersonPicker id="utility-transfer-complete-person" value={completePerson.name} personId={completePerson.personId} onSelect={setCompletePerson} />
        </FormField>
        <FormField label="Comprovante da transferência" required>
          <FileDropInput
            id="utility-transfer-evidence"
            accept="image/*,application/pdf"
            uploading={uploading}
            fileNames={evidence.fileName ? [evidence.fileName] : []}
            onFiles={(files) => handleUpload(files[0])}
            onRemove={() => setEvidence({ fileId: "", fileName: "" })}
          />
        </FormField>
      </Modal>

      <UtilityCyclesModal
        obligation={cyclesTarget}
        title={cyclesTarget ? `Vencimentos — ${UTILITY_TYPE_LABELS[cyclesTarget.utilityType] || "obrigação"} (${contractLabel(cyclesTarget.contractId)})` : ""}
        onClose={() => setCyclesTarget(null)}
        onPay={(cycleId) => { setPayTarget({ obligation: cyclesTarget, cycleId }); setCyclesTarget(null); }}
        onChanged={onChanged}
        onError={onError}
      />

      <UtilityPaymentModal
        obligation={payTarget?.obligation || null}
        initialCycleId={payTarget?.cycleId || ""}
        onClose={() => setPayTarget(null)}
        onPaid={() => { setPayTarget(null); onChanged(); }}
        onError={onError}
      />
    </>
  );
}
