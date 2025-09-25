// Ficheiro: src/app/(app)/disciplinas/[disciplinaId]/disciplina-client.tsx (VERSÃO FINAL SEM 'ANY')
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, BookOpen } from 'lucide-react';

// Tipos
type SemanaData = {
  semana: number;
  titulo: string;
  totalExercicios: number;
  concluidos: number;
};
export type BimestreData = {
  semanas: Record<number, SemanaData>;
};
type DadosDosBimestres = Record<number, BimestreData>;

// <<< NOVO: Tipo manual para o resultado da query para evitar 'any' >>>
type ConteudosQueryResult = {
  id: number;
  bimestre: number;
  semana: number;
  tipo: 'MATERIAL_AULA' | 'EXEMPLO' | 'EXERCICIO';
  titulo: string;
  atividades_submissoes: {
    id: number;
  }[];
};

interface DisciplinaClientPageProps {
  disciplinaId: string;
}

export default function DisciplinaClientPage({ disciplinaId }: DisciplinaClientPageProps) {
  const [loading, setLoading] = useState(true);
  const [nomeDisciplina, setNomeDisciplina] = useState('');
  const [dadosDosBimestres, setDadosDosBimestres] = useState<DadosDosBimestres>({});
  
  const [activeBimester, setActiveBimester] = useState<number>(1);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const id = parseInt(disciplinaId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // 1. Buscar o nome da disciplina
    const { data: disciplina } = await supabase.from('disciplinas').select('nome').eq('id', id).single();
    if (disciplina) {
      setNomeDisciplina(disciplina.nome);
    } else {
      setLoading(false);
      return;
    }

    // 2. Buscar todos os conteúdos e submissões
    const { data: conteudosData, error } = await supabase
      .from('conteudos')
      .select(`id, bimestre, semana, tipo, titulo, atividades_submissoes!left(id)`)
      .eq('disciplina_id', id)
      .eq('atividades_submissoes.aluno_id', user.id)
      .order('tipo', { ascending: true });

    if (error) {
      console.error("Erro ao buscar conteúdos:", error);
      setLoading(false);
      return;
    }
    
    // <<< CORREÇÃO: Usar o tipo específico em vez de 'any' >>>
    const conteudosComSubmissoes = conteudosData as ConteudosQueryResult[] | null;

    // 3. Processar e agrupar os dados
    const bimestres: Record<number, BimestreData> = { 1: { semanas: {} }, 2: { semanas: {} }, 3: { semanas: {} }, 4: { semanas: {} } };
    if (conteudosComSubmissoes) {
      for (const conteudo of conteudosComSubmissoes) {
        const { bimestre, semana, tipo, titulo } = conteudo;
        if (typeof bimestre !== 'number' || typeof semana !== 'number') continue;

        if (!bimestres[bimestre]) bimestres[bimestre] = { semanas: {} };
        if (!bimestres[bimestre].semanas[semana]) {
          bimestres[bimestre].semanas[semana] = { semana, titulo: '', totalExercicios: 0, concluidos: 0 };
        }

        if (!bimestres[bimestre].semanas[semana].titulo || tipo === 'MATERIAL_AULA') {
          bimestres[bimestre].semanas[semana].titulo = titulo;
        }

        if (tipo === 'EXERCICIO') {
          bimestres[bimestre].semanas[semana].totalExercicios++;
          if (conteudo.atividades_submissoes && conteudo.atividades_submissoes.length > 0) {
            bimestres[bimestre].semanas[semana].concluidos++;
          }
        }
      }
    }
    setDadosDosBimestres(bimestres);
    setLoading(false);

  }, [disciplinaId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-6 text-center">A carregar dados da disciplina...</div>;
  }

  const bimestres = [1, 2, 3, 4];

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-8">
        <Link href="/disciplinas" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
          <ArrowLeft size={16} />
          Voltar para Disciplinas
        </Link>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{nomeDisciplina}</h1>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Bimestres">
          {bimestres.map(bim => (
            <button key={bim} onClick={() => setActiveBimester(bim)} className={`${activeBimester === bim ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'} whitespace-nowrap border-b-2 px-1 py-3 text-base font-semibold transition`}>
              {bim}º Bimestre
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {(() => {
          const semanasDoBimestre = dadosDosBimestres[activeBimester]?.semanas;
          const semanasArray = semanasDoBimestre ? Object.values(semanasDoBimestre).sort((a, b) => a.semana - b.semana) : [];
          if (semanasArray.length === 0) {
            return <p className="text-center text-gray-500 py-8">Nenhum conteúdo cadastrado para este bimestre.</p>;
          }
          return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {semanasArray.map(({ semana, titulo, totalExercicios, concluidos }) => (
                <Link key={semana} href={`/disciplinas/${disciplinaId}/semana/${semana}`} className="group block">
                  <div className="flex h-full flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition-all duration-300 hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"><BookOpen size={20} /></div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Semana {semana}</h3>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{titulo}</p>
                    </div>
                    <div className="mt-4">
                      {totalExercicios > 0 ? (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600"><div className="h-2 rounded-full bg-green-500" style={{ width: `${(concluidos / totalExercicios) * 100}%` }}></div></div>
                          <span className={`font-semibold flex-shrink-0 ${concluidos === totalExercicios ? 'text-green-600' : 'text-gray-500'}`}>{concluidos}/{totalExercicios}</span>
                        </div>
                      ) : (<p className="text-sm text-gray-400">Nenhum exercício nesta semana.</p>)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}