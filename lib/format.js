// FIX HOM-006 (homologação 28/08/2026): a API devolve campos DECIMAL como string (ex.:
// totalValue: "1000.00"), e string tem seu próprio Object.prototype.toLocaleString — que
// ignora silenciosamente os argumentos de formatação e devolve a string original ("1000.00"
// em vez de "R$ 1.000,00"), sem lançar erro. Só funcionava nos lugares que já passavam um
// number de verdade (ex.: somas calculadas no front). Number(value) corrige para todos os
// pontos de chamada.
//
// FIX AUD-003 (homologação 09/09/2026): o default aqui era `maximumFractionDigits: 0`, que
// TRUNCA os centavos de todo valor monetário exibido (R$ 123,45 virava "R$ 123") — sem
// nenhum caller do projeto inteiro passando um override pra 2 casas, isso afetava
// silenciosamente toda tela que usa formatBRL (financeiro, comissões, contratos, etc.),
// exceto o único lugar que já tinha percebido e contornado manualmente (ver
// contratos/lista/[id]/page.js antes desta correção). Dinheiro sempre mostra duas casas por
// padrão agora; `options` continua disponível pra quem quiser um formato diferente de
// propósito (ex.: valor arredondado num resumo compacto).
export function formatBRL(value, options = {}) {
  if (value == null || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2, ...options });
}

// FIX AUD-009 (homologação 09/09/2026): formatDate/formatDateTime convertiam pro fuso horário
// IMPLÍCITO de quem executa o código (o navegador de quem está olhando a tela) — na prática
// quase sempre certo pra um usuário no Brasil, mas não é confiável: um navegador com o relógio/
// fuso mal configurado, ou qualquer execução fora do navegador do usuário, muda o dia exibido
// sem nenhum aviso. A empresa opera só no Brasil, então fixamos explicitamente
// "America/Sao_Paulo" (UTC-3, sem horário de verão desde 2019) como o fuso de EXIBIÇÃO —
// nunca mais depende do ambiente de quem está vendo a tela.
const DISPLAY_TIMEZONE = "America/Sao_Paulo";

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: DISPLAY_TIMEZONE });
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: DISPLAY_TIMEZONE }) +
    " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: DISPLAY_TIMEZONE });
}

// FIX AUD-007/AUD-009 (homologação 09/09/2026): um <input type="date"> devolve só "YYYY-MM-DD",
// sem hora. Mandar essa string crua (ou `new Date(str).toISOString()`) pra API ancora o valor
// em MEIA-NOITE UTC — e ao exibir de volta, a conversão pra hora local "volta" pra o dia
// anterior. O sintoma exato que a cliente reportou: data informada como 09/09/2026 aparecendo
// como 08/09/2026 na tela.
//
// A primeira versão desta correção usava `new Date(y, m, d, 12, 0, 0, 0).toISOString()` — mas
// o construtor `new Date(...)` monta esse meio-dia no fuso IMPLÍCITO de quem executa o
// código (o navegador de quem está preenchendo o formulário), não necessariamente
// "America/Sao_Paulo". Corrigido para calcular o instante UTC diretamente: meio-dia em
// São Paulo (UTC-3, sem horário de verão desde 2019) É SEMPRE 15:00 UTC, não importa o fuso
// de quem roda o código — elimina a dependência do ambiente por completo, nos dois lados
// (aqui no envio, e em formatDate/formatDateTime na exibição).
const SAO_PAULO_UTC_OFFSET_HOURS = 3; // UTC-3, fixo (sem DST desde 2019)

export function dateOnlyInputToIso(dateOnlyString) {
  if (!dateOnlyString) return undefined;
  const [year, month, day] = dateOnlyString.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const noonUtcHour = 12 + SAO_PAULO_UTC_OFFSET_HOURS; // meio-dia em São Paulo = 15:00 UTC
  return new Date(Date.UTC(year, month - 1, day, noonUtcHour, 0, 0, 0)).toISOString();
}

export function isOverdue(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

// Aplica máscara visual de CPF (PF) ou CNPJ (PJ) sobre uma string de dígitos.
export function formatTaxId(value, personType) {
  const digits = String(value || "").replace(/\D/g, "");
  if (personType === "PJ") {
    return digits
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{2})$/, "$1-$2");
}
