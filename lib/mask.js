// Máscaras de exibição para dados sensíveis de contas bancárias (antifraude / LGPD) —
// por padrão qualquer tela que liste contas mostra os dados mascarados; a página de detalhe
// oferece um botão "Revelar" para exibir o valor completo sob demanda.

export function maskAccountNumber(value) {
  if (!value) return "—";
  const [main, digit] = String(value).split("-");
  if (!main) return value;
  const visible = main.slice(-2);
  return `${"•".repeat(Math.max(0, main.length - 2))}${visible}${digit ? `-${digit}` : ""}`;
}

export function maskAgency(value) {
  if (!value) return "—";
  const str = String(value);
  if (str.length <= 2) return str;
  return `${"•".repeat(str.length - 2)}${str.slice(-2)}`;
}

export function maskPixKey(value) {
  if (!value) return "—";
  const str = String(value);
  if (str.includes("@")) {
    const [user, domain] = str.split("@");
    const visible = user.slice(0, 2);
    return `${visible}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`;
  }
  const digitsOnly = str.replace(/\D/g, "");
  if (digitsOnly.length === str.length && digitsOnly.length >= 8) {
    return `${"•".repeat(str.length - 4)}${str.slice(-4)}`;
  }
  if (str.length <= 6) return `${str.slice(0, 1)}${"•".repeat(str.length - 1)}`;
  return `${str.slice(0, 3)}${"•".repeat(str.length - 6)}${str.slice(-3)}`;
}

export function maskDocument(value) {
  if (!value) return "—";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 11) {
    // CPF: 123.•••.•••-45
    return `${digits.slice(0, 3)}.•••.•••-${digits.slice(-2)}`;
  }
  if (digits.length === 14) {
    // CNPJ: 12.•••.•••/••••-56
    return `${digits.slice(0, 2)}.•••.•••/••••-${digits.slice(-2)}`;
  }
  return value;
}
