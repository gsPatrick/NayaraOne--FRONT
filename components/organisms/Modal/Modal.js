"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./Modal.module.css";

export default function Modal({ open, onClose, title, children, footer, size = "md" }) {
  const ref = useRef(null);
  // BUG REAL CRÍTICO CORRIGIDO (achado pelo cliente, 30/09/2026): este efeito tinha `onClose`
  // nas dependências, mas todo chamador passa `onClose={() => setXOpen(false)}` — uma função
  // NOVA a cada render do componente pai. Qualquer `onChange` de um campo controlado dentro do
  // modal (ex.: digitar num <Input>) causa um re-render do pai, recria `onClose`, o efeito
  // via dependência muda e reroda, chamando `ref.current.focus()` de novo — isso tira o foco
  // do campo que o usuário acabou de digitar, UM CARACTERE DE CADA VEZ. Guarda `onClose` numa
  // ref (sempre atualizada, nunca entra como dependência) para o listener de Escape usar a
  // versão mais recente sem forçar o efeito a reexecutar a cada render do pai.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onCloseRef.current?.();
    }
    document.addEventListener("keydown", onKey);
    const previousActive = document.activeElement;
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previousActive?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        className={[styles.modal, size === "lg" ? styles.modalLg : ""].filter(Boolean).join(" ")}
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
