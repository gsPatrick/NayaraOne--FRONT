// Ícones SVG inline (traço 1.5px, viewBox 24). Um desenho distinto por item.
const P = {
  painel: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  imoveis: "M4 21V4a1 1 0 011-1h9a1 1 0 011 1v17M15 9h4a1 1 0 011 1v11M3 21h18M8 7h3M8 11h3M8 15h3",
  contatos: "M16 20v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 18.5V20M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1.5a3.5 3.5 0 00-2.5-3.3M15.5 4.2a3.5 3.5 0 010 6.6",
  crm: "M3 4h18l-7 8.5V19l-4 2v-8.5z",
  radar: "M12 12l5-5M12 21a9 9 0 119-9M12 17a5 5 0 115-5",
  financeiro: "M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 10h18M16 15h2",
  contratos: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h4",
  obras: "M3 18h18M5 18v-2a7 7 0 0114 0v2M12 6v3M9 18v-4h6v4",
  estoque: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  compras: "M3 4h2l2.4 11h10.2L20 8H6M9 20.5a.5.5 0 100-1 .5.5 0 000 1zM17 20.5a.5.5 0 100-1 .5.5 0 000 1z",
  correspondente: "M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18",
  analytics: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  comando: "M3.5 16a9 9 0 1117 0M12 15l3.5-5",
  integracoes: "M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4",
  configuracoes: "M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4",
  bell: "M6 16v-5a6 6 0 1112 0v5l1.5 2h-15zM10 21h4",
  chevD: "M6 9l6 6 6-6",
  chevL: "M15 6l-6 6 6 6",
  chevR: "M9 6l6 6-6 6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  copy: "M9 9h11v11H9zM5 15V4h11",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  plus: "M12 5v14M5 12h14",
  check: "M5 12l5 5 9-10",
  alert: "M12 4l9 16H3zM12 10v4M12 17.01V17",
  menu: "M4 6h16M4 12h16M4 18h16",
  x: "M6 6l12 12M18 6L6 18",
  sortUp: "M7 14l5-5 5 5",
  sortDown: "M7 10l5 5 5-5",
  sort: "M8 9l4-4 4 4M8 15l4 4 4-4",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
};

export default function Icon({ name, size = 16, strokeWidth, className, title }) {
  const sw = strokeWidth || (name === "more" ? 3 : 1.5);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : "true"}
      focusable="false"
    >
      <path d={P[name] || P.painel} />
    </svg>
  );
}
