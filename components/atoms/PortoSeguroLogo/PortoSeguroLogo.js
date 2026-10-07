"use client";

// Sem asset de logo oficial no projeto — fallback em círculo, cor institucional aproximada da
// Porto Seguro (azul). Mesmo padrão do FgvLogo.
export default function PortoSeguroLogo({ size = 32 }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        width: size, height: size, borderRadius: "999px", background: "#003DA5", color: "#FFFFFF",
        fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, userSelect: "none", fontSize: size * 0.28,
      }}
      title="Porto Seguro"
      aria-hidden="true"
    >
      PS
    </span>
  );
}
