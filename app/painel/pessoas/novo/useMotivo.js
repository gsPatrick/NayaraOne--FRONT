"use client";

import { useCallback, useRef, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";

// Pede o motivo da exceção de duplicidade (DI-M3PE-3): mesmo padrão do useConfirm, com um campo de texto obrigatório e o tamanho mínimo que a
// API exige (parâmetro people.deduplicacao.motivo_minimo). Devolve o motivo digitado, ou null se a pessoa cancelou.
export default function useMotivo() {
  const [state, setState] = useState(null);
  const [texto, setTexto] = useState("");
  const [tocado, setTocado] = useState(false);
  const resolverRef = useRef(null);

  const pedirMotivo = useCallback((options) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setTexto("");
    setTocado(false);
    setState({ titulo: options.titulo, mensagem: options.mensagem, minimo: options.minimo || 10 });
  }), []);

  function settle(result) {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  }

  function MotivoDialog() {
    if (!state) return null;
    const curto = texto.trim().length < state.minimo;
    const erro = tocado && curto ? `Escreva pelo menos ${state.minimo} caracteres.` : undefined;
    return (
      <Modal
        open
        onClose={() => settle(null)}
        title={state.titulo}
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(null)}>Cancelar</Button>
            <Button onClick={() => (curto ? setTocado(true) : settle(texto.trim()))}>Criar com este motivo</Button>
          </>
        }
      >
        <p>{state.mensagem}</p>
        <FormField label="Motivo (por que não é a mesma pessoa)" htmlFor="p-duplicate-reason" required error={erro} helper={`Mínimo de ${state.minimo} caracteres.`}>
          <textarea id="p-duplicate-reason" rows={3} value={texto} aria-invalid={Boolean(erro)} onChange={(e) => setTexto(e.target.value)} onBlur={() => setTocado(true)} style={{ width: "100%" }} />
        </FormField>
      </Modal>
    );
  }

  return { pedirMotivo, MotivoDialog };
}
