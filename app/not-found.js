"use client";

import Link from "next/link";

// FIX (auditoria E2E de browser, 01/10/2026): sem esta página, qualquer URL que não bate com
// nenhuma rota (link antigo, id malformado, digitação errada) caía na 404 padrão do Next.js —
// em inglês, sem identidade visual, sem navegação de volta ao sistema. Mesma regra aplicada a
// todo erro de API: nada em inglês/cru visível ao usuário final.
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
        background: "var(--color-canvas, #fff)",
        color: "var(--color-ink, #17130F)",
      }}
    >
      <p style={{ fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>
        Erro 404
      </p>
      <h1 style={{ fontFamily: "var(--font-display, system-ui, sans-serif)", fontSize: "1.75rem", margin: 0 }}>
        Página não encontrada
      </h1>
      <p style={{ maxWidth: 420, opacity: 0.75 }}>
        O endereço acessado não existe ou o link pode estar desatualizado. Verifique o link ou
        volte para o painel.
      </p>
      <Link
        href="/painel"
        style={{
          marginTop: "0.5rem",
          padding: "0.65rem 1.25rem",
          borderRadius: "0.5rem",
          background: "var(--color-brand, #BE9130)",
          color: "#fff",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Voltar para o painel
      </Link>
    </div>
  );
}
