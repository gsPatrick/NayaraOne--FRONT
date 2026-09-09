"use client";

// Aviso reutilizável para quando a API recusa uma ação por MFA_REQUIRED_NOT_ENABLED (usuário
// sem MFA configurado tentando uma ação HIGH, ex.: papel/vínculo — Caderno §3.3). A mensagem
// crua da API cita um endpoint (/users/me/mfa/setup), que não significa nada pra quem não é
// técnico — aqui trocamos por um link real pra tela onde a pessoa resolve isso.
import Alert from "@/components/molecules/Alert/Alert";
import Link from "next/link";

export default function MfaSetupRequiredNotice() {
  return (
    <Alert tone="warning" title="Configuração de segurança necessária">
      Esta ação exige verificação em duas etapas (MFA) habilitada na sua conta. Configure em{" "}
      <Link href="/painel/perfil">Meu perfil</Link> e tente de novo.
    </Alert>
  );
}
