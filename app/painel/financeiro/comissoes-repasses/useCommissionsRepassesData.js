"use client";

// Carga da tela Comissões & Repasses (M9-D940). Cada bloco carrega sozinho pelo padrão único de estados (useAsyncState):
// se um falha, ele mostra o estado certo (sem acesso, sem conexão, tentar de novo) e os outros continuam aparecendo.
// As listas ficam em estado local porque as ações da tela (pagar parcela, criar repasse etc.) atualizam a linha sem recarregar tudo.
import { useEffect, useState } from "react";
import { listCommissions, listOwnerRepasses, listBankAccounts, listFinancialEntries } from "@/lib/api/finance";
import { listPeople } from "@/lib/api/people";
import { apiFetch } from "@/lib/api/client";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";

const OPTIONS = { isEmpty: () => false };

export function useCommissionsRepassesData() {
  const commissionsQuery = useAsyncState(() => listCommissions({ includeInstallments: true }).then((list) => list || []), { key: "comissoes-repasses:comissoes", ...OPTIONS });
  const repassesQuery = useAsyncState(() => listOwnerRepasses().then((list) => list || []), { key: "comissoes-repasses:repasses", ...OPTIONS });
  const accountsQuery = useAsyncState(() => listBankAccounts().then((list) => list || []), { key: "comissoes-repasses:contas", ...OPTIONS });
  const entriesQuery = useAsyncState(() => listFinancialEntries({ status: "PENDING" }).then((list) => list || []), { key: "comissoes-repasses:lancamentos", ...OPTIONS });
  const peopleQuery = useAsyncState(() => listPeople().then((list) => list || []), { key: "comissoes-repasses:pessoas", ...OPTIONS });
  const usersQuery = useAsyncState(() => apiFetch("/users").then((list) => list || []), { key: "comissoes-repasses:usuarios", ...OPTIONS });

  const [commissions, setCommissions] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [repasses, setRepasses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [people, setPeople] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!commissionsQuery.data) return;
    setCommissions(commissionsQuery.data);
    // O2 (auditoria M45): parcelas vêm junto da listagem (uma chamada), sem N+1.
    setInstallments(commissionsQuery.data.flatMap((c) => c.installments || []));
  }, [commissionsQuery.data]);
  useEffect(() => { if (repassesQuery.data) setRepasses(repassesQuery.data); }, [repassesQuery.data]);
  useEffect(() => { if (accountsQuery.data) setBankAccounts(accountsQuery.data); }, [accountsQuery.data]);
  useEffect(() => { if (entriesQuery.data) setPendingEntries(entriesQuery.data); }, [entriesQuery.data]);
  useEffect(() => { if (peopleQuery.data) setPeople(peopleQuery.data); }, [peopleQuery.data]);
  useEffect(() => { if (usersQuery.data) setUsers(usersQuery.data); }, [usersQuery.data]);

  const queries = [commissionsQuery, repassesQuery, accountsQuery, entriesQuery, peopleQuery, usersQuery];
  // Blocos que terminaram sem dado (falha): a tela mostra o estado de cada um com "tentar de novo".
  const failed = queries.filter((query) => query.status !== "LOADING" && !query.data);
  const loading = queries.some((query) => query.status === "LOADING" && !query.data);
  // Ações só com dado fresco: na revisita o cache aparece, mas pagar/aprovar espera a carga nova.
  const stale = queries.some((query) => query.status === "LOADING" || query.fromCache);
  const reload = () => queries.forEach((query) => query.reload());

  return { commissions, setCommissions, installments, setInstallments, repasses, setRepasses, bankAccounts, pendingEntries, people, users, failed, loading, stale, reload };
}
