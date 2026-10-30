"use client";

import { useState } from "react";
import Button from "@/components/atoms/Button/Button";
import styles from "./SupportCode.module.css";

/**
 * Código de suporte do erro (M9-D852 §3.2): mostra o traceId (o correlationId dos logs e da auditoria), o texto "Informe este código ao suporte" e o botão
 * "Copiar código". Nunca recebe nem mostra stack, SQL ou caminho. Sem traceId não desenha nada.
 */
export default function SupportCode({ traceId }) {
  const [copied, setCopied] = useState(false);
  if (!traceId) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(traceId);
      setCopied(true);
    } catch (_err) {
      // Sem permissão da área de transferência: seleciona o texto para a pessoa copiar à mão.
      const node = document.getElementById(`support-code-${traceId}`);
      if (node && window.getSelection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setCopied(false);
    }
  }

  return (
    <div className={styles.box} data-support-code="true">
      <p className={styles.hint}>Informe este código ao suporte</p>
      <div className={styles.row}>
        <code id={`support-code-${traceId}`} className={styles.code}>{traceId}</code>
        <Button size="sm" variant="secondary" onClick={copy}>{copied ? "Código copiado" : "Copiar código"}</Button>
      </div>
      <span role="status" aria-live="polite" className={styles.live}>{copied ? "Código copiado para a área de transferência." : ""}</span>
    </div>
  );
}
