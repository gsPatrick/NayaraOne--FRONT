// Renderiza um componente do app em HTML estático (react-dom/server) para os testes.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export const html = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props));
