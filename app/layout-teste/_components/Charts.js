// Gráficos em SVG puro (sem biblioteca). Cores por token.
export function Sparkline({ data, width = 140, height = 32, label }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / (max - min || 1)) * (height - 6)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label || "Tendência"}>
      <path d={d} fill="none" stroke="var(--color-ink-soft)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--color-brand-active)" />
    </svg>
  );
}

// Barras = realizado; linha = previsto. data: [{ w, prev, real }] (real null = futuro)
export function CashChart({ data, width = 640, height = 220 }) {
  const m = { l: 44, r: 10, t: 10, b: 24 };
  const iw = width - m.l - m.r, ih = height - m.t - m.b;
  const max = Math.ceil(Math.max(...data.map((d) => Math.max(d.prev, d.real || 0))) / 100000) * 100000;
  const bw = iw / data.length;
  const y = (v) => m.t + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i ? "L" : "M"}${(m.l + bw * i + bw / 2).toFixed(1)} ${y(d.prev).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Fluxo de caixa de 12 semanas, previsto contra realizado">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke="var(--color-border)" />
          <text x={m.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--muted)">{t === 0 ? "0" : `${t / 1000} mil`}</text>
        </g>
      ))}
      {data.map((d, i) => d.real != null && (
        <rect key={d.w} x={m.l + bw * i + bw * 0.22} width={bw * 0.56} y={y(d.real)} height={y(0) - y(d.real)} rx="2" fill="var(--color-ink)" />
      ))}
      <path d={line} fill="none" stroke="var(--color-brand-active)" strokeWidth="2" strokeDasharray="5 3" />
      {data.map((d, i) => (
        <g key={`p${d.w}`}>
          <circle cx={m.l + bw * i + bw / 2} cy={y(d.prev)} r="2.5" fill="var(--color-brand-active)" />
          <text x={m.l + bw * i + bw / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">S{d.w}</text>
        </g>
      ))}
    </svg>
  );
}
