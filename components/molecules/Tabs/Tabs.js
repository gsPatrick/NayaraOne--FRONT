"use client";

import { useState } from "react";
import styles from "./Tabs.module.css";

export default function Tabs({ items = [], defaultIndex = 0 }) {
  const [active, setActive] = useState(defaultIndex);

  return (
    <div className={styles.wrap}>
      <div className={styles.list} role="tablist">
        {items.map((item, i) => (
          <button
            key={item.label}
            role="tab"
            aria-selected={active === i}
            className={[styles.tab, active === i ? styles.active : ""].filter(Boolean).join(" ")}
            onClick={() => setActive(i)}
          >
            {item.label}
          </button>
        ))}
        <span className={styles.indicator} style={{ transform: `translateX(${active * 100}%)`, width: `${100 / items.length}%` }} />
      </div>
      <div className={styles.panel}>{items[active]?.content}</div>
    </div>
  );
}
