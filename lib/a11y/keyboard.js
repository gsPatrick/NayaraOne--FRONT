// Linha ou cartão clicável que também funciona só com teclado (M9-D851 §3.1): Tab chega nele, Enter e Espaço ativam.
// Uso: <div className={...} {...activatable(() => router.push(url))}>.
export function activatable(onActivate, role = "link") {
  return {
    role,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget) return; // Enter dentro de um botão interno não ativa a linha
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate(event);
      }
    },
  };
}
