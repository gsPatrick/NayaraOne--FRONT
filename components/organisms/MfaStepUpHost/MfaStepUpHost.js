"use client";

// Host global do step-up MFA: registra no client de API (setMfaStepUpHandler) um handler que
// abre o MfaVerifyModal quando qualquer rota responde 403 MFA_STEP_UP_REQUIRED. O client repete
// a chamada original automaticamente depois do código verificado (ver lib/api/client.js).
import { useEffect, useRef, useState } from "react";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import { setMfaStepUpHandler } from "@/lib/api/client";

const ACTION_LABELS = [
  [/\/finance\/period-closures\/approve/, "aprovar o fechamento"],
  [/\/finance\/period-closures\/return-to-open/, "devolver o período para aberto"],
  [/\/finance\/period-closures\/reopen/, "reabrir o período"],
  [/\/resolve-uncertainty/, "resolver a incerteza do pagamento"],
  [/\/submit-to-bank/, "enviar o pagamento ao banco"],
  [/\/payment-intents\/[^/]+\/execute/, "executar o pagamento"],
  [/\/owner-repasses\/[^/]+\/approve/, "aprovar o repasse"],
  [/\/commission-rule/, "publicar a regra de comissão"],
  [/\/intercompany-transfers\/[^/]+\/approve/, "aprovar a transferência intercompany"],
  [/\/intercompany-transfers/, "criar a transferência intercompany"],
  [/\/settle-partial/, "registrar a baixa parcial"],
  [/\/settle/, "liquidar o lançamento"],
  [/\/clear-manual-review/, "liberar a revisão manual"],
  [/\/bank-accounts\//, "alterar a conta bancária"],
  [/\/approvals\//, "decidir a aprovação"],
  [/\/memberships/, "alterar acessos de usuário"],
  [/\/set-password/, "redefinir a senha do usuário"],
  [/\/roles/, "alterar papéis e permissões"],
  [/\/legal\/contracts\/[^/]+\/correct/, "corrigir os dados do contrato"],
  [/\/legal\/notices\/[^/]+\/send/, "enviar a notificação"],
  [/\/legal\/inspections\/[^/]+\/sign/, "assinar a vistoria"],
  [/\/export/, "exportar os dados"],
];

function labelFor(path = "") {
  const found = ACTION_LABELS.find(([re]) => re.test(path));
  return found ? found[1] : "concluir esta ação";
}

export default function MfaStepUpHost() {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);

  useEffect(() => {
    const unregister = setMfaStepUpHandler(
      ({ path }) =>
        new Promise((resolve) => {
          resolverRef.current = resolve;
          setRequest({ label: labelFor(path) });
        })
    );
    return () => {
      unregister();
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  function finish(result) {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolve?.(result);
  }

  return (
    <MfaVerifyModal
      open={Boolean(request)}
      actionLabel={request?.label}
      onClose={() => finish(false)}
      onVerified={() => finish(true)}
    />
  );
}
