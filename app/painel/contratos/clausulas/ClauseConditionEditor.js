"use client";

// F01 (conferência Nayara 18/10/2026 — Caderno, Jurídico §6): a condição de uma cláusula é uma
// regra declarativa montada só com seletores. Não existe campo de texto livre para a regra: a
// lista de variáveis e operadores espelha a lista fechada da API (clauseConditions.js), que
// recusa qualquer coisa fora dela.

import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import styles from "./page.module.css";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { toNumber } from "@/lib/format";

const CONTRACT_TYPE_LABELS = {
  SALE: "Venda", SALE_CASH: "Venda à vista", SALE_FINANCED: "Venda financiada", SALE_TRADE: "Venda com permuta",
  SALE_INSTALLMENTS: "Venda parcelada", LEASE: "Locação", LEASE_RESIDENTIAL: "Locação residencial",
  LEASE_COMMERCIAL: "Locação comercial", LEASE_SEASONAL: "Locação por temporada", PROPERTY_ADMIN: "Administração de imóvel",
  SERVICE: "Prestação de serviço", CONSTRUCTION: "Obra",
};

export const CONDITION_VARIABLES = {
  contractType: { label: "Tipo de contrato", type: "enum", options: CONTRACT_TYPE_LABELS },
  guaranteeType: {
    label: "Tipo de garantia",
    type: "enum",
    options: { GUARANTOR: "Fiador", INSURANCE: "Seguro-fiança", DEPOSIT: "Caução", CAPITALIZATION_TITLE: "Título de capitalização", OTHER: "Outra", NONE: "Sem garantia" },
  },
  hasGuarantor: { label: "Possui fiador", type: "boolean" },
  propertyPurpose: { label: "Finalidade do imóvel", type: "enum", options: { RESIDENTIAL: "Residencial", COMMERCIAL: "Comercial", SEASONAL: "Temporada" } },
  tenantPersonType: { label: "Locatário/comprador", type: "enum", options: { PF: "Pessoa física", PJ: "Pessoa jurídica" } },
  termMonths: { label: "Prazo em meses", type: "number" },
  totalValue: { label: "Valor do contrato (R$)", type: "number" },
};

const OPERATOR_LABELS = {
  eq: "é igual a", neq: "é diferente de", in: "é um destes", not_in: "não é nenhum destes",
  gt: "maior que", gte: "maior ou igual a", lt: "menor que", lte: "menor ou igual a", exists: "foi informado?",
};

const OPERATORS_BY_TYPE = {
  enum: ["eq", "neq", "in", "not_in", "exists"],
  boolean: ["eq", "neq", "exists"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "exists"],
};

function defaultValue(variable, operator) {
  const def = CONDITION_VARIABLES[variable];
  if (operator === "exists") return true;
  if (operator === "in" || operator === "not_in") return [];
  if (def.type === "boolean") return true;
  if (def.type === "number") return "";
  return Object.keys(def.options)[0];
}

export function emptyRule() {
  return { variable: "guaranteeType", operator: "eq", value: "GUARANTOR" };
}

/** Converte o estado do editor no payload da API ({ match, rules }) ou null (sem condição). */
export function toConditionPayload(state) {
  if (!state || !state.enabled || state.rules.length === 0) return null;
  return {
    match: state.match,
    rules: state.rules.map((r) => {
      const def = CONDITION_VARIABLES[r.variable];
      if (r.operator !== "exists" && def.type === "number") return { ...r, value: toNumber(r.value) };
      return r;
    }),
  };
}

export function fromConditionJson(conditionJson) {
  if (!conditionJson) return { enabled: false, match: "all", rules: [] };
  return { enabled: true, match: conditionJson.match || "all", rules: conditionJson.rules.map((r) => ({ ...r })) };
}

export function isConditionStateValid(state) {
  if (!state.enabled) return true;
  if (state.rules.length === 0) return false;
  return state.rules.every((r) => {
    const def = CONDITION_VARIABLES[r.variable];
    if (r.operator === "exists") return true;
    if (r.operator === "in" || r.operator === "not_in") return Array.isArray(r.value) && r.value.length > 0;
    if (def.type === "number") return r.value !== "" && Number.isFinite(toNumber(r.value));
    return r.value !== undefined && r.value !== "";
  });
}

