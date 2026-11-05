// Foco do modal (M9-D851 §3.1): Tab e Shift+Tab ficam presos dentro do diálogo, Esc fecha e, ao fechar, o foco volta ao gatilho.
// Sem React: recebe o contêiner do diálogo e o documento; devolve a função que desfaz tudo.

export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusablesIn(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

// Pilha de diálogos abertos: com um diálogo sobre o outro (ex.: verificação em duas etapas sobre "Excluir papel"), só o de cima trata Tab e Esc.
const openStack = [];

export function activateModalFocus({ container, onClose, doc = document }) {
  const trigger = doc.activeElement;
  openStack.push(container);
  function onKeyDown(event) {
    if (openStack[openStack.length - 1] !== container) return;
    if (event.key === "Escape") {
      if (onClose) onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusablesIn(container);
    if (items.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = doc.activeElement;
    const at = items.indexOf(active);
    // Tab sempre é conduzido aqui (não só nas pontas): no Safari, com a preferência padrão, o Tab nativo pula botões e links e o foco sairia do diálogo.
    // Campo de data/hora tem várias paradas nativas (dia, mês, ano): deixa o navegador andar entre elas e só intervém nas pontas do diálogo.
    const segmented = active && active.tagName === "INPUT" && /^(date|time|datetime-local|month|week)$/.test(active.type);
    if (segmented && at !== -1 && (event.shiftKey ? at !== 0 : at !== items.length - 1)) return;
    event.preventDefault();
    if (at === -1) (event.shiftKey ? last : first).focus();
    else if (event.shiftKey) (at === 0 ? last : items[at - 1]).focus();
    else (at === items.length - 1 ? first : items[at + 1]).focus();
  }
  doc.addEventListener("keydown", onKeyDown);
  container.focus();
  return function deactivate() {
    doc.removeEventListener("keydown", onKeyDown);
    const at = openStack.lastIndexOf(container);
    if (at >= 0) openStack.splice(at, 1);
    if (trigger && typeof trigger.focus === "function") trigger.focus();
    // Gatilho desabilitado ou removido (ex.: botão "Excluir papel" em carregamento): se o diálogo de baixo continua aberto, o foco volta a ele em vez de cair no <body>.
    const below = openStack[openStack.length - 1];
    if (below && (!doc.activeElement || doc.activeElement === doc.body || !below.contains(doc.activeElement))) { const items = focusablesIn(below); (items[0] || below).focus(); }
  };
}
