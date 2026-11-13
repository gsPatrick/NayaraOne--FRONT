"use client";

// Estorno em duas pessoas (Guia M4 §8 e §15; DEC-003): quem tem "Pedir estorno" (finance:reverse) e MFA recente abre o pedido com motivo
// (e valor, no estorno parcial); o estorno só é lançado quando OUTRA pessoa aprova o caso em Financeiro → Aprovações (Estornos pendentes).
import { useState } from "react";
import Alert from "@/components/molecules/Alert/Alert";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import FormField from "@/components/molecules/FormField/FormField";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import ConfirmAction from "@/components/molecules/ConfirmAction/ConfirmAction";
import { reverseFinancialEntry } from "@/lib/api/finance";
import { formatBRL, formatDateTime } from "@/lib/format";
import { validateReversalAmount } from "@/lib/finance/approvalFlows";
import { financeAuthErrorMessage } from "@/lib/finance/authorizationErrors";

export function ReversalRequestButton({ entry, pendingCase, disabled, onRequested, preview = null, allowPartial = true }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const check = validateReversalAmount(amount, entry?.amount);

  if (!entry) return null;
  if (pendingCase) {
    return (
      <Button variant="secondary" disabled title="Já há um pedido de estorno aguardando a aprovação de outra pessoa">
        <Icon name="settings" size={16} /> Estorno aguardando aprovação
      </Button>
    );
  }

  async function handleConfirmed(confirmation) {
    if (check.error) throw new Error(check.error);
    try {
      const created = await reverseFinancialEntry(entry.id, confirmation.justification, confirmation, allowPartial ? check.amount : null);
      setOpen(false);
      setAmount("");
      onRequested(created);
    } catch (err) {
      // O código segue junto: o ConfirmAction refaz a simulação quando o impacto mudou (GOV_ACTION_IMPACT_CHANGED).
      throw Object.assign(new Error(financeAuthErrorMessage(err, "Não foi possível pedir o estorno.")), { code: err.code, traceId: err.traceId });
    }
  }

  return (
    <>
      <Button requires="finance:reverse" variant="secondary" onClick={() => setOpen(true)} disabled={disabled}>
        <Icon name="settings" size={16} /> Solicitar estorno
      </Button>
      <ConfirmAction
        open={open}
        onClose={() => setOpen(false)}
        title="Solicitar o estorno deste lançamento?"
        confirmLabel="Solicitar estorno"
        target={{ method: "GET", path: `/finance/entries/${entry.id}/impact` }}
        onConfirm={handleConfirmed}
      >
        <p>
          O estorno não acontece agora: o pedido fica aguardando a aprovação de outra pessoa (com verificação em duas etapas). Só depois da
          aprovação o lançamento compensatório é criado — o original nunca é editado.
        </p>
        {preview ? <p>{preview}</p> : null}
        {allowPartial ? (
        <FormField
          label="Valor do estorno (opcional)"
          htmlFor="reversal-amount"
          helper={`Deixe em branco para estornar o valor total (${formatBRL(entry.amount)}).`}
          error={check.error}
        >
          <DecimalInput id="reversal-amount" maxDecimals={2} value={amount} placeholder="0,00" onChange={(e) => setAmount(e.target.value)} error={Boolean(check.error)} />
        </FormField>
        ) : null}
      </ConfirmAction>
    </>
  );
}

/** Pedido de estorno pendente deste lançamento: quem pediu, quando, o motivo e o valor; a decisão é de outra pessoa. */
export function PendingReversalNotice({ pendingCase }) {
  if (!pendingCase) return null;
  const partial = pendingCase.payloadJson?.partialAmount;
  return (
    <Alert tone="info" title="Estorno pedido — aguardando a aprovação de outra pessoa">
      Pedido em {formatDateTime(pendingCase.createdAt || pendingCase.created_at)} · valor: {partial ? `${formatBRL(partial)} (estorno parcial)` : `${formatBRL(pendingCase.amount)} (total)`}
      {" "}· motivo: {pendingCase.reason || "sem motivo registrado"}. O estorno só é lançado quando outra pessoa aprova em Financeiro → Aprovações, na lista
      de Estornos pendentes.
    </Alert>
  );
}
