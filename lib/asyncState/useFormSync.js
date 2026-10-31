"use client";

// Formulário alimentado por dado carregado (M9-D940): o dado que chega (do cache na revisita e depois o fresco) só reinicia o
// formulário se o usuário ainda não mexeu nele. Depois de gravar, `forceNext()` faz a próxima carga valer mesmo com o formulário alterado.
import { useEffect, useRef } from "react";
import { canResetForm } from "./formSync";

export function useFormSync({ data, build, form, apply }) {
  const buildRef = useRef(build);
  const applyRef = useRef(apply);
  const formRef = useRef(form);
  buildRef.current = build;
  applyRef.current = apply;
  formRef.current = form;
  const baseRef = useRef(null);
  const forceRef = useRef(false);
  useEffect(() => {
    if (data === null || data === undefined) return;
    if (!forceRef.current && !canResetForm(formRef.current, baseRef.current)) return;
    const next = buildRef.current(data);
    baseRef.current = next;
    forceRef.current = false;
    applyRef.current(next);
  }, [data]);
  return { forceNext: () => { forceRef.current = true; } };
}
