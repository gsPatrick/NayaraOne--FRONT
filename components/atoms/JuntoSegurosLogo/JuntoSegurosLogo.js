"use client";

// Sem asset de logo oficial no projeto — fallback em círculo, cor institucional aproximada da
// Junto Seguros (verde-azulado). Mesmo padrão do FgvLogo.
export default function JuntoSegurosLogo({ size = 32 }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        width: size, height: size, borderRadius: "999px", background: "#00B2A9", color: "#FFFFFF",
        fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, userSelect: "none", fontSize: size * 0.28,
      }}
      title="Junto Seguros"
      aria-hidden="true"
    >
      JS
    </span>
  );
}
