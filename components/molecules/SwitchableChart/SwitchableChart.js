"use client";

import { useState } from "react";
import BarList from "@/components/molecules/BarList/BarList";
import PieChart from "@/components/molecules/PieChart/PieChart";
import ColumnChart from "@/components/molecules/ColumnChart/ColumnChart";
import AreaChart from "@/components/molecules/AreaChart/AreaChart";
import styles from "./SwitchableChart.module.css";

const TYPES = [
  { key: "column", label: "Colunas" },
  { key: "bar", label: "Barras" },
  { key: "pie", label: "Pizza" },
  { key: "donut", label: "Rosca" },
  { key: "line", label: "Linha" },
];

export default function SwitchableChart({ items, defaultType = "column" }) {
  const [type, setType] = useState(defaultType);

  return (
    <div className={styles.wrap}>
      <div className={styles.switcher}>
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.switchBtn} ${type === t.key ? styles.switchBtnActive : ""}`}
            onClick={() => setType(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={styles.chartArea}>
        {type === "column" ? <ColumnChart items={items} /> : null}
        {type === "bar" ? <BarList items={items} /> : null}
        {type === "pie" ? <PieChart items={items} donut={false} /> : null}
        {type === "donut" ? <PieChart items={items} donut /> : null}
        {type === "line" ? <AreaChart items={items} /> : null}
      </div>
    </div>
  );
}
