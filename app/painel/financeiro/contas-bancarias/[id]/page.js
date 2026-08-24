"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import BankSelect from "@/components/molecules/BankSelect/BankSelect";
import {
  BANK_ACCOUNT_STATUS_LABELS,
  BANK_ACCOUNT_STATUS_TONE,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_TONE,
  bankAccountCooldownRemainingHours,
} from "@/lib/mock/finance";
import { getBankName } from "@/lib/mock/banks";
import { maskAccountNumber, maskAgency, maskPixKey } from "@/lib/mask";
import { listPeople, getPerson } from "@/lib/api/people";
import {
  getBankAccount,
  listFinancialEntries,
  listOwnerRepasses,
  updateBankAccount,
  blockBankAccount,
} from "@/lib/api/finance";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function ContaBancariaDetailPage({ params }) {
  const router = useRouter();
  const [account, setAccount] = useState(null);
  const [owner, setOwner] = useState(null);
  const [relatedEntries, setRelatedEntries] = useState([]);
  const [relatedRepasses, setRelatedRepasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ bankCode: "", agency: "", accountNumber: "", pixKey: "" });
  const [notice, setNotice] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getBankAccount(params.id)
      .then((acc) => {
        if (cancelled) return;
        setAccount(acc);
        setEditForm({ bankCode: acc.bankCode || "", agency: acc.agency || "", accountNumber: acc.accountNumber || "", pixKey: acc.pixKey || "" });
        return Promise.all([
          acc.ownerPersonId ? getPerson(acc.ownerPersonId).catch(() => null) : Promise.resolve(null),
          listFinancialEntries({ bankAccountId: params.id }),
          listOwnerRepasses(),
        ]);
      })
      .then((result) => {
        if (cancelled || !result) return;
        const [ownerData, entries, repasses] = result;
        setOwner(ownerData);
        setRelatedEntries(entries || []);
        setRelatedRepasses((repasses || []).filter((r) => r.bankAccountId === params.id));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 404) setNotFoundFlag(true);
        else setLoadError(err?.message || "Não foi possível carregar a conta bancária.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (notFoundFlag) return notFound();

  const remaining = account ? bankAccountCooldownRemainingHours({ ...account, updatedAt: account.updatedAt || account.updated_at }) : 0;

  async function handleBlock() {
    setBusy(true);
    setNotice(null);
    try {
      const updated = await blockBankAccount(account.id);
      setAccount(updated);
      setNotice({ tone: "danger", text: "Conta bloqueada para pagamentos (antifraude)." });
    } catch (err) {
      setNotice({ tone: "danger", text: err?.message || "Não foi possível bloquear a conta." });
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSensitive() {
    setBusy(true);
    setNotice(null);
    try {
      // Alterar qualquer dado sensível reabre o resfriamento de 48h automaticamente no
      // backend (bankAccounts.service.js SENSITIVE_FIELDS) — não simulamos isso no front.
      const updated = await updateBankAccount(account.id, editForm);
      setAccount(updated);
      setEditOpen(false);
      setNotice({ tone: "warning", text: "Dados sensíveis alterados — a conta voltou para resfriamento de 48h antes de poder receber pagamentos novamente." });
    } catch (err) {
      setNotice({ tone: "danger", text: err?.message || "Não foi possível salvar os dados sensíveis." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={account?.bankCode ? getBankName(account.bankCode) : "Conta bancária"} backHref="/painel/financeiro/contas-bancarias">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar a conta bancária">{loadError}</Alert> : null}

      {loading ? (
        <SkeletonDetail sections={3} />
      ) : !account ? null : (
        <div className={styles.wrap}>
          <div className={styles.headerRow}>
            <BankLogo bankCode={account.bankCode} size={48} />
            <div className={styles.headerText}>
              <h2 className={styles.headerTitle}>{account.bankCode ? getBankName(account.bankCode) : "Conta via chave PIX"}</h2>
              <p className={styles.headerSubtitle}>{owner?.legalName || "Conta operacional"}</p>
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
                <Button variant="danger" onClick={handleBlock} loading={busy}>
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
                  <div className={styles.detailRow}><dt>Proprietário</dt><dd>{owner?.legalName || "Conta operacional"}</dd></div>
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
                  <div className={styles.detailRow}><dt>Última alteração</dt><dd>{formatDateTime(account.updatedAt || account.updated_at)}</dd></div>
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
                          <span className={styles.listRowTitle}>Ref. {r.referenceMonth}</span>
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
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar dados sensíveis"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSensitive} loading={busy}>Salvar (reabre resfriamento)</Button>
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
