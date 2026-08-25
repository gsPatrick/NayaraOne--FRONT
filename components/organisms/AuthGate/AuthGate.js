"use client";

import { useState } from "react";
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

  return (
    <div className={[styles.shell, isForm ? styles.formStage : ""].filter(Boolean).join(" ")}>
      <div className={styles.visualPane}>
        <AuthVisual />
      </div>
      <div className={styles.panel}>
        {isForm ? (
          <button type="button" className={styles.backBtn} onClick={backToGate}>
            <Icon name="chevronRight" size={16} className={styles.backBtnIcon} />
            Voltar
          </button>
        ) : null}
        <div className={styles.panelInner}>
          {stage === "gate" ? (
            <GateChoice onSelectStaff={openStaff} onSelectClient={openClient} />
          ) : mode === "staff" ? (
            <LoginForm />
          ) : (
            <ClientAccessForm />
          )}
        </div>
      </div>
    </div>
  );
}
