"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./Modal.module.css";

export default function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    const previousActive = document.activeElement;
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previousActive?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.close} onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}
