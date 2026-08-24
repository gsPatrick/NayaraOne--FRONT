"use client";

import { useState } from "react";
import { getBank, getBankLogoSrc } from "@/lib/mock/banks";
import styles from "./BankLogo.module.css";

export default function BankLogo({ bankCode, size = 32, square = false }) {
  const [imgFailed, setImgFailed] = useState(false);
  const bank = getBank(bankCode);
  const logoSrc = getBankLogoSrc(bankCode);
  const label = bank?.shortName || "PX";
  const bg = bank?.color || "var(--color-ink-muted)";
  const fg = bank?.textColor || "#FFFFFF";

  if (logoSrc && !imgFailed) {
    const aspect = square ? 1 : bank?.aspect || 1;
    const width = Math.round(size * aspect);
    const pad = Math.round(size * (aspect > 1.3 ? 0.16 : 0.12));
    return (
      <span className={styles.logoImgWrap} style={{ width, height: size, padding: pad }} title={bank?.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt={bank?.name || "Logo do banco"}
          className={styles.logoImg}
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={styles.logo}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.34 }}
      title={bank?.name || "Chave PIX"}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
