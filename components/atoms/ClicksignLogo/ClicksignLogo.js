"use client";

import { useState } from "react";
import styles from "./ClicksignLogo.module.css";

// Segue o mesmo padrão do BankLogo: tenta carregar o asset real da marca e cai para um
// fallback visual (círculo com iniciais) se o arquivo ainda não existir. Cores oficiais da
// marca Clicksign (laranja #F15A29) fornecidas pelo cliente.
export default function ClicksignLogo({ size = 32 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const logoSrc = "/logos/clicksign.svg";

  if (!imgFailed) {
    const width = Math.round(size * 3.75);
    return (
      <span className={styles.logoImgWrap} style={{ height: size }} title="Clicksign">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="Clicksign"
          className={styles.logoImg}
          style={{ width, height: size }}
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={styles.logo}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      title="Clicksign"
      aria-hidden="true"
    >
      CS
    </span>
  );
}
