"use client";

// FIN-TS-007 (auditoria externa Abacus AI, 11/10/2026): "Nenhuma tela de importação OFX/CSV
// encontrada". O backend (importBankStatement, idempotente por externalTransactionId linha a
// linha) já existia; esta tela é o que faltava para fechar o ponto de ponta a ponta. Formato
// aceito: CSV com cabeçalho "externalTransactionId,transactionDate,description,amount", nessa
// ordem exata (ver NayaraOne--API/src/features/finance/bankTransactions.service.js).

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import { listBankAccounts, listBankTransactions, importBankStatement } from "@/lib/api/finance";
import { getBankName } from "@/lib/mock/banks";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

const CSV_HEADER = "externalTransactionId,transactionDate,description,amount";

export default function ExtratoBancarioPage() {
  const [accounts, setAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listBankAccounts()
      .then((items) => {
        if (cancelled) return;
        setAccounts(items || []);
        if (items?.length && !bankAccountId) setBankAccountId(items[0].id);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar as contas bancárias.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bankAccountId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listBankTransactions({ bankAccountId })
      .then((items) => {
        if (!cancelled) setTransactions(items || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o extrato.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bankAccountId]);

  async function reloadTransactions() {
    if (!bankAccountId) return;
    const items = await listBankTransactions({ bankAccountId });
    setTransactions(items || []);
  }

  function handleFiles(files) {
    const file = files?.[0];
    if (!file) return;
    setFileError("");
    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async () => {
      const csvText = String(reader.result || "");
      if (!bankAccountId) {
        setFileError("Selecione a conta bancária antes de importar.");
        return;
      }
      setUploading(true);
      try {
        const res = await importBankStatement({ bankAccountId, csvText });
        setResult(res);
        await reloadTransactions();
      } catch (err) {
        setFileError(err?.message || "Falha ao importar o extrato.");
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => setFileError("Não foi possível ler o arquivo selecionado.");
    reader.readAsText(file);
  }

  const columns = [
    { key: "transactionDate", label: "Data", render: (row) => formatDate(row.transactionDate) },
    { key: "description", label: "Descrição", render: (row) => row.description || "Sem descrição no extrato" },
    { key: "externalTransactionId", label: "ID externo", render: (row) => row.externalTransactionId || "Sem identificador do banco" },
    {
      key: "amount",
      label: "Valor",
      render: (row) => (
        <span className={Number(row.amount) < 0 ? styles.negative : styles.positive}>{formatBRL(row.amount)}</span>
      ),
    },
  ];

  return (
    <AppShell title="Extrato bancário" backHref="/painel/financeiro">
      <div className={styles.wrap}>
        {loadError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{loadError}</Alert>
          </div>
        ) : null}

        <Card className={styles.importCard}>
          <h2 className={styles.sectionTitle}>Importar extrato (CSV)</h2>
          <p className={styles.helper}>
            Cabeçalho obrigatório, nessa ordem: <code>{CSV_HEADER}</code>. Reimportar o mesmo
            arquivo nunca duplica — cada linha já importada antes volta marcada como duplicada.
          </p>

          <FormField label="Conta bancária" htmlFor="bankAccountId">
            <Select
              id="bankAccountId"
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {getBankName(acc.bankCode) || acc.bankCode} — ag {acc.agency} / cc {acc.accountNumber}
                </option>
              ))}
            </Select>
          </FormField>

          <FileDropInput
            id="statementFile"
            accept=".csv,text/csv"
            uploading={uploading}
            error={fileError}
            helper="Arquivo .csv com até alguns milhares de linhas."
            fileNames={fileName ? [fileName] : []}
            onFiles={handleFiles}
            onRemove={() => {
              setFileName("");
              setResult(null);
            }}
          />

          {result ? (
            <div className={styles.resultRow}>
              <Badge tone="success">{result.imported.length} nova(s) importada(s)</Badge>
              <Badge tone="neutral">{result.duplicates.length} já existente(s) (ignorada(s))</Badge>
              <Badge tone="neutral">{result.total} linha(s) no arquivo</Badge>
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className={styles.sectionTitle}>Histórico importado</h2>
          <Table columns={columns} rows={transactions} loading={loading} emptyMessage="Nenhuma transação importada para esta conta ainda." />
        </Card>
      </div>

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
