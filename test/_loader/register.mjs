// Carregador de testes do Front (M9-D850/D851): permite importar, no Node puro, os módulos do app como ele os escreve —
// alias "@/", JSX (compilado com o TypeScript que o projeto já tem) e CSS Modules (viram um objeto de nomes de classe).
import { register } from "node:module";
register("./hooks.mjs", import.meta.url);
