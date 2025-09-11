'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Book, ChevronRight } from 'lucide-react'; // Ícone de seta adicionado
import { supabase } from '@/lib/supabaseClient';

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
        // Alterado de 'grid' para 'flex flex-col' para criar uma lista vertical
        <div className="flex flex-col gap-4">
          {disciplinas.map((disciplina) => (
            <Link href={`/disciplinas/${disciplina.id}`} key={disciplina.id}>
              {/* O card agora se estica horizontalmente e justifica o conteúdo */}
              <div className="flex w-full transform items-center justify-between rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-[1.02] dark:bg-gray-800">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                    <Book className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  {/* O nome da disciplina agora tem espaço para crescer */}
                  <h2 className="text-xl font-semibold">{disciplina.nome}</h2>
                </div>
                {/* Ícone de seta para indicar clicabilidade */}
                <ChevronRight className="h-6 w-6 text-gray-400" />
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
