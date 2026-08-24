"use client";

import { useMemo, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import BankSelect from "@/components/molecules/BankSelect/BankSelect";
import {
  BANK_ACCOUNTS,
  FINANCIAL_ENTRIES,
  OWNER_REPASSES,
  BANK_ACCOUNT_STATUS_LABELS,
  BANK_ACCOUNT_STATUS_TONE,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_TONE,
  bankAccountCooldownRemainingHours,
} from "@/lib/mock/finance";
import { getBankName } from "@/lib/mock/banks";
import { maskAccountNumber, maskAgency, maskPixKey } from "@/lib/mask";
import { PEOPLE } from "@/lib/mock/people";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

function personName(id) {
  return PEOPLE.find((p) => p.id === id)?.legalName || "Conta operacional";
}

export default function ContaBancariaDetailPage({ params }) {
  const router = useRouter();
  const source = BANK_ACCOUNTS.find((a) => a.id === params.id);
  const [account, setAccount] = useState(() => (source ? { ...source } : null));
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(() => (source ? { bankCode: source.bankCode || "", agency: source.agency || "", accountNumber: source.accountNumber || "", pixKey: source.pixKey || "" } : {}));
  const [notice, setNotice] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const relatedEntries = useMemo(() => FINANCIAL_ENTRIES.filter((e) => e.bankAccountId === params.id), [params.id]);
  const relatedRepasses = useMemo(() => OWNER_REPASSES.filter((r) => r.bankAccountId === params.id), [params.id]);

  if (!source || !account) return notFound();

  const remaining = bankAccountCooldownRemainingHours(account);

  function handleBlock() {
    setAccount((prev) => ({ ...prev, status: "BLOCKED" }));
    setNotice({ tone: "danger", text: "Conta bloqueada para pagamentos (antifraude)." });
  }

  function handleSaveSensitive() {
    // Alterar qualquer dado sensível reabre o resfriamento de 48h — mesma regra do backend
    // (bankAccounts.service.js SENSITIVE_FIELDS), pois esses dados definem para onde o dinheiro vai.
    setAccount((prev) => ({ ...prev, ...editForm, status: "PENDING_COOLDOWN", updatedAt: new Date().toISOString() }));
    setEditOpen(false);
    setNotice({ tone: "warning", text: "Dados sensíveis alterados — a conta voltou para resfriamento de 48h antes de poder receber pagamentos novamente." });
  }

  return (
    <AppShell title={account.label} backHref="/painel/financeiro/contas-bancarias">
      <div className={styles.wrap}>
        <div className={styles.headerRow}>
          <BankLogo bankCode={account.bankCode} size={48} />
          <div className={styles.headerText}>
            <h2 className={styles.headerTitle}>{account.label}</h2>
            <p className={styles.headerSubtitle}>{account.bankCode ? getBankName(account.bankCode) : "Conta via chave PIX"}</p>
          </div>
        </div>

        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={BANK_ACCOUNT_STATUS_TONE[account.status]}>{BANK_ACCOUNT_STATUS_LABELS[account.status]}</Badge>
            {account.status === "PENDING_COOLDOWN" ? <Badge tone="warning">{remaining}h restantes</Badge> : null}
          </div>
          <div className={styles.actions}>
            {account.status !== "BLOCKED" ? (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <Icon name="settings" size={16} /> Editar dados sensíveis
              </Button>
            ) : null}
            {account.status !== "BLOCKED" ? (
              <Button variant="danger" onClick={handleBlock}>
                <Icon name="shield" size={16} /> Bloquear
              </Button>
            ) : null}
          </div>
        </div>

        {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card
              title="Dados da conta"
              subtitle="Dados sensíveis exibidos mascarados por padrão"
              actions={
                <Button size="sm" variant="secondary" onClick={() => setRevealed((v) => !v)}>
                  <Icon name={revealed ? "ban" : "eye"} size={16} /> {revealed ? "Ocultar" : "Revelar"}
                </Button>
              }
            >
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Proprietário</dt><dd>{personName(account.ownerPersonId)}</dd></div>
                <div className={styles.detailRow}><dt>Banco</dt><dd>{account.bankCode ? `${getBankName(account.bankCode)} (${account.bankCode})` : "—"}</dd></div>
                <div className={styles.detailRow}>
                  <dt>Agência</dt>
                  <dd className={styles.mono}>{account.agency ? (revealed ? account.agency : maskAgency(account.agency)) : "—"}</dd>
                </div>
                <div className={styles.detailRow}>
                  <dt>Conta</dt>
                  <dd className={styles.mono}>{account.accountNumber ? (revealed ? account.accountNumber : maskAccountNumber(account.accountNumber)) : "—"}</dd>
                </div>
                <div className={styles.detailRow}>
                  <dt>Chave PIX</dt>
                  <dd className={styles.mono}>{account.pixKey ? (revealed ? account.pixKey : maskPixKey(account.pixKey)) : "—"}</dd>
                </div>
                <div className={styles.detailRow}><dt>Última alteração</dt><dd>{formatDateTime(account.updatedAt)}</dd></div>
                <div className={styles.detailRow}><dt>ID</dt><dd className={styles.mono}>{account.id}</dd></div>
              </dl>
            </Card>

            <Card title="Lançamentos vinculados" subtitle={`${relatedEntries.length} lançamento(s) nesta conta`}>
              {relatedEntries.length === 0 ? (
                <p className={styles.emptyText}>Nenhum lançamento nesta conta.</p>
              ) : (
                <ul className={styles.list}>
                  {relatedEntries.map((e) => (
                    <li key={e.id} className={styles.listRow} onClick={() => router.push(`/painel/financeiro/lancamentos/${e.id}`)}>
                      <Icon name="document" size={16} />
                      <div className={styles.listRowInfo}>
                        <span className={styles.listRowTitle}>{e.description}</span>
                        <span className={styles.listRowSubtitle}>{e.dueAt ? formatDate(e.dueAt) : "Sem vencimento"}</span>
                      </div>
                      <Badge tone={ENTRY_STATUS_TONE[e.status]}>{ENTRY_STATUS_LABELS[e.status]}</Badge>
                      <strong className={styles.listRowRight}>{formatBRL(e.amount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card title="Repasses vinculados">
              {relatedRepasses.length === 0 ? (
                <p className={styles.emptyText}>Nenhum repasse nesta conta.</p>
              ) : (
                <ul className={styles.list}>
                  {relatedRepasses.map((r) => (
                    <li key={r.id} className={styles.listRow}>
                      <Icon name="money" size={16} />
                      <div className={styles.listRowInfo}>
                        <span className={styles.listRowTitle}>{personName(r.ownerPersonId)}</span>
                        <span className={styles.listRowSubtitle}>Ref. {r.referenceMonth}</span>
                      </div>
                      <strong className={styles.listRowRight}>{formatBRL(r.netAmount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar dados sensíveis"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSensitive}>Salvar (reabre resfriamento)</Button>
          </>
        }
      >
        <Alert tone="warning" title="Atenção">
          Alterar banco, agência, conta ou PIX reabre o resfriamento de 48h por segurança (antifraude).
        </Alert>
        <div className={styles.modalForm}>
          <FormField label="Banco" htmlFor="e-bank">
            <BankSelect value={editForm.bankCode} onChange={(code) => setEditForm((p) => ({ ...p, bankCode: code }))} />
          </FormField>
          <FormField label="Agência" htmlFor="e-agency">
            <Input id="e-agency" value={editForm.agency} onChange={(e) => setEditForm((p) => ({ ...p, agency: e.target.value }))} />
          </FormField>
          <FormField label="Conta" htmlFor="e-accnum">
            <Input id="e-accnum" value={editForm.accountNumber} onChange={(e) => setEditForm((p) => ({ ...p, accountNumber: e.target.value }))} />
          </FormField>
          <FormField label="Chave PIX" htmlFor="e-pix">
            <Input id="e-pix" value={editForm.pixKey} onChange={(e) => setEditForm((p) => ({ ...p, pixKey: e.target.value }))} />
          </FormField>
        </div>
      </Modal>
    </AppShell>
  );
}
