import AuthGate from "@/components/organisms/AuthGate/AuthGate";

export const metadata = {
  title: "Entrar — Nayara One",
  description: "Acesse ou crie sua conta no Nayara One.",
};

export default function EntrarPage() {
  return <AuthGate />;
}
