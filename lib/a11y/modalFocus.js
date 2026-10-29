// Foco do modal (M9-D851 §3.1): Tab e Shift+Tab ficam presos dentro do diálogo, Esc fecha e, ao fechar, o foco volta ao gatilho.
// Sem React: recebe o contêiner do diálogo e o documento; devolve a função que desfaz tudo.

export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusablesIn(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

export function activateModalFocus({ container, onClose, doc = document }) {
  const trigger = doc.activeElement;
  function onKeyDown(event) {
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
    const inside = container.contains(active) && active !== container;
    if (event.shiftKey && (!inside || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!inside || active === last)) {
      event.preventDefault();
      first.focus();
    }
  }
  doc.addEventListener("keydown", onKeyDown);
  container.focus();
  return function deactivate() {
    doc.removeEventListener("keydown", onKeyDown);
    if (trigger && typeof trigger.focus === "function") trigger.focus();
  };
}
