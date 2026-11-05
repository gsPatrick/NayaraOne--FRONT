"use client";

import { useEffect, useState } from "react";

/**
 * Região viva PERSISTENTE (role=status, aria-live=polite) do padrão de estados (M9-D851). Montada vazia logo depois da hidratação e só
 * depois recebe o texto: região inserida junto com o texto não é anunciada pelos leitores de tela. O atraso curto também agrupa a digitação
 * da busca (anuncia só a contagem final). Fora do HTML do servidor: o primeiro render não ganha um role=status vazio.
 */
export default function LiveAnnouncer({ text, delay = 350 }) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState("");
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return undefined;
    const timer = setTimeout(() => setShown(text || ""), delay);
    return () => clearTimeout(timer);
  }, [mounted, text, delay]);
  if (!mounted) return null;
  return <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-async-announcer="">{shown}</div>;
}
