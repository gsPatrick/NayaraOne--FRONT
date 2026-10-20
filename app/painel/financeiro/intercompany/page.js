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
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
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
  listIntercompanyDestinationCompanies,
  listBankAccounts,
} from "@/lib/api/finance";
import { uploadFile } from "@/lib/api/legal";
import { listCompanies } from "@/lib/api/companies";
import { useCompany } from "@/lib/context/CompanyContext";
import { formatBRL, formatDateTime, toNumber } from "@/lib/format";
import styles from "./page.module.css";

// Mensagens técnicas (variável de ambiente, rede em inglês) nunca chegam à tela do usuário.
function friendly(err, fallback) {
  const raw = String(err?.message || "").trim();
  if (!raw) return fallback;
  if (/failed to fetch|load failed|networkerror/i.test(raw)) return "Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.";
  if (/vari[aá]vel de ambiente|_KEY|ENCRYPTION/i.test(raw)) {
    return "O envio de documentos está indisponível no servidor neste momento. Avise o administrador do sistema e tente de novo.";
  }
  return raw;
}

export default function IntercompanyPage() {
  const { company } = useCompany();

  const [companies, setCompanies] = useState([]);
  const [destCompanies, setDestCompanies] = useState([]);
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
    setLoadError("");
    try {
      const [companyList, transferList, accountList, destList] = await Promise.all([
        listCompanies().catch(() => []),
        listIntercompanyTransfers(),
        listBankAccounts(),
        listIntercompanyDestinationCompanies().catch(() => []),
      ]);
      setCompanies([...(companyList || []), ...(destList || []).filter((d) => !(companyList || []).some((c) => c.id === d.id))]);
      setDestCompanies(destList || []);
      setTransfers(transferList || []);
      setOwnAccounts((accountList || []).filter((a) => a.status !== "BLOCKED"));
    } catch (err) {
      setLoadError(friendly(err, "Não foi possível carregar as transferências intercompany."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  // M45 F8: só empresas onde o usuário tem finance:read entram como destino; as demais são
  // explicadas abaixo do campo (o backend recusa listar contas sem essa permissão — regra correta).
  const otherCompanies = destCompanies.filter((c) => c.canReadFinance && c.id !== company?.id);
  const blockedCompanies = destCompanies.filter((c) => !c.canReadFinance && c.id !== company?.id);

  useEffect(() => {
    setToBankAccountId("");
    setDestAccounts([]);
    setDestError("");
    if (!toCompanyId) return;
    listIntercompanyDestinationAccounts(toCompanyId)
      .then((list) => setDestAccounts(list || []))
      .catch((err) => setDestError(friendly(err, "Não foi possível carregar as contas da empresa de destino.")));
  }, [toCompanyId]);

  function accountLabel(a) {
    return `${a.bankCode} · ag. ${a.agency || "sem agência"} · ${a.accountNumber}`;
  }

  function handleCreateClick(e) {
    e.preventDefault();
    setFormError("");
    if (!toCompanyId) {
      setFormError("Selecione a empresa de destino.");
      return;
    }
    const numericAmount = toNumber(amount);
    if (Number.isNaN(numericAmount) || !Number.isFinite(numericAmount) || numericAmount <= 0) {
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
        amount: toNumber(amount),
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
      setFormError(friendly(err, "Falha ao criar a transferência."));
    } finally {
      setSaving(false);
    }
  }

  async function runApprove(id) {
    try {
      await approveIntercompanyTransfer(id);
      await reload();
    } catch (err) {
      setLoadError(friendly(err, "Falha ao aprovar a transferência."));
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
      setRejectError(friendly(err, "Falha ao recusar a transferência."));
    } finally {
      setRejecting(false);
    }
  }

  async function handleReconcile(id) {
    try {
      await reconcileIntercompanyTransfer(id);
      await reload();
    } catch (err) {
      setLoadError(friendly(err, "Falha ao conciliar a transferência."));
    }
  }

  const columns = [
    // M45-RECONF F6: a API devolve o carimbo como created_at (modelo underscored) — a coluna lia
    // só createdAt e mostrava "—". Mostra a data do pedido e, quando houver, a da decisão.
    {
      key: "createdAt",
      label: "Data",
      render: (row) => {
        const requested = row.createdAt || row.created_at;
        const decided = row.reconciledAt || row.approvedAt || row.rejectedAt;
        const decidedLabel = row.reconciledAt ? "conciliada" : row.approvedAt ? "aprovada" : "recusada";
        return (
          <span>
            Pedida em {requested ? formatDateTime(requested) : "data não informada"}
            {decided ? <><br />{decidedLabel} em {formatDateTime(decided)}</> : null}
          </span>
        );
      },
    },
    { key: "fromCompanyId", label: "Origem", render: (row) => (row.fromCompanyId === company?.id ? "Esta empresa" : companies.find((c) => c.id === row.fromCompanyId)?.name || "Outra empresa do grupo") },
    {
      key: "toCompanyId",
      label: "Destino",
      render: (row) => (row.toCompanyId === company?.id ? "Esta empresa" : companies.find((c) => c.id === row.toCompanyId)?.name || "Outra empresa do grupo"),
    },
    { key: "amount", label: "Valor", render: (row) => formatBRL(row.amount) },
    { key: "reason", label: "Motivo", render: (row) => (
      <span>
        {row.reason || "Motivo não informado"}
        {row.rejectionReason ? <><br />Recusa: {row.rejectionReason}</> : null}
      </span>
    ) },
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
      label: "Ações",
      render: (row) => {
        if (row.status === "PENDING_APPROVAL") {
          return (
            <span style={{ display: "inline-flex", gap: "var(--space-2)" }}>
              <Button requires="finance:approve" type="button" size="sm" variant="ghost" onClick={() => setApproveId(row.id)}>
                Aprovar
              </Button>
              <Button requires="finance:approve" type="button" size="sm" variant="ghost" onClick={() => openReject(row.id)}>
                Recusar
              </Button>
            </span>
          );
        }
        if (row.status === "PENDING") {
          return (
            <Button requires="finance:reconcile" type="button" size="sm" variant="ghost" onClick={() => handleReconcile(row.id)}>
              Conciliar
            </Button>
          );
        }
        return row.status === "REJECTED" ? "Encerrada (recusada)" : "Nenhuma ação pendente";
      },
    },
  ];

  return (
    <AppShell title="Transferências intercompany" backHref="/painel/financeiro">
      <div className={styles.wrap}>
        {loadError ? (
          <Alert tone="danger">
            {loadError}{" "}
            <Button type="button" size="sm" variant="secondary" onClick={() => { setLoadError(""); reload(); }}>Tentar de novo</Button>
          </Alert>
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
            {!loading && otherCompanies.length === 0 ? (
              <Alert tone="warning">
                Você não tem acesso ao Financeiro de nenhuma outra empresa do grupo. Para pedir uma transferência, um administrador precisa
                liberar seu acesso (permissão de leitura do Financeiro) na empresa de destino.
              </Alert>
            ) : null}
            {blockedCompanies.length > 0 ? (
              <p className={styles.helper}>
                Sem acesso ao Financeiro (não aparecem como destino): {blockedCompanies.map((c) => c.name).join(", ")}.
              </p>
            ) : null}

            <FormField label="Valor" htmlFor="amount">
              <DecimalInput id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
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

            <Button requires="finance:settle" type="submit" disabled={saving}>
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
