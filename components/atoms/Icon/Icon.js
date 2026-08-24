import styles from "./Icon.module.css";

const PATHS = {
  home: "M3 11l9-8 9 8M5 10v10h14V10",
  building: "M4 21V4h9v17M13 21h7v-9h-7M8 8h1M8 12h1M8 16h1",
  users: "M8 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5M17 12a3 3 0 1 0 0-6M22 20c0-2.5-2-4.6-4.6-5.3",
  chart: "M4 20V10M11 20V4M18 20v-7",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
  bell: "M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6ZM10 20a2 2 0 0 0 4 0",
  chevronDown: "M6 9l6 6 6-6",
  chevronRight: "M9 6l6 6-6 6",
  close: "M6 6l12 12M18 6L6 18",
  check: "M4 12l6 6L20 6",
  plus: "M12 5v14M5 12h14",
  filter: "M4 5h16M7 12h10M10 19h4",
  document: "M7 3h7l5 5v13H7zM14 3v5h5",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.6 10.5l-1.6-.9 1-1.7 1.8.5a7 7 0 0 1 1.6-.9l.4-1.9h2l.4 1.9a7 7 0 0 1 1.6.9l1.8-.5 1 1.7-1.6.9a7 7 0 0 1 0 3l1.6.9-1 1.7-1.8-.5a7 7 0 0 1-1.6.9l-.4 1.9h-2l-.4-1.9a7 7 0 0 1-1.6-.9l-1.8.5-1-1.7 1.6-.9a7 7 0 0 1 0-3Z",
  layers: "M12 3 3 8l9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  menu: "M4 7h16M4 12h16M4 17h16",
  panelLeft: "M4 5h16v14H4ZM9 5v14",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  mail: "M3 6h18v12H3zM3 6l9 7 9-7",
  phone: "M6 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 12l5 2v3a2 2 0 0 1-2 2C10.5 19 5 13.5 5 6a2 2 0 0 1 1-2z",
  money: "M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM6 7v10M18 7v10",
  calendar: "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4",
  ban: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8",
  mapPin: "M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  image: "M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M9 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  video: "M3 6h12v12H3zM15 9l6-3v12l-6-3",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3",
  radar: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 12L17 9M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  pencil: "M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3ZM14 6.5l3 3",
  arrowDownCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v10M8 13l4 4 4-4",
  arrowUpCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 17V7M8 11l4-4 4 4",
  swapHorizontal: "M3 8h13M12 4l4 4-4 4M21 16H8M12 20l-4-4 4-4",
  refreshCcw: "M3 12a9 9 0 0 1 15.4-6.4L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.4 6.4L3 16M3 21v-5h5",
  signature: "M3 17c2-1 3-3 3-5 0-1.5 1-2 2-1s0 3-1 4c2 1 4-1 5-3 1-2 2-2 2 0 0 1.5 1.5 2 3 1M3 21h18",
  key: "M14 8a4 4 0 1 0-4 4l-7 7v3h3l1-1v-2h2v-2h2l3-3a4 4 0 0 0 0-6ZM16 6l1.5 1.5",
  scale: "M12 3v18M6 8l-3 6a3 3 0 0 0 6 0ZM18 8l-3 6a3 3 0 0 0 6 0ZM4 21h16M12 3l-6 5M12 3l6 5",
};

export default function Icon({ name, size = 20, className = "" }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      className={[styles.icon, className].filter(Boolean).join(" ")}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
