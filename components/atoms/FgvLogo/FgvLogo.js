"use client";

// Não existe asset de logo oficial da FGV no projeto — ao contrário do ClicksignLogo/BankLogo,
// este componente é só o fallback (círculo com iniciais na cor institucional da marca, azul
// FGV #002776), sem tentativa de carregar imagem.
export default function FgvLogo({ size = 32 }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "999px",
        background: "#002776",
        color: "#FFFFFF",
        fontWeight: 800,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        userSelect: "none",
        fontSize: size * 0.32,
      }}
      title="FGV Dados"
      aria-hidden="true"
    >
      FGV
    </span>
  );
}
