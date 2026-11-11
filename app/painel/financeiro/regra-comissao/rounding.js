// DI-M4CC-1: o livro (Marco 4) não define o arredondamento do centavo da comissão; quem publica a regra REG-FIN-001 escolhe o modo, gravado na
// versão. A API calcula base x percentual em decimal exato e arredonda UMA vez (src/modules/finance/domain/money.js).
export const ROUNDING_OPTIONS = [
  { value: "HALF_UP", label: "Meio centavo para cima (padrão)", example: "Exemplo: 50% de R$ 0,29 = R$ 0,15; 50% de R$ 0,01 = R$ 0,01." },
  { value: "HALF_EVEN", label: "Meio centavo para o par (bancário)", example: "Exemplo: 50% de R$ 0,29 = R$ 0,14; 50% de R$ 0,01 = R$ 0,00." },
];

const optionOf = (mode) => ROUNDING_OPTIONS.find((o) => o.value === mode) || ROUNDING_OPTIONS[0];

export function roundingLabel(mode) {
  return optionOf(mode).label;
}

export function roundingExample(mode) {
  return optionOf(mode).example;
}
