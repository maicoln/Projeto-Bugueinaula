// Arquivo: src/app/(app)/layout.tsx (Atualizado)
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Sidebar />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* TODO: Tornar o título dinâmico com base na rota */}
        <Header title="Painel do Aluno" />
        <main className="flex-1 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          {children}
        </main>
      </div>
    </div>
  );
}