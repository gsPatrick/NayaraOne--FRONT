// Padrão único para qualquer gráfico "por mês" do sistema: sempre uma janela fixa de
// 12 meses (mês atual + 11 anteriores), preenchendo com valor 0 (ghost) os meses sem dado —
// nunca omite um mês só porque não teve movimento.

export function buildMonthlyChartData(records, { getDate, getValue, formatValue, months = 12 }) {
  const counts = {};
  records.forEach((record) => {
    const ref = getDate(record);
    if (!ref) return;
    const d = new Date(ref);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    counts[key] = (counts[key] || 0) + getValue(record);
  });

  const now = new Date();
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const value = counts[key] || 0;
    result.push({
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      value,
      displayValue: formatValue ? formatValue(value) : value,
      ghost: value === 0,
    });
  }
  return result;
}
