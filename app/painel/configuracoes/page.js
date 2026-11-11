"use client";

import AppShell from "@/components/organisms/AppShell/AppShell";
import Tabs from "@/components/molecules/Tabs/Tabs";
import CobrancaTab from "./CobrancaTab";
import FinanceiroTab from "./FinanceiroTab";
import SegurancaTab from "./SegurancaTab";
import IntegracoesTab from "./IntegracoesTab";
import GovernancaTab from "./GovernancaTab";
import IntegracoesRegistroTab from "./IntegracoesRegistroTab";
import BiTab from "./BiTab";
import IaNayTab from "./IaNayTab";
import MarketingTab from "./MarketingTab";
import styles from "./page.module.css";

export default function ConfiguracoesPage() {
  return (
    <AppShell title="Configurações">
      <div className={styles.wrap}>
        <p className={styles.pageIntro}>
          Regras da empresa aplicadas a todos os usuários — apenas administradores enxergam e
          alteram esta área. Preferências pessoais (como aparência do painel) ficam em Meu perfil.
        </p>
        <Tabs
          orientation="vertical"
          items={[
            { label: "Cobrança", content: <CobrancaTab /> },
            { label: "Financeiro", content: <FinanceiroTab /> },
            { label: "Segurança", content: <SegurancaTab /> },
            { label: "Integrações", content: <IntegracoesTab /> },
            { label: "Registro de integrações", content: <IntegracoesRegistroTab /> },
            { label: "Governança", content: <GovernancaTab /> },
            { label: "IA NAY", content: <IaNayTab /> },
            { label: "Marketing", content: <MarketingTab /> },
            { label: "BI e Centro de Comando", content: <BiTab /> },
          ]}
        />
      </div>
    </AppShell>
  );
}
