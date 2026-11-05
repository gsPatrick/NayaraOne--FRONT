import { Children, cloneElement, isValidElement, useId } from "react";
import styles from "./FormField.module.css";

// M9-D851 §3.5 (WCAG 1.3.1, 3.3.1, 4.1.2): o campo filho recebe aria-invalid e aria-describedby apontando à mensagem de erro (ou à ajuda),
// sem cada tela precisar repetir. Vale para o filho único com id igual ao htmlFor (Input, Select, DecimalInput, textarea...).
// Filho que não é o campo (grupo de botões, mapa) não é alterado.
export default function FormField({ label, htmlFor, helper, error, required, children, className = "" }) {
  const uid = useId();
  const messageId = `${htmlFor || uid}-msg`;
  const hasMessage = Boolean(error || helper);
  let content = children;
  const only = Children.count(children) === 1 ? Children.toArray(children)[0] : null;
  const isTheField = Boolean(htmlFor) && isValidElement(only) && only.props.id === htmlFor;
  if (isTheField) {
    const describedBy = [only.props["aria-describedby"], hasMessage ? messageId : null].filter(Boolean).join(" ") || undefined;
    content = cloneElement(only, {
      "aria-describedby": describedBy,
      ...(error ? { "aria-invalid": true } : {}),
      ...(required && only.props["aria-required"] === undefined ? { "aria-required": true } : {}),
    });
  }
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      {label ? (
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
          {required ? <span className={styles.required} aria-hidden={isTheField && required ? "true" : undefined}> *</span> : null}
        </label>
      ) : null}
      {content}
      {error ? (
        <span className={styles.error} id={messageId}>{error}</span>
      ) : helper ? (
        <span className={styles.helper} id={messageId}>{helper}</span>
      ) : null}
    </div>
  );
}
