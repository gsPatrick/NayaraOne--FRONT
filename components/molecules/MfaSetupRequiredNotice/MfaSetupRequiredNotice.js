"use client";

// Aviso reutilizável para quando a API recusa uma ação por MFA_REQUIRED_NOT_ENABLED (usuário
// sem MFA configurado tentando uma ação HIGH, ex.: papel/vínculo — Caderno §3.3). A mensagem
// crua da API cita um endpoint (/users/me/mfa/setup), que não significa nada pra quem não é
// técnico — aqui trocamos por um link real pra tela onde a pessoa resolve isso.
// M9-D851: ao aparecer, o aviso recebe o foco e é anunciado (role=alert); traz o link "Ir para Meu perfil"
// e "Fechar aviso", alcançáveis por teclado. Ao fechar, o foco volta ao botão que disparou a ação.
import { useEffect, useRef } from "react";
import Link from "next/link";
import Alert from "@/components/molecules/Alert/Alert";
import Button from "@/components/atoms/Button/Button";
import { MFA_SETUP_NOTICE } from "@/lib/errors/mfaSetup";
import styles from "./MfaSetupRequiredNotice.module.css";

// Último controle focado fora de diálogos: o botão da ação fica desabilitado (carregando) enquanto a API responde e o foco cai no <body>;
// é para ele que "Fechar aviso" devolve o foco.
let lastTrigger = null;
if (typeof document !== "undefined") {
  document.addEventListener("focusin", (e) => {
    const el = e.target;
    if (el && el !== document.body && !el.closest("[role=dialog]") && !el.closest("[data-mfa-setup-notice]")) lastTrigger = el;
  }, true);
}

function usable(el) {
  return el && el !== document.body && el.isConnected && !el.closest("[role=dialog]") ? el : null;
}

export default function MfaSetupRequiredNotice({ onDismiss, returnFocusTo }) {
  const ref = useRef(null);
  const origin = useRef(null);
  useEffect(() => {
    origin.current = usable(document.activeElement) || usable(lastTrigger);
    // Depois do quadro atual: um modal que fecha junto devolve o foco ao próprio gatilho; o aviso vem por último.
    const frame = requestAnimationFrame(() => { if (ref.current) ref.current.focus(); });
    return () => cancelAnimationFrame(frame);
  }, []);

  function dismiss() {
    const target = usable(returnFocusTo && returnFocusTo.current) || usable(origin.current);
    if (onDismiss) onDismiss();
    requestAnimationFrame(() => {
      const el = (target && target.isConnected ? target : null) || document.querySelector("main h1, h1");
      if (el) { if (!el.hasAttribute("tabindex") && el.tagName === "H1") el.setAttribute("tabindex", "-1"); el.focus(); }
    });
  }

  return (
    <div ref={ref} tabIndex={-1} className={styles.wrap} data-mfa-setup-notice="" aria-labelledby="mfa-setup-notice-title">
      <Alert tone="warning" title={<span id="mfa-setup-notice-title">{MFA_SETUP_NOTICE.title}</span>}>
        {MFA_SETUP_NOTICE.text}
      </Alert>
      <div className={styles.actions}>
        <Link className={styles.link} href={MFA_SETUP_NOTICE.href}>{MFA_SETUP_NOTICE.linkLabel}</Link>
        {onDismiss ? <Button size="sm" variant="secondary" onClick={dismiss}>{MFA_SETUP_NOTICE.dismissLabel}</Button> : null}
      </div>
    </div>
  );
}
