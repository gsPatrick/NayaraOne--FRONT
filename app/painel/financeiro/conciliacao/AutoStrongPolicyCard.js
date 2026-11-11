"use client";

// Mostra a regra AUTO_STRONG vigente na tela de conciliação (Guia M4 §9 ">= regra AUTO_STRONG: auto conforme policy"): quem concilia vê os
// limites que decidem forte, provável e ambíguo, e onde mudá-los (Configurações, aba Financeiro).
import Link from "next/link";
import Card from "@/components/molecules/Card/Card";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { getReconciliationPolicy } from "@/lib/api/finance";
import { describeAutoStrongPolicy } from "./autoStrongPolicy";
import styles from "./page.module.css";

export default function AutoStrongPolicyCard() {
  const policyQuery = useAsyncState(() => getReconciliationPolicy(), { key: "conciliacao:regra-auto-strong", isEmpty: () => false });
  return (
    <Card title="Regra de conciliação automática" subtitle="Pesos do caderno: valor 0,45 · referência 0,30 · contraparte 0,15 · data 0,10">
      <AsyncState result={policyQuery} loadingLabel="Carregando a regra de conciliação...">
        <dl className={styles.policyList}>
          {describeAutoStrongPolicy(policyQuery.data).map((item) => (
            <div key={item.key} className={styles.policyItem}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.emptyText}>
          Linha digitada à mão nunca é confirmada sozinha. Para mudar estes limites: <Link href="/painel/configuracoes">Configurações, aba Financeiro</Link>.
        </p>
      </AsyncState>
    </Card>
  );
}
