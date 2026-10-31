"use client";

// FIN-TS-007 (auditoria externa Abacus AI, 11/10/2026): "Nenhuma tela de importação OFX/CSV
// encontrada". O backend (importBankStatement, idempotente por externalTransactionId linha a
// linha) já existia; esta tela é o que faltava para fechar o ponto de ponta a ponta. Formato
// aceito: CSV com cabeçalho "externalTransactionId,transactionDate,description,amount", nessa
// ordem exata (ver NayaraOne--API/src/features/finance/bankTransactions.service.js).

import { useEffect, useState } from "react";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
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
import { useHasPermission } from "@/lib/rbac/useHasPermission";
import { listBankAccounts, listBankTransactions, importBankStatement } from "@/lib/api/finance";
import { getBankName } from "@/lib/mock/banks";
import { formatCalendarDay } from "@/lib/finance/extras";
import { formatBRL } from "@/lib/format";
import { maskAccountNumber } from "@/lib/mask";
import styles from "./page.module.css";

const CSV_HEADER = "externalTransactionId,transactionDate,description,amount";

export default function ExtratoBancarioPage() {
  const canImport = useHasPermission("finance:create");
  const [accounts, setAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState("");

  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  // M9-D940: contas e extrato vêm do padrão único de estados (carregando, erro com "tentar de novo", sem acesso, sem conexão).
  const accountsQuery = useAsyncState(() => listBankAccounts().then((items) => items || []), { key: "extrato:contas", isEmpty: () => false });
  useEffect(() => {
    const items = accountsQuery.data;
    if (!items) return;
    setAccounts(items);
    setBankAccountId((current) => current || (items.length ? items[0].id : ""));
  }, [accountsQuery.data]);

  const transactionsQuery = useAsyncState(() => listBankTransactions({ bankAccountId }).then((items) => items || []), {
    key: `extrato:${bankAccountId}`,
    deps: [bankAccountId],
    enabled: Boolean(bankAccountId),
    isEmpty: () => false,
  });
  const transactions = transactionsQuery.data || [];

  async function reloadTransactions() {
    if (!bankAccountId) return;
    await transactionsQuery.reload();
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
    { key: "transactionDate", label: "Data", render: (row) => formatCalendarDay(row.transactionDate) },
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
        <AsyncState result={accountsQuery} loadingLabel="Carregando contas bancárias...">
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
                  {getBankName(acc.bankCode) || acc.bankCode} — ag {acc.agency} / cc {maskAccountNumber(acc.accountNumber)}
                </option>
              ))}
            </Select>
          </FormField>

          {!canImport ? (
            <Alert tone="info">Seu perfil só consulta o extrato; importar arquivos exige permissão de criação no Financeiro.</Alert>
          ) : null}
          {canImport ? (
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
          ) : null}

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
          {bankAccountId ? (
            <AsyncState result={transactionsQuery} loadingLabel="Carregando extrato...">
              <Table columns={columns} rows={transactions} emptyMessage="Nenhuma transação importada para esta conta ainda." />
            </AsyncState>
          ) : (
            <Table columns={columns} rows={[]} emptyMessage="Cadastre uma conta bancária para importar e consultar o extrato." />
          )}
        </Card>
        </AsyncState>
      </div>

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
