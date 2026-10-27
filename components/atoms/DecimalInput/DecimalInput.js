"use client";

import { useState } from "react";
import Input from "@/components/atoms/Input/Input";

export const NEGATIVE_VALUE_MESSAGE = "Não use sinal negativo: o sinal foi removido, confira o valor.";

// BUG REAL CRÍTICO CORRIGIDO (achado numa auditoria final do Marco 6, 30/09/2026): todo campo
// monetário/percentual/quantidade fracionária do módulo usava <input type="number">. Esse tipo
// de campo nativo REJEITA a vírgula — o navegador simplesmente ignora o keypress — então um
// usuário brasileiro digitando "150000,50" (do jeito que qualquer um aqui digitaria) tinha a
// vírgula descartada e os dígitos remanescentes concatenados: o valor realmente salvo era
// "15000050" (R$ 15.000.050,00 em vez de R$ 150.000,50) — uma inflação de ~100x, SILENCIOSA,
// sem nenhum erro. Em pelo menos um caso real de teste isso chegou a congelar uma baseline de
// orçamento aprovada (imutável) com o valor errado.
//
// Correção: campo de texto comum (não "number" nativo), que só aceita dígitos e UM separador
// decimal (vírgula OU ponto, nunca os dois) — exatamente o que um teclado numérico brasileiro
// produz. O valor emitido via onChange continua sendo a STRING exibida (com vírgula), igual ao
// <Input type="number"> antigo — todo código que já fazia `setForm(p => ({...p, x:
// e.target.value}))` continua funcionando sem mudança nenhuma. A conversão pra número (na hora
// de montar o payload da API) deve usar `toNumber()` de lib/format.js, NUNCA `Number(...)` cru
// (que entende só ponto, não vírgula).
// R3 (reconferência 20/10/2026): o "-" era apagado em silêncio e -10 virava R$ 10,00. Agora o
// sinal é recusado com aviso visível. Campos que aceitam negativo de verdade (ex.: impacto de
// aditivo) usam allowNegative.
export default function DecimalInput({ value, onChange, allowNegative = false, maxDecimals, ...rest }) {
  const [negativeWarning, setNegativeWarning] = useState(false);
  function handleChange(e) {
    const raw = e.target.value;
    if (allowNegative) {
      const neg = raw.trim().startsWith("-");
      const body = raw.replace(/-/g, "");
      const normalized = limitDecimals(normalize(body), maxDecimals);
      onChange({ target: { value: neg ? `-${normalized}` : normalized } });
      return;
    }
    if (raw.includes("-")) {
      // Remove só o sinal (o resto do que foi digitado é mantido) e avisa de forma visível.
      setNegativeWarning(true);
      onChange({ target: { value: limitDecimals(normalize(raw.replace(/-/g, "")), maxDecimals) } });
      return;
    }
    setNegativeWarning(false);
    const cleaned = limitDecimals(normalize(raw), maxDecimals);
    if (cleaned === raw) {
      onChange(e);
    } else {
      onChange({ target: { value: cleaned } });
    }
  }

  return (
    <>
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        error={negativeWarning || rest.error}
        {...rest}
        {...(negativeWarning ? { error: true } : {})}
      />
      {negativeWarning ? (
        <span role="alert" style={{ color: "var(--color-danger, #b42318)", fontSize: "0.8125rem" }}>
          {NEGATIVE_VALUE_MESSAGE}
        </span>
      ) : null}
    </>
  );
}

function normalize(raw) {
  {
    // Permite dígitos, ponto (separador de milhar BR) e vírgula (separador decimal BR).
    let cleaned = raw.replace(/[^0-9,.]/g, "");
    // BUG REAL CORRIGIDO (achado em auditoria E2E de browser, 01/10/2026): valores >= R$ 1.000
    // digitados com separador de milhar BR (ex.: "1.546,73") eram cortados errado — o PRIMEIRO
    // separador encontrado (o ponto de milhar) era tratado como "o" separador decimal, e a
    // vírgula real era descartada, resultando em "1.54673" -> R$ 1,55 salvo (perda de ~1000x do
    // valor). Regra correta: se há vírgula no texto, ela É o separador decimal — todo ponto é
    // separador de milhar e deve ser removido; só a PRIMEIRA vírgula sobrevive. Sem vírgula
    // nenhuma, mantém o comportamento anterior (só o primeiro ponto sobrevive como decimal).
    if (cleaned.includes(",")) {
      cleaned = cleaned.replace(/\./g, "");
      const firstComma = cleaned.indexOf(",");
      cleaned = cleaned.slice(0, firstComma + 1) + cleaned.slice(firstComma + 1).replace(/,/g, "");
    } else if ((cleaned.match(/\./g) || []).length > 1) {
      // Mais de um ponto e nenhuma vírgula (ex.: "2.000.000"): os pontos são separadores de milhar.
      cleaned = cleaned.replace(/\./g, "");
    } else {
      const firstDot = cleaned.indexOf(".");
      if (firstDot !== -1) {
        cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
      }
    }
    return cleaned;
  }
}

function limitDecimals(text, maxDecimals) {
  if (maxDecimals === undefined || maxDecimals === null) return text;
  const sep = text.search(/[,.]/);
  if (sep === -1) return text;
  return text.slice(0, sep + 1) + text.slice(sep + 1, sep + 1 + maxDecimals);
}
