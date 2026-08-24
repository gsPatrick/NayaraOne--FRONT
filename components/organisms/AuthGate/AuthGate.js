"use client";

import { useState } from "react";
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
        <div className={styles.panelInner}>
          {stage === "gate" ? (
            <GateChoice onSelectStaff={openStaff} onSelectClient={openClient} />
          ) : mode === "staff" ? (
            <LoginForm onBack={backToGate} />
          ) : (
            <ClientAccessForm onBack={backToGate} />
          )}
        </div>
      </div>
    </div>
  );
}
