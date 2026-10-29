"use client";

import { useCallback, useState } from "react";
import { postCopyEvent } from "@/lib/api/dlp";
import { copyProtected, handleClipboardEvent, renderModel } from "@/lib/dlp/protectedValue.logic";
import styles from "./ProtectedValue.module.css";

// Valor HIGH ou RESTRICTED na tela (M9-D825 §3.2). RESTRICTED: sem seleção, sem copy/cut/arrastar/menu, sem botão Copiar, e a tentativa mostra
// "Este dado não pode ser copiado" e grava a negação. HIGH: botão Copiar que registra antes de copiar (falhou o registro, cancela a cópia).
// LOW e MEDIUM: texto simples. `copyButton={false}` esconde o botão (ex.: dentro de link); o atalho segue registrando. `children` (opcional) é o texto exibido quando difere do valor (ex.: máscara de exibição).
export default function ProtectedValue({ classification = "HIGH", resourceType, resourceId, field, value, children, className = "", copyButton = true }) {
  const [message, setMessage] = useState("");
  const shown = children !== undefined && children !== null ? String(children) : value;
  const model = renderModel({ classification, value: shown });
  const target = { resourceType, resourceId: resourceId === undefined || resourceId === null ? "" : String(resourceId), field };

  const run = useCallback(async () => {
    const result = await copyProtected({
      classification,
      text: String(value ?? ""),
      target,
      postCopyEvent,
      writeClipboard: (text) => navigator.clipboard.writeText(text),
    });
    setMessage(result.copied ? (result.recorded ? "Copiado e registrado" : "Copiado") : result.message);
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classification, value, resourceType, resourceId, field]);

  const onClipboard = (event) => handleClipboardEvent(event, classification, {
    onDenied: () => { setMessage("Este dado não pode ser copiado"); postCopyEvent({ ...target, outcome: "DENIED" }).catch(() => {}); },
    onRecordedCopy: () => { run(); },
  });

  if (!model.dlpClass) return <span className={className}>{shown}</span>;

  return (
    <span
      className={[styles.wrap, model.selectable ? "" : styles.locked, className].filter(Boolean).join(" ")}
      data-dlp-class={model.dlpClass}
      data-dlp-field={field}
      onCopy={onClipboard}
      onCut={onClipboard}
      onDragStart={onClipboard}
      onContextMenu={model.mode === "DENY" ? onClipboard : undefined}
    >
      {model.mode === "DENY" ? (
        <span className={styles.drawn} data-dlp-text={model.visualText} role="text" aria-label={model.visualText} />
      ) : (
        <span>{model.domText}</span>
      )}
      {model.showCopyButton && copyButton ? (
        <button type="button" className={styles.copy} onClick={run} aria-label={`Copiar ${field}`}>Copiar</button>
      ) : null}
      {message ? <span className={styles.message} role="status">{message}</span> : null}
    </span>
  );
}
