"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import AuthVisual from "@/components/molecules/AuthVisual/AuthVisual";
import GateChoice from "@/components/molecules/GateChoice/GateChoice";
import LoginForm from "@/components/molecules/LoginForm/LoginForm";
import ClientAccessForm from "@/components/molecules/ClientAccessForm/ClientAccessForm";
import styles from "./AuthGate.module.css";

export default function AuthGate() {
  const [stage, setStage] = useState("gate");
  const [mode, setMode] = useState("staff");

  const openStaff = () => {
    setMode("staff");
    setStage("form");
  };
  const openClient = () => {
    setMode("client");
    setStage("form");
  };
  const backToGate = () => setStage("gate");

  const isForm = stage === "form";

  // M9-D851 (WCAG 2.4.3): a escolha de perfil e o formulário trocam de lugar na mesma página; o foco vai ao 1º campo (ou 1ª opção) da nova tela
  // em vez de ficar no botão que sumiu (o leitor de tela diria "nada focado"). Não roda na abertura da página.
  const innerRef = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const alvo = innerRef.current && innerRef.current.querySelector("input:not([type=hidden]), button");
    if (alvo) alvo.focus();
  }, [stage, mode]);

  return (
    <div className={[styles.shell, isForm ? styles.formStage : ""].filter(Boolean).join(" ")}>
      <div className={styles.visualPane}>
        <AuthVisual />
      </div>
      <main className={styles.panel}>
        {isForm ? (
          <button type="button" className={styles.backBtn} onClick={backToGate}>
            <Icon name="chevronRight" size={16} className={styles.backBtnIcon} />
            Voltar
          </button>
        ) : null}
        <div className={styles.panelInner} ref={innerRef}>
          {stage === "gate" ? (
            <GateChoice onSelectStaff={openStaff} onSelectClient={openClient} />
          ) : mode === "staff" ? (
            <LoginForm />
          ) : (
            <ClientAccessForm />
          )}
        </div>
      </main>
    </div>
  );
}
