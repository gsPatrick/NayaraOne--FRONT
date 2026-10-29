"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import s from "./RowMenu.module.css";

export default function RowMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className={s.wrap} ref={ref}>
      <button type="button" className={s.btn} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="more" size={16} />
      </button>
      {open && (
        <ul className={s.menu} role="menu">
          {items.map((it) => (
            <li key={it.label} role="none">
              <button type="button" role="menuitem" className={`${s.item} ${it.danger ? s.danger : ""}`} onClick={() => { setOpen(false); it.onSelect?.(); }}>{it.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
