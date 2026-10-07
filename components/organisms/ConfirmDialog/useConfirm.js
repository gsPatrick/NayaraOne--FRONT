"use client";

import { useCallback, useRef, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";

/**
 * Padrão GLOBAL de confirmação pra qualquer ação de aprovar/rejeitar/adjudicar/executar/excluir
 * no sistema. Em vez de disparar a ação direto no onClick do botão da linha/tabela, toda tela
 * chama `confirm({...})` e só segue se o usuário confirmar no modal — nunca `window.confirm`
 * nativo (sem estilo, sem padrão visual do sistema).
 *
 * Uso:
 *   const { confirm, ConfirmDialog } = useConfirm();
 *   async function handleApprove(row) {
 *     const ok = await confirm({
 *       title: "Aprovar requisição de compra?",
 *       message: `A requisição "${row.id}" será aprovada e liberada para cotação com fornecedores.`,
 *       confirmLabel: "Aprovar",
 *     });
 *     if (!ok) return;
 *     ...chama a API...
 *   }
 *   return (<>...<ConfirmDialog /></>);
 */
export default function useConfirm() {
  const [state, setState] = useState(null); // { title, message, confirmLabel, cancelLabel, tone }
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: options.title || "Confirmar ação",
        message: options.message || "Tem certeza que deseja executar esta ação?",
        confirmLabel: options.confirmLabel || "Confirmar",
        cancelLabel: options.cancelLabel || "Cancelar",
        // "danger" pra ações destrutivas/irreversíveis (rejeitar, excluir, cancelar);
        // "primary" pra ações positivas (aprovar, adjudicar, emitir).
        tone: options.tone === "danger" ? "danger" : "primary",
      });
    });
  }, []);

  function settle(result) {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  }

  function ConfirmDialog() {
    if (!state) return null;
    return (
      <Modal
        open
        onClose={() => settle(false)}
        title={state.title}
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>
              {state.cancelLabel}
            </Button>
            <Button variant={state.tone} onClick={() => settle(true)}>
              {state.confirmLabel}
            </Button>
          </>
        }
      >
        {state.message}
      </Modal>
    );
  }

  return { confirm, ConfirmDialog };
}
