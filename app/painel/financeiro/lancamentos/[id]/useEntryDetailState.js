"use client";

// Estado da ficha do lançamento (M9-D940): o carregamento passa pelo padrão único de estados (useAsyncState) e cada recarga atualiza a
// ficha local; as ações (liquidar, editar, estornar) atualizam o mesmo estado sem esperar a recarga.
import { useEffect, useState } from "react";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { loadEntryDetail } from "./loadEntryDetail";

export default function useEntryDetailState(id) {
  const [entry, setEntry] = useState(null);
  const [account, setAccount] = useState(null);
  const [costCenter, setCostCenter] = useState(null);
  const [resultCenter, setResultCenter] = useState(null);
  const [allBankAccounts, setAllBankAccounts] = useState([]);
  const [allCostCenters, setAllCostCenters] = useState([]);
  const [allResultCenters, setAllResultCenters] = useState([]);
  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversedBy, setReversedBy] = useState(null);
  const [allEntries, setAllEntries] = useState([]);
  const [contractInfo, setContractInfo] = useState(null);
  const [holderInfo, setHolderInfo] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [reconciledTransaction, setReconciledTransaction] = useState(null);
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);

  const detailQuery = useAsyncState(() => loadEntryDetail(id), { key: `lancamento:${id}`, deps: [id], isEmpty: () => false });
  useEffect(() => {
    const d = detailQuery.data;
    if (!d) return;
    setEntry(d.entry);
    setAccount(d.account);
    setCostCenter(d.costCenter);
    setResultCenter(d.resultCenter);
    setAllBankAccounts(d.allBankAccounts);
    setAllCostCenters(d.allCostCenters);
    setAllResultCenters(d.allResultCenters);
    setAllEntries(d.allEntries);
    setContractInfo(d.contractInfo);
    setHolderInfo(d.holderInfo);
    setReversalTarget(d.reversalTarget);
    setReversedBy(d.reversedBy);
    setReconciliation(d.reconciliation);
    setReconciledTransaction(d.reconciledTransaction);
    setApprovalRequest(d.approvalRequest);
    setPaymentIntent(d.paymentIntent);
  }, [detailQuery.data]);

  return {
    detailQuery, load: () => detailQuery.reload(),
    entry, setEntry, account, setAccount, costCenter, setCostCenter, resultCenter, setResultCenter,
    allBankAccounts, allCostCenters, allResultCenters, allEntries, contractInfo, holderInfo, reversalTarget, reversedBy,
    reconciliation, reconciledTransaction, approvalRequest, setApprovalRequest, paymentIntent, setPaymentIntent,
  };
}
