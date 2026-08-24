// Registro próprio de bancos brasileiros (código COMPE/ISPB, nome, sigla e cor da marca).
// `hasLogo: true` indica que existe um arquivo real em /public/bank-logos/{code}.svg,
// baixado do Wikimedia Commons (uso livre, editorial) — usado só internamente no Nayara One
// para identificar visualmente a conta, nunca redistribuído como produto/marca própria.
// Bancos sem logo salva usam o badge colorido com sigla como alternativa automática.

// `aspect` = largura/altura real do arquivo de logo (a maioria dos bancos só tem uma
// "wordmark" retangular no Wikimedia, não um ícone quadrado como o do Itaú) — o BankLogo
// usa isso pra dimensionar o chip proporcionalmente em vez de espremer tudo num quadrado.
export const BANKS = [
  { code: "001", name: "Banco do Brasil", shortName: "BB", color: "#F8C300", textColor: "#0033A0", hasLogo: true, aspect: 3.2 },
  { code: "033", name: "Santander", shortName: "ST", color: "#EC0000", textColor: "#FFFFFF", hasLogo: true, aspect: 3.2 },
  { code: "077", name: "Banco Inter", shortName: "IN", color: "#FF7A00", textColor: "#FFFFFF", hasLogo: true, aspect: 3.2 },
  { code: "104", name: "Caixa Econômica Federal", shortName: "CX", color: "#0070AD", textColor: "#FFFFFF", hasLogo: true, aspect: 3.2 },
  { code: "141", name: "Banco Master", shortName: "MA", color: "#1B1B1B", textColor: "#FFFFFF", hasLogo: true, aspect: 3.2 },
  { code: "170", name: "Banrisul", shortName: "BR", color: "#004A93", textColor: "#FFFFFF", hasLogo: true, aspect: 3.2 },
  { code: "197", name: "Stone Pagamentos", shortName: "ST", color: "#00A868", textColor: "#FFFFFF" },
  { code: "208", name: "BTG Pactual", shortName: "BTG", color: "#0B1F3A", textColor: "#FFFFFF", hasLogo: true, aspect: 2.5 },
  { code: "212", name: "Banco Original", shortName: "OG", color: "#00AA4F", textColor: "#FFFFFF", hasLogo: true, aspect: 3.2 },
  { code: "237", name: "Bradesco", shortName: "BD", color: "#CC092F", textColor: "#FFFFFF", hasLogo: true, aspect: 3.2 },
  { code: "260", name: "Nu Pagamentos (Nubank)", shortName: "NU", color: "#820AD1", textColor: "#FFFFFF", hasLogo: true, aspect: 1.8 },
  { code: "290", name: "PagSeguro (PagBank)", shortName: "PS", color: "#FFC72C", textColor: "#0B1F3A", hasLogo: true, aspect: 3.2 },
  { code: "323", name: "Mercado Pago", shortName: "MP", color: "#00AAEF", textColor: "#FFFFFF" },
  { code: "336", name: "Banco C6", shortName: "C6", color: "#1B1B1B", textColor: "#FFFFFF", hasLogo: true, aspect: 3.2 },
  { code: "341", name: "Itaú Unibanco", shortName: "IT", color: "#EC7000", textColor: "#FFFFFF", hasLogo: true, aspect: 1 },
  { code: "380", name: "PicPay", shortName: "PP", color: "#11C76F", textColor: "#0B1F3A", hasLogo: true, aspect: 3 },
  { code: "422", name: "Banco Safra", shortName: "SF", color: "#003E7E", textColor: "#FFFFFF", hasLogo: true, aspect: 3.2 },
  { code: "633", name: "Banco Rendimento", shortName: "RD", color: "#00558C", textColor: "#FFFFFF" },
  { code: "654", name: "Banco A.J. Renner", shortName: "AJ", color: "#7A1F2B", textColor: "#FFFFFF" },
  { code: "735", name: "Banco Neon", shortName: "NE", color: "#00E0B8", textColor: "#0B1F3A" },
  { code: "748", name: "Sicredi", shortName: "SI", color: "#6ABE49", textColor: "#FFFFFF", hasLogo: true, aspect: 3.2 },
  { code: "756", name: "Sicoob", shortName: "SB", color: "#00A398", textColor: "#FFFFFF", hasLogo: true, aspect: 3.2 },
];

export function getBank(code) {
  return BANKS.find((b) => b.code === code) || null;
}

export function getBankLogoSrc(code) {
  const bank = getBank(code);
  return bank?.hasLogo ? `/bank-logos/${bank.code}.svg` : null;
}

export function getBankName(code) {
  return getBank(code)?.name || (code ? `Banco ${code}` : "—");
}
