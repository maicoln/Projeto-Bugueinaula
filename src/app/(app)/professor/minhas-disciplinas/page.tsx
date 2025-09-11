'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Book, Users, Eye } from 'lucide-react'; // Ícone 'Eye' adicionado
import Link from 'next/link'; // Importa o Link para o botão

type Disciplina = {
  id: number;
  nome: string;
};

type Turma = {
  id: number;
  nome: string;
};

export default function MinhasDisciplinasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isProfessor, setIsProfessor] = useState(false);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmasLoading, setTurmasLoading] = useState(false);

  const fetchInitialData = useCallback(async () => {
    // ... (lógica de busca de dados, sem alterações)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('tipo_usuario').eq('id', user.id).single();
    if (profile?.tipo_usuario !== 'PROFESSOR') {
      router.push('/');
      return;
    }
    setIsProfessor(true);
    const { data: disciplinasData } = await supabase.from('disciplinas').select('id, nome');
    if (disciplinasData) {
      setDisciplinas(disciplinasData);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleSelectDisciplina = async (disciplina: Disciplina) => {
    setSelectedDisciplina(disciplina);
    setTurmasLoading(true);
    setTurmas([]);

    const { data: turmasData } = await supabase
      .from('turmas')
      .select('id, nome, disciplinas_turmas!inner(disciplina_id)')
      .eq('disciplinas_turmas.disciplina_id', disciplina.id);
    
    if (turmasData) {
      setTurmas(turmasData);
    }
    setTurmasLoading(false);
  };

  if (loading) {
    return <div className="text-center">A verificar permissões...</div>;
  }
  if (!isProfessor) {
    return null;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Minhas Disciplinas e Turmas</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Selecione uma disciplina para gerir as turmas ou visualizar o conteúdo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Coluna de Disciplinas */}
        <div className="flex flex-col gap-3">
          {disciplinas.length > 0 ? (
            disciplinas.map(d => (
              <div
                key={d.id}
                className={`flex w-full flex-col gap-2 rounded-lg p-4 text-left transition-all
                  ${selectedDisciplina?.id === d.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800'
                  }`}
              >
                <button onClick={() => handleSelectDisciplina(d)} className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Book size={20} />
                    <span className="font-semibold">{d.nome}</span>
                  </div>
                </button>
                {/* Botão de Visualização Adicionado */}
                <div className="mt-2 border-t border-gray-200/20 pt-2">
                  <Link href={`/disciplinas/${d.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-md p-2 text-sm transition-colors bg-white/10 hover:bg-white/20"
                  >
                    <Eye size={16} />
                    Visualizar Conteúdo
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p>Nenhuma disciplina associada a si.</p>
          )}
        </div>

        {/* Coluna de Turmas */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-xl font-bold">
            {selectedDisciplina ? `Turmas de ${selectedDisciplina.nome}` : 'Selecione uma Disciplina'}
          </h2>
          {turmasLoading ? (
            <p>A carregar turmas...</p>
          ) : (
            selectedDisciplina && (
              turmas.length > 0 ? (
                <ul className="space-y-2">
                  {turmas.map(t => (
                    <li key={t.id} className="flex items-center gap-3 rounded-md bg-gray-100 p-3 dark:bg-gray-800">
                      <Users size={18} className="text-gray-500" />
                      <span>{t.nome}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhuma turma encontrada para esta disciplina.</p>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}

