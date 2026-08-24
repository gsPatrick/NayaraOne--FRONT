"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import { useCompany } from "@/lib/context/CompanyContext";
import styles from "./CompanySwitchOverlay.module.css";

export default function CompanySwitchOverlay() {
  const { switching, switchingToCompany } = useCompany();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimeoutRef = useRef(null);
  const lastCompanyRef = useRef(null);

  if (switchingToCompany) lastCompanyRef.current = switchingToCompany;

  useEffect(() => {
    if (switching) {
      if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
      setClosing(false);
      setMounted(true);
    } else if (mounted) {
      setClosing(true);
      closeTimeoutRef.current = window.setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 500);
    }
    return () => {
      if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switching]);

  if (!mounted) return null;

  return (
    <div className={[styles.overlay, closing ? styles.closing : ""].filter(Boolean).join(" ")} role="status" aria-live="polite">
      <span className={styles.mark}>
        <Icon name="building" size={30} />
      </span>
      <p className={styles.label}>Trocando de empresa</p>
      <p className={styles.companyName}>{lastCompanyRef.current?.name || "..."}</p>
    </div>
  );
}