/** Texto legível da condição para listagens ("Tipo de garantia é igual a Fiador"). */
export function describeCondition(conditionJson) {
  if (!conditionJson) return "";
  const parts = conditionJson.rules.map((r) => {
    const def = CONDITION_VARIABLES[r.variable];
    if (!def) return r.variable;
    const label = (v) => (def.type === "enum" ? def.options[v] || v : def.type === "boolean" ? (v ? "Sim" : "Não") : String(v));
    if (r.operator === "exists") return `${def.label} ${r.value ? "informado" : "sem valor"}`;
    const value = Array.isArray(r.value) ? r.value.map(label).join(", ") : label(r.value);
    return `${def.label} ${OPERATOR_LABELS[r.operator]} ${value}`;
  });
  return parts.join(conditionJson.match === "any" ? " ou " : " e ");
}

export default function ClauseConditionEditor({ value, onChange, idPrefix }) {
  function update(patch) {
    onChange({ ...value, ...patch });
  }
  function updateRule(index, patch) {
    const rules = value.rules.map((r, i) => {
      if (i !== index) return r;
      const next = { ...r, ...patch };
      if (patch.variable !== undefined) {
        next.operator = OPERATORS_BY_TYPE[CONDITION_VARIABLES[patch.variable].type][0];
        next.value = defaultValue(patch.variable, next.operator);
      } else if (patch.operator !== undefined) {
        next.value = defaultValue(next.variable, patch.operator);
      }
      return next;
    });
    update({ rules });
  }

  return (
    <div className={styles.condition}>
      <label className={styles.conditionToggle}>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => update({ enabled: e.target.checked, rules: e.target.checked && value.rules.length === 0 ? [emptyRule()] : value.rules })}
        />
        Cláusula condicional (só entra no contrato quando a regra for atendida)
      </label>

      {value.enabled ? (
        <>
          <div className={styles.conditionMatch}>
            <span>Incluir quando</span>
            <Select id={`${idPrefix}-match`} value={value.match} onChange={(e) => update({ match: e.target.value })}>
              <option value="all">todas as regras forem atendidas</option>
              <option value="any">qualquer regra for atendida</option>
            </Select>
          </div>

          {value.rules.map((rule, index) => {
            const def = CONDITION_VARIABLES[rule.variable];
            const listOperator = rule.operator === "in" || rule.operator === "not_in";
            return (
              <div key={index} className={styles.conditionRule}>
                <Select aria-label="Variável" value={rule.variable} onChange={(e) => updateRule(index, { variable: e.target.value })}>
                  {Object.entries(CONDITION_VARIABLES).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
                </Select>
                <Select aria-label="Operador" value={rule.operator} onChange={(e) => updateRule(index, { operator: e.target.value })}>
                  {OPERATORS_BY_TYPE[def.type].map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
                </Select>

                {rule.operator === "exists" ? (
                  <Select aria-label="Valor" value={rule.value ? "yes" : "no"} onChange={(e) => updateRule(index, { value: e.target.value === "yes" })}>
                    <option value="yes">Sim</option>
                    <option value="no">Não</option>
                  </Select>
                ) : listOperator ? (
                  <div className={styles.conditionOptions}>
                    {Object.entries(def.options).map(([key, label]) => (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={rule.value.includes(key)}
                          onChange={(e) => updateRule(index, { value: e.target.checked ? [...rule.value, key] : rule.value.filter((v) => v !== key) })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                ) : def.type === "enum" ? (
                  <Select aria-label="Valor" value={rule.value} onChange={(e) => updateRule(index, { value: e.target.value })}>
                    {Object.entries(def.options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </Select>
                ) : def.type === "boolean" ? (
                  <Select aria-label="Valor" value={rule.value ? "yes" : "no"} onChange={(e) => updateRule(index, { value: e.target.value === "yes" })}>
                    <option value="yes">Sim</option>
                    <option value="no">Não</option>
                  </Select>
                ) : (
                  <DecimalInput aria-label="Valor" value={rule.value} onChange={(e) => updateRule(index, { value: e.target.value })} />
                )}

                <Button size="sm" variant="ghost" onClick={() => update({ rules: value.rules.filter((_, i) => i !== index) })} disabled={value.rules.length === 1}>
                  Remover
                </Button>
              </div>
            );
          })}

          <Button size="sm" variant="secondary" onClick={() => update({ rules: [...value.rules, emptyRule()] })}>
            Adicionar regra
          </Button>
          <p className={styles.meta}>A regra fica pendente até ser aprovada por outra pessoa com permissão de aprovação jurídica.</p>
        </>
      ) : null}
    </div>
  );
}
