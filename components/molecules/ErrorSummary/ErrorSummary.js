"use client";

import { forwardRef } from "react";
import styles from "./ErrorSummary.module.css";

/**
 * Resumo de erros no topo do formulário (M9-D851 §3.5, WCAG 3.3.1): role="alert", recebe o foco quando a pessoa tenta avançar/enviar com erro
 * (o pai chama ref.current.focus()), lista cada campo com a mensagem e leva o foco ao campo ao ativar o item.
 * items: [{ id, label, message }]; id = id do campo na tela.
 */
const ErrorSummary = forwardRef(function ErrorSummary({ items, title }, ref) {
  if (!items || !items.length) return null;
  const heading = title || (items.length === 1 ? "Há 1 campo para corrigir" : `Há ${items.length} campos para corrigir`);
  function goTo(id) {
    const el = typeof document !== "undefined" ? document.getElementById(id) : null;
    if (el) { el.scrollIntoView({ block: "center" }); el.focus(); }
  }
  return (
    <div className={styles.summary} role="alert" tabIndex={-1} ref={ref} data-error-summary>
      <p className={styles.title}>{heading}</p>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={styles.link} onClick={(e) => { e.preventDefault(); goTo(item.id); }}>
              {item.label}
            </a>
            <span>: {item.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default ErrorSummary;
