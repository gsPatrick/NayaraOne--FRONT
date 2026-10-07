"use client";

// Sem asset de logo oficial no projeto — fallback em círculo, cor institucional aproximada da
// Yelum Seguros (laranja). Mesmo padrão do FgvLogo.
export default function YelumLogo({ size = 32 }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        width: size, height: size, borderRadius: "999px", background: "#F7941D", color: "#FFFFFF",
        fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, userSelect: "none", fontSize: size * 0.3,
      }}
      title="Yelum Seguros"
      aria-hidden="true"
    >
      YL
    </span>
  );
}
