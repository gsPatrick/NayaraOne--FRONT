// Carrega tudo o que a ficha do lançamento precisa (M9-D940). Falha de qualquer leitura principal sobe como erro
// (a tela mostra o estado certo: sem acesso, sem conexão, tentar de novo; 404 vira "não encontrado").
// Contrato e titular são apoio: se falharem, a falha é registrada (lookupFallback) e a ficha continua abrindo.
import {
  getFinancialEntry,
  listFinancialEntries,
  listBankAccounts,
  listCostCenters,
  listResultCenters,
  listReconciliations,
  listBankTransactions,
  listApprovalRequests,
  listPaymentIntents,
} from "@/lib/api/finance";
import { getContract } from "@/lib/api/legal";
import { getPerson } from "@/lib/api/people";
import { lookupFallback } from "@/lib/asyncState/lookup";

const newestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

export async function loadEntryDetail(id) {
  const [entry, bankAccounts, costCenters, resultCenters, allEntriesRaw, reconciliations, bankTransactions, approvalRequests, paymentIntents] = await Promise.all([
    getFinancialEntry(id),
    listBankAccounts(),
    listCostCenters(),
    listResultCenters(),
    listFinancialEntries(),
    listReconciliations(),
    listBankTransactions(),
    listApprovalRequests(),
    listPaymentIntents(),
  ]);
  const allEntries = allEntriesRaw || [];
  const [contractInfo, holderInfo] = await Promise.all([
    entry.contractId ? getContract(entry.contractId).catch(lookupFallback("o contrato", null)) : null,
    entry.thirdPartyHolderPersonId ? getPerson(entry.thirdPartyHolderPersonId).catch(lookupFallback("o titular", null)) : null,
  ]);
  const reconciliation = reconciliations.find((r) => r.financialEntryId === entry.id) || null;
  // GAP REAL CORRIGIDO (ciclo de verificação adicional 5, Marco 4, 12/10/2026): a ApprovalRequest mais recente do lançamento
  // (FIN-004: PAYABLE exige aprovação prévia) e a intenção de pagamento mais recente (caminho alternativo, Caderno §8 ponto 4).
  const related = (approvalRequests || []).filter((r) => r.relatedEntityType === "FinancialEntry" && r.relatedEntityId === entry.id).sort(newestFirst);
  const relatedIntents = (paymentIntents || []).filter((p) => p.financialEntryId === entry.id).sort(newestFirst);
  return {
    entry,
    account: bankAccounts.find((a) => a.id === entry.bankAccountId) || null,
    costCenter: costCenters.find((c) => c.id === entry.costCenterId) || null,
    resultCenter: resultCenters.find((r) => r.id === entry.resultCenterId) || null,
    allBankAccounts: bankAccounts,
    allCostCenters: costCenters,
    allResultCenters: resultCenters,
    allEntries,
    contractInfo,
    holderInfo,
    reversalTarget: entry.reversalOfEntryId ? allEntries.find((x) => x.id === entry.reversalOfEntryId) || null : null,
    reversedBy: allEntries.find((x) => x.reversalOfEntryId === entry.id) || null,
    reconciliation,
    reconciledTransaction: reconciliation ? bankTransactions.find((t) => t.id === reconciliation.bankTransactionId) || null : null,
    approvalRequest: related[0] || null,
    paymentIntent: relatedIntents[0] || null,
  };
}
