import AppShell from "@/components/organisms/AppShell/AppShell";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";

export default function PerfilPage() {
  return (
    <AppShell title="Meu perfil">
      <EmptyState
        icon="users"
        title="Perfil do usuário"
        description="Dados pessoais, foto e preferências de conta."
      />
    </AppShell>
  );
}
