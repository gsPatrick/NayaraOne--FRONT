export function formatBRL(value) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
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
