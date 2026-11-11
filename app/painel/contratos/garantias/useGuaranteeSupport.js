"use client";

// Dados de apoio do formulário de garantia: pessoas (fiador), recebimentos de caução do Financeiro e fluxos de "outra
// garantia" homologados. Cada leitura que falha vira aviso (nunca lista vazia em silêncio, M9-D850).
import { useEffect, useState } from "react";
import { listPeople } from "@/lib/api/people";
import { listFinancialEntries } from "@/lib/api/finance";
import { getSetting } from "@/lib/api/settings";
import { reportLookupProblem } from "@/lib/asyncState/lookup";
import { parseOtherFlows } from "./guaranteeForm";

export function useGuaranteeSupport() {
  const [support, setSupport] = useState({ people: [], entries: [], otherFlows: [], flowsReadable: true });
  useEffect(() => {
    let alive = true;
    Promise.all([
      listPeople().catch((e) => { reportLookupProblem("as pessoas", e); return []; }),
      listFinancialEntries({ nature: "RECEIVABLE" }).catch((e) => { reportLookupProblem("os recebimentos do Financeiro", e); return []; }),
      // 404 = configuração não criada (nenhum fluxo homologado); 403 = sem acesso às configurações.
      getSetting("legal.guarantee_other_flows").then((s) => ({ flows: parseOtherFlows(s), readable: true })).catch((e) => ({ flows: [], readable: e?.status === 404 })),
    ]).then(([people, entries, flows]) => {
      if (alive) setSupport({ people: people || [], entries: entries || [], otherFlows: flows.flows, flowsReadable: flows.readable });
    });
    return () => {
      alive = false;
    };
  }, []);
  return support;
}
