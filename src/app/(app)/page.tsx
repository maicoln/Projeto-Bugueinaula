// Ficheiro: src/app/(app)/page.tsx (NOVA VERSÃO SIMPLIFICADA)
import DashboardClientPage from './dashboard-client';

export default function DashboardPage() {
  // A página agora apenas renderiza o componente de cliente,
  // que cuidará de toda a lógica de dados e de redirecionamento.
  return <DashboardClientPage />;
}