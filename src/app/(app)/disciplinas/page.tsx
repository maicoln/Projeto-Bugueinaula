// Local: /src/app/(app)/disciplinas/page.tsx (Corrigido para Cliente)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Book } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; // Usa o cliente do navegador

type Disciplina = {
  id: number;
  nome: string;
};

export default function DisciplinasPage() {
  const [loading, setLoading] = useState(true);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchDisciplinas() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase.from('disciplinas').select('id, nome');
      
      if (error) {
        console.error('Erro ao buscar disciplinas:', error);
      } else {
        setDisciplinas(data || []);
      }
      setLoading(false);
    }
    fetchDisciplinas();
  }, [router]);

  if (loading) {
    return <div className="text-center">Carregando disciplinas...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Minhas Disciplinas</h1>
      {disciplinas.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {disciplinas.map((disciplina) => (
            <Link href={`/disciplinas/${disciplina.id}`} key={disciplina.id}>
              <div className="flex transform items-center gap-4 rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105 dark:bg-gray-800">
                <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                  <Book className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <h2 className="text-xl font-semibold">{disciplina.nome}</h2>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p>Nenhuma disciplina encontrada para sua turma.</p>
      )}
    </div>
  );
}