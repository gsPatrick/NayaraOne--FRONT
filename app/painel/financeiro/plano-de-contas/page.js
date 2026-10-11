"use client";

// GAP REAL CORRIGIDO (auditoria externa Abacus AI, 11/10/2026): "Telas obrigatórias ausentes —
// Plano de Contas ... autônomo" — o backend já existia inteiro (chartOfAccounts.service.js,
// GET/POST/PATCH/DELETE /finance/chart-of-accounts), só não havia tela/menu próprio.

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import { listChartAccounts, createChartAccount, deactivateChartAccount } from "@/lib/api/finance";
import styles from "./page.module.css";

const ACCOUNT_TYPES = [
  { value: "ASSET", label: "Ativo" },
  { value: "LIABILITY", label: "Passivo" },
  { value: "EQUITY", label: "Patrimônio líquido" },
  { value: "REVENUE", label: "Receita" },
  { value: "EXPENSE", label: "Despesa" },
];

function typeLabel(value) {
  return ACCOUNT_TYPES.find((t) => t.value === value)?.label || value;
}

export default function PlanoDeContasPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", accountType: "EXPENSE", parentAccountId: "" });

  function load() {
    setLoading(true);
    setLoadError("");
    listChartAccounts()
      .then((items) => setAccounts(items || []))
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar o plano de contas."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const tree = useMemo(() => {
    const byParent = new Map();
    for (const acc of accounts) {
      const key = acc.parentAccountId || "ROOT";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(acc);
    }
    function build(parentId) {
      return (byParent.get(parentId) || [])
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((acc) => ({ ...acc, children: build(acc.id) }));
    }
    return build("ROOT");
  }, [accounts]);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleCreate() {
    if (!form.code || !form.name) return;
    setSubmitting(true);
    setActionError("");
    try {
      await createChartAccount({
        code: form.code.trim(),
        name: form.name.trim(),
        accountType: form.accountType,
        parentAccountId: form.parentAccountId || null,
      });
      setShowCreate(false);
      setForm({ code: "", name: "", accountType: "EXPENSE", parentAccountId: "" });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar a conta contábil.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id) {
    setActionError("");
    try {
      await deactivateChartAccount(id);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível desativar a conta.");
    }
  }

  function Row({ account, depth }) {
    return (
      <>
        <div className={styles.row} style={{ paddingLeft: `${depth * 24}px` }}>
          <span className={styles.code}>{account.code}</span>
          <span className={styles.name}>{account.name}</span>
          <Badge tone="neutral">{typeLabel(account.accountType)}</Badge>
          {!account.isActive && <Badge tone="warning">Inativa</Badge>}
          {account.isActive && (
            <button type="button" className={styles.deactivateBtn} onClick={() => handleDeactivate(account.id)}>
              Desativar
            </button>
          )}
        </div>
        {account.children.map((child) => (
          <Row key={child.id} account={child} depth={depth + 1} />
        ))}
      </>
    );
  }

  return (
    <AppShell title="Plano de contas" subtitle="Financeiro">
      <FinanceNavMenu />
      {loading ? (
        <SkeletonDetail />
      ) : loadError ? (
        <Alert tone="danger">{loadError}</Alert>
      ) : (
        <Card
          title="Hierarquia de contas contábeis"
          actions={
            <Button onClick={() => setShowCreate(true)}>
              <Icon name="plus" /> Nova conta
            </Button>
          }
        >
          {actionError && <Alert tone="danger">{actionError}</Alert>}
          {tree.length === 0 ? (
            <p className={styles.empty}>Nenhuma conta contábil cadastrada ainda.</p>
          ) : (
            <div className={styles.tree}>
              {tree.map((acc) => (
                <Row key={acc.id} account={acc} depth={0} />
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nova conta contábil">
        <div className={styles.form}>
          <FormField label="Código">
            <Input value={form.code} onChange={update("code")} placeholder="Ex: 4.1.01" />
          </FormField>
          <FormField label="Nome">
            <Input value={form.name} onChange={update("name")} placeholder="Ex: Despesas com manutenção" />
          </FormField>
          <FormField label="Natureza">
            <Select value={form.accountType} onChange={update("accountType")}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Conta pai (opcional)">
            <Select value={form.parentAccountId} onChange={update("parentAccountId")}>
              <option value="">Nenhuma (conta raiz)</option>
              {accounts
                .filter((a) => a.accountType === form.accountType && a.isActive)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
            </Select>
          </FormField>
          <Button onClick={handleCreate} disabled={submitting || !form.code || !form.name}>
            {submitting ? "Criando..." : "Criar conta"}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
