"use client";

import Input from "@/components/atoms/Input/Input";

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
export default function DecimalInput({ value, onChange, ...rest }) {
  function handleChange(e) {
    const raw = e.target.value;
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
    } else {
      const firstDot = cleaned.indexOf(".");
      if (firstDot !== -1) {
        cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
      }
    }
    if (cleaned === raw) {
      onChange(e);
    } else {
      // Só os call-sites deste projeto leem `e.target.value` — não precisamos (nem devemos,
      // SyntheticEvent é reciclado pelo React) clonar o evento inteiro.
      onChange({ target: { value: cleaned } });
    }
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={handleChange}
      {...rest}
    />
  );
}
