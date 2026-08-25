import { redirect } from "next/navigation";

// Vitrine interna de componentes — não é uma tela do produto. Fica fora do ar por padrão,
// redirecionando para o login como qualquer outra rota não reconhecida.
export default function DesignSystemPage() {
  redirect("/entrar");
}
