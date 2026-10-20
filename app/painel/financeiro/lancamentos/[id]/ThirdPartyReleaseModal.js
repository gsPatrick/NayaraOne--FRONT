"use client";

// Devolução ou compensação de caução ligada ao recebimento de origem (Caderno do Financeiro §13,
// pendência F04 da conferência de 18/10/2026). A saída nunca é um lançamento solto: ela aponta
// para a caução recebida, herda contrato e titular dela e não passa do saldo que ainda resta.

import { useEffect, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { createFinancialEntry } from "@/lib/api/finance";
import { generateIdempotencyKey } from "@/lib/offline/offlineQueue";
import { friendlyFinanceError } from "@/lib/finance/extras";
import { formatBRL, formatContractLabel, humanizeText, toNumber } from "@/lib/format";

function cents(value) {
  return Math.round(Number(value || 0) * 100);
}

// Saldo da caução: o que foi recebido menos o que já saiu (devolvido ou compensado, sem contar estornos).
export function thirdPartyBalance(origin, allEntries) {
  const children = allEntries.filter((e) => e.parentEntryId === origin.id && e.status === "SETTLED");
  const received = origin.status === "SETTLED" ? cents(origin.amount) : children.reduce((a, c) => a + cents(c.amount), 0);
  const released = allEntries
    .filter((e) => e.thirdPartyOriginEntryId === origin.id && !e.parentEntryId && !["REVERSED", "CANCELLED"].includes(e.status))
    .reduce((a, e) => a + cents(e.amount), 0);
  return { received: received / 100, released: released / 100, available: (received - released) / 100 };
}

export default function ThirdPartyReleaseModal({ open, onClose, origin, allEntries, contract, holderName, costCenters, bankAccounts, onCreated }) {
  const [mode, setMode] = useState("RETURN");
  const [amount, setAmount] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [debtId, setDebtId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [idemKey, setIdemKey] = useState(null);

  const balance = origin ? thirdPartyBalance(origin, allEntries) : { received: 0, released: 0, available: 0 };
  const debts = origin
    ? allEntries.filter(
        (e) =>
          e.nature === "RECEIVABLE" &&
          !e.isThirdPartyFunds &&
          ["PENDING", "PARTIALLY_SETTLED"].includes(e.status) &&
          String(e.contractId || "") === String(origin.contractId || "")
      )
    : [];

  useEffect(() => {
    if (!open || !origin) return;
    setMode("RETURN");
    setAmount(String(balance.available > 0 ? balance.available.toFixed(2).replace(".", ",") : ""));
    setCostCenterId(costCenters?.[0]?.id || "");
    setBankAccountId(origin.bankAccountId || bankAccounts?.[0]?.id || "");
    setDebtId("");
    setError("");
    setIdemKey(generateIdempotencyKey());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, origin?.id]);

  const value = toNumber(amount);
  const overBalance = Number.isFinite(value) && cents(value) > cents(balance.available);
  const valid =
    Number.isFinite(value) && value > 0 && !overBalance && costCenterId && (mode === "RETURN" ? bankAccountId : debtId);

  async function handleSubmit() {
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      const created = await createFinancialEntry({
        entryType: "DEBIT",
        nature: "PAYABLE",
        amount: value,
        description: `${mode === "RETURN" ? "Devolução" : "Compensação"} de caução — ${humanizeText(origin.description)}`,
        costCenterId,
        bankAccountId: mode === "RETURN" ? bankAccountId : undefined,
        isThirdPartyFunds: true,
        thirdPartyReference: origin.thirdPartyReference || "Caução",
        thirdPartyOriginEntryId: origin.id,
        thirdPartyReleaseType: mode,
        thirdPartyCompensatedEntryId: mode === "COMPENSATION" ? debtId : undefined,
        idempotencyKey: idemKey,
      });
      onCreated?.(created);
    } catch (err) {
      setError(friendlyFinanceError(err, "Não foi possível registrar a saída da caução."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Devolver ou compensar caução"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={busy} disabled={!valid}>
            {mode === "RETURN" ? "Registrar devolução" : "Registrar compensação"}
          </Button>
        </>
      }
    >
      {origin ? (
        <>
          <Alert tone="info" title="Caução de origem">
            {humanizeText(origin.description)}
            <br />
            Contrato: {contract ? formatContractLabel(contract) : "não encontrado"} · Titular: {holderName || "não encontrado"}
            <br />
            Recebido {formatBRL(balance.received)} · Já devolvido ou compensado {formatBRL(balance.released)} · <strong>Saldo disponível {formatBRL(balance.available)}</strong>
          </Alert>
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <FormField label="O que fazer com a caução" htmlFor="tp-mode">
            <Select id="tp-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="RETURN">Devolver ao titular (sai dinheiro da conta)</option>
              <option value="COMPENSATION">Compensar uma dívida do titular (não movimenta caixa)</option>
            </Select>
          </FormField>

          <FormField
            label="Valor (R$)"
            htmlFor="tp-amount"
            required
            error={overBalance ? `O valor passa do saldo disponível de ${formatBRL(balance.available)}.` : undefined}
          >
            <DecimalInput id="tp-amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </FormField>

          <FormField label="Centro de custo" htmlFor="tp-cc" required>
            <Select id="tp-cc" value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)}>
              <option value="">Selecione...</option>
              {(costCenters || []).map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </Select>
          </FormField>

          {mode === "RETURN" ? (
            <FormField label="Conta de saída" htmlFor="tp-bank" required>
              <Select id="tp-bank" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
                <option value="">Selecione...</option>
                {(bankAccounts || []).map((a) => (
                  <option key={a.id} value={a.id}>{a.bankCode ? `Banco ${a.bankCode}` : "Chave PIX"} · Ag. {a.agency || "não informada"} · Conta {a.accountNumber || "não informada"}</option>
                ))}
              </Select>
            </FormField>
          ) : (
            <FormField
              label="Dívida do titular a compensar"
              htmlFor="tp-debt"
              required
              helper="Só aparecem valores a receber em aberto do mesmo contrato."
            >
              <Select id="tp-debt" value={debtId} onChange={(e) => setDebtId(e.target.value)}>
                <option value="">{debts.length ? "Selecione..." : "Nenhuma dívida em aberto neste contrato"}</option>
                {debts.map((d) => (
                  <option key={d.id} value={d.id}>{humanizeText(d.description)} — {formatBRL(d.amount)}</option>
                ))}
              </Select>
            </FormField>
          )}
          <p style={{ fontSize: "var(--text-caption)", color: "var(--color-ink-muted)" }}>A devolução ou compensação fica ligada a esta caução. Depois de criada, ela segue o fluxo normal: aprovação de outra pessoa e baixa.</p>
        </>
      ) : null}
    </Modal>
  );
}
