"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { hasAnyPermission } from "@/lib/rbac/permissions";
import styles from "./Button.module.css";

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  href,
  className = "",
  children,
  requires,
  ...rest
}) {
  // `requires` (R8): código de permissão (ou lista — basta uma) que a ação exige. Sem ela o
  // botão fica desabilitado com explicação, em vez de deixar o usuário clicar e levar 403. A
  // API continua sendo a fonte de verdade. A checagem roda após montar (a sessão vive no
  // navegador), então o servidor e o primeiro render coincidem.
  const [allowed, setAllowed] = useState(true);
  const requiresKey = Array.isArray(requires) ? requires.join("|") : requires || "";
  useEffect(() => {
    setAllowed(!requiresKey || hasAnyPermission(requiresKey.split("|")));
  }, [requiresKey]);
  if (!allowed) {
    disabled = true;
    rest.title = "Seu perfil não tem permissão para esta ação.";
  }

  const classes = [styles.btn, styles[variant], styles[size], loading ? styles.loading : "", className]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-disabled={disabled || loading}
        {...rest}
        {...(!allowed ? { tabIndex: -1, onClick: (event) => event.preventDefault() } : {})}
      >
        <span className={styles.label}>{children}</span>
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={classes}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
