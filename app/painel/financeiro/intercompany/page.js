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
import Modal from "@/components/organisms/Modal/Modal";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import {
  listIntercompanyTransfers,
  createIntercompanyTransfer,
  reconcileIntercompanyTransfer,
  approveIntercompanyTransfer,
  rejectIntercompanyTransfer,
  listIntercompanyDestinationAccounts,
  listBankAccounts,
} from "@/lib/api/finance";
import { uploadFile } from "@/lib/api/legal";
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
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [fromBankAccountId, setFromBankAccountId] = useState("");
  const [toBankAccountId, setToBankAccountId] = useState("");
  const [ownAccounts, setOwnAccounts] = useState([]);
  const [destAccounts, setDestAccounts] = useState([]);
  const [destError, setDestError] = useState("");
  const [formError, setFormError] = useState("");
  const [mfaOpen, setMfaOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // §15 maker-checker: aprovar exige MFA recente; guarda qual transferência está sendo aprovada.
  const [approveId, setApproveId] = useState(null);
  // Recusa: modal com motivo obrigatório (antes era window.prompt, sem validação visível).
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [rejecting, setRejecting] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const [companyList, transferList, accountList] = await Promise.all([listCompanies(), listIntercompanyTransfers(), listBankAccounts()]);
      setCompanies(companyList || []);
      setTransfers(transferList || []);
      setOwnAccounts((accountList || []).filter((a) => a.status !== "BLOCKED"));
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

  useEffect(() => {
    setToBankAccountId("");
    setDestAccounts([]);
    setDestError("");
    if (!toCompanyId) return;
    listIntercompanyDestinationAccounts(toCompanyId)
      .then((list) => setDestAccounts(list || []))
      .catch((err) => setDestError(err?.message || "Não foi possível carregar as contas da empresa de destino."));
  }, [toCompanyId]);

  function accountLabel(a) {
    return `${a.bankCode} · ag. ${a.agency || "—"} · ${a.accountNumber}`;
  }

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
    if (!reason.trim()) {
      setFormError("Informe o motivo da transferência.");
      return;
    }
    if (!evidenceFile) {
      setFormError("Anexe o documento comprobatório da transferência.");
      return;
    }
    if (!fromBankAccountId || !toBankAccountId) {
      setFormError("Selecione a conta de saída (esta empresa) e a conta de entrada (destino).");
      return;
    }
    // Criar transferência intercompany é step-up MFA obrigatório no backend — mesmo padrão já
    // usado em liquidar lançamento (lancamentos/[id]/page.js).
    setMfaOpen(true);
  }

  async function runCreate() {
    setSaving(true);
    try {
      const uploaded = await uploadFile(evidenceFile);
      await createIntercompanyTransfer({
        toCompanyId,
        amount: Number(amount),
        reason: reason.trim(),
        evidenceFileId: uploaded.id,
        fromBankAccountId,
        toBankAccountId,
      });
      setAmount("");
      setReason("");
      setEvidenceFile(null);
      setFromBankAccountId("");
      setToCompanyId("");
      await reload();
    } catch (err) {
      setFormError(err?.message || "Falha ao criar a transferência.");
    } finally {
      setSaving(false);
    }
  }

  async function runApprove(id) {
    try {
      await approveIntercompanyTransfer(id);
      await reload();
    } catch (err) {
      setLoadError(err?.message || "Falha ao aprovar a transferência.");
    }
  }

  function openReject(id) {
    setRejectId(id);
    setRejectReason("");
    setRejectError("");
  }

  async function confirmReject() {
    if (!rejectReason.trim()) {
      setRejectError("Informe o motivo da recusa.");
      return;
    }
    setRejecting(true);
    try {
      await rejectIntercompanyTransfer(rejectId, rejectReason.trim());
      setRejectId(null);
      await reload();
    } catch (err) {
      setRejectError(err?.message || "Falha ao recusar a transferência.");
    } finally {
      setRejecting(false);
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
      render: (row) => {
        const map = {
          PENDING_APPROVAL: ["warning", "Aguardando aprovação"],
          REJECTED: ["danger", "Recusada"],
          PENDING: ["neutral", "Aprovada — a conciliar"],
          RECONCILED: ["success", "Conciliada"],
        };
        const [tone, label] = map[row.status] || ["neutral", row.status];
        return <Badge tone={tone}>{label}</Badge>;
      },
    },
    {
      key: "actions",
      label: "",
      render: (row) => {
        if (row.status === "PENDING_APPROVAL") {
          return (
            <span style={{ display: "inline-flex", gap: "var(--space-2)" }}>
              <Button type="button" size="sm" variant="ghost" onClick={() => setApproveId(row.id)}>
                Aprovar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => openReject(row.id)}>
                Recusar
              </Button>
            </span>
          );
        }
        if (row.status === "PENDING") {
          return (
            <Button type="button" size="sm" variant="ghost" onClick={() => handleReconcile(row.id)}>
              Conciliar
            </Button>
          );
        }
        return null;
      },
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
          <p className={styles.helper}>
            Pede a transferência desta empresa para outra do mesmo grupo. Motivo, documento e as contas dos dois lados são obrigatórios; os
            lançamentos só são criados quando outra pessoa aprova.
          </p>
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

            <FormField label="Conta de saída (esta empresa)" htmlFor="fromBankAccountId">
              <Select id="fromBankAccountId" value={fromBankAccountId} onChange={(e) => setFromBankAccountId(e.target.value)}>
                <option value="">Selecione...</option>
                {ownAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountLabel(a)}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Conta de entrada (empresa de destino)" htmlFor="toBankAccountId">
              <Select id="toBankAccountId" value={toBankAccountId} onChange={(e) => setToBankAccountId(e.target.value)} disabled={!toCompanyId}>
                <option value="">{toCompanyId ? "Selecione..." : "Escolha a empresa de destino primeiro"}</option>
                {destAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountLabel(a)}
                  </option>
                ))}
              </Select>
            </FormField>
            {destError ? <Alert tone="danger">{destError}</Alert> : null}

            <FormField label="Motivo" htmlFor="reason">
              <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormField>

            <FormField label="Documento comprobatório (PDF ou imagem)" htmlFor="evidence">
              <input id="evidence" type="file" accept="application/pdf,image/*" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
            </FormField>

            {formError ? <Alert tone="danger">{formError}</Alert> : null}

            <Button type="submit" disabled={saving}>
              {saving ? "Enviando..." : "Pedir transferência"}
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

      <MfaVerifyModal
        open={Boolean(approveId)}
        onClose={() => setApproveId(null)}
        actionLabel="aprovar esta transferência intercompany"
        onVerified={async () => {
          const id = approveId;
          setApproveId(null);
          await runApprove(id);
        }}
      />

      <Modal
        open={Boolean(rejectId)}
        onClose={() => setRejectId(null)}
        title="Recusar transferência"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRejectId(null)} disabled={rejecting}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmReject} disabled={rejecting}>
              {rejecting ? "Recusando..." : "Confirmar recusa"}
            </Button>
          </>
        }
      >
        <FormField label="Motivo da recusa" htmlFor="rejectReason">
          <Input id="rejectReason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} autoFocus />
        </FormField>
        {rejectError ? <Alert tone="danger">{rejectError}</Alert> : null}
      </Modal>

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
