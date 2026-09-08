"use client";

import { useState } from "react";
import styles from "./Tabs.module.css";

export default function Tabs({ items = [], defaultIndex = 0, orientation = "horizontal" }) {
  const [active, setActive] = useState(defaultIndex);
  const vertical = orientation === "vertical";

  return (
    <div className={[styles.wrap, vertical ? styles.wrapVertical : ""].filter(Boolean).join(" ")}>
      <div
        className={[styles.list, vertical ? styles.listVertical : ""].filter(Boolean).join(" ")}
        role="tablist"
        aria-orientation={orientation}
      >
        {items.map((item, i) => (
          <button
            key={item.label}
            role="tab"
            aria-selected={active === i}
            className={[styles.tab, vertical ? styles.tabVertical : "", active === i ? styles.active : ""].filter(Boolean).join(" ")}
            onClick={() => setActive(i)}
          >
            {item.label}
          </button>
        ))}
        {!vertical ? (
          <span className={styles.indicator} style={{ transform: `translateX(${active * 100}%)`, width: `${100 / items.length}%` }} />
        ) : null}
      </div>
      <div className={styles.panel}>{items[active]?.content}</div>
    </div>
  );
}
