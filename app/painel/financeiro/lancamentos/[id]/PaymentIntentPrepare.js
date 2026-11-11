"use client";

// Preparar o pagamento (Guia M4 §4 preparePayment; Caderno §8 passos 1 a 5): o usuário escolhe o valor desta intenção — o saldo em
// aberto inteiro ou uma parte dele (parcela) —, a API congela o favorecido e o retrato, e o pedido de aprovação nasce da regra
// (REG-FIN-002 ou faixas de valor). Vale para lançamento a pagar pendente ou parcialmente pago.
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Alert from "@/components/molecules/Alert/Alert";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { createPaymentIntent } from "@/lib/api/finance";
import { formatBRL } from "@/lib/format";
import { validateIntentAmount, intentInvalidation } from "@/lib/finance/paymentIntents";
import { financeAuthErrorMessage } from "@/lib/finance/authorizationErrors";
import styles from "./page.module.css";

export default function PaymentIntentPrepare({ entry, balanceCents, installmentNumber, onCancel, onCreated }) {
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const check = validateIntentAmount(amount, balanceCents);
  const fieldError = touched ? check.error : null;

  async function handleSubmit() {
    setTouched(true);
    if (check.error) return;
    setBusy(true);
    setError("");
    try {
      const created = await createPaymentIntent({ financialEntryId: entry.id, amount: check.amount });
      setAmount("");
      setTouched(false);
      onCreated(created);
    } catch (err) {
      setError(financeAuthErrorMessage(err, "Não foi possível preparar o pagamento."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Preparar pagamento"
      subtitle="A intenção congela o favorecido (banco, agência, conta, chave PIX e nome) e o valor escolhido. Se os dados bancários ou o lançamento mudarem antes do pagamento, a intenção é invalidada e é preciso preparar outra."
      className={styles.notice}
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <dl className={styles.detailList}>
        <div className={styles.detailRow}><dt>Saldo em aberto</dt><dd className={styles.amount}>{formatBRL(balanceCents / 100)}</dd></div>
        <div className={styles.detailRow}><dt>Parcela</dt><dd>{installmentNumber}ª deste lançamento</dd></div>
      </dl>
      <FormField
        label="Valor a pagar nesta intenção"
        htmlFor="intent-amount"
        helper={`Deixe em branco para pagar o saldo em aberto inteiro (${formatBRL(balanceCents / 100)}), ou informe uma parte dele.`}
        error={fieldError}
      >
        <DecimalInput
          id="intent-amount"
          maxDecimals={2}
          value={amount}
          placeholder="0,00"
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => setTouched(true)}
          error={Boolean(fieldError)}
        />
      </FormField>
      <p className={styles.reconMeta}>
        {check.error
          ? "Corrija o valor para continuar."
          : check.full
            ? `Será preparado o pagamento do saldo inteiro: ${formatBRL(check.cents / 100)}.`
            : `Será preparado um pagamento parcial de ${formatBRL(check.cents / 100)}; restam ${formatBRL((balanceCents - check.cents) / 100)} em aberto.`}
        {" "}A aprovação é de outra pessoa; o número de aprovações e a verificação em duas etapas dependem do risco do valor.
      </p>
      <div className={styles.editActions}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button requires="finance:create" onClick={handleSubmit} loading={busy} disabled={Boolean(touched && check.error)}>
          Preparar pagamento
        </Button>
      </div>
    </Card>
  );
}

/** Aviso de intenção invalidada (favorecido ou lançamento mudou depois da preparação) — distinto de um cancelamento comum. */
export function IntentInvalidatedNotice({ intent }) {
  const invalidation = intentInvalidation(intent);
  if (!invalidation) return null;
  return (
    <Alert tone="warning" title={invalidation.title}>
      {invalidation.reason}
    </Alert>
  );
}
