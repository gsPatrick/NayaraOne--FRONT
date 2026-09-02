// FIX HOM-006 (homologação 28/08/2026): a API devolve campos DECIMAL como string (ex.:
// totalValue: "1000.00"), e string tem seu próprio Object.prototype.toLocaleString — que
// ignora silenciosamente os argumentos de formatação e devolve a string original ("1000.00"
// em vez de "R$ 1.000,00"), sem lançar erro. Só funcionava nos lugares que já passavam um
// number de verdade (ex.: somas calculadas no front). Number(value) corrige para todos os
// pontos de chamada.
export function formatBRL(value, options = {}) {
  if (value == null || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0, ...options });
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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
