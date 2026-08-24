"use client";

import { useState, useRef, useEffect } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./DropdownMenu.module.css";

export default function DropdownMenu({ label, items = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {label}
        <Icon name="chevronDown" size={14} />
      </button>
      {open ? (
        <ul className={styles.menu} role="menu">
          {items.map((item) => (
            <li key={item.label}>
              <button className={styles.item} role="menuitem" onClick={() => { item.onSelect?.(); setOpen(false); }}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
