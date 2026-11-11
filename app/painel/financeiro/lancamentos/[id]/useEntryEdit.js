"use client";

// Edição do lançamento ainda pendente (descrição, conta/favorecido, centros e vencimento) — FIN-004(c)/FIN-TS-003/004: trocar a conta depois de
// uma aprovação cancela a aprovação. `context()` devolve, na hora da ação, a ficha atual e os setters da página.
import { useState } from "react";
import { updateFinancialEntry } from "@/lib/api/finance";
import { friendlyFinanceError } from "@/lib/finance/extras";
import { dateOnlyInputToIso } from "@/lib/format";

export default function useEntryEdit(context) {
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  function openEdit() {
    const { entry } = context();
    setEditError("");
    setEditForm({
      description: entry.description || "",
      bankAccountId: entry.bankAccountId || "",
      costCenterId: entry.costCenterId || "",
      resultCenterId: entry.resultCenterId || "",
      dueAt: entry.dueAt ? entry.dueAt.slice(0, 10) : "",
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    const { entry, allBankAccounts, allCostCenters, allResultCenters, setEntry, setAccount, setCostCenter, setResultCenter, setNotice, load } = context();
    setEditSaving(true);
    setEditError("");
    try {
      const updated = await updateFinancialEntry(entry.id, {
        description: editForm.description.trim() || undefined,
        bankAccountId: editForm.bankAccountId || undefined,
        costCenterId: editForm.costCenterId || undefined,
        resultCenterId: editForm.resultCenterId || undefined,
        dueAt: editForm.dueAt ? dateOnlyInputToIso(editForm.dueAt) : undefined,
      });
      setEntry(updated);
      setAccount(allBankAccounts.find((a) => a.id === updated.bankAccountId) || null);
      setCostCenter(allCostCenters.find((c) => c.id === updated.costCenterId) || null);
      setResultCenter(allResultCenters.find((r) => r.id === updated.resultCenterId) || null);
      setEditOpen(false);
      load();
      setNotice({ tone: "success", text: "Lançamento atualizado com sucesso." });
    } catch (err) {
      setEditError(friendlyFinanceError(err, "Não foi possível salvar as alterações."));
    } finally {
      setEditSaving(false);
    }
  }

  return { editOpen, setEditOpen, editForm, setEditForm, editSaving, editError, openEdit, handleSaveEdit };
}
