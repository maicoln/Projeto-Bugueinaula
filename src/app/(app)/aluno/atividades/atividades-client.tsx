// Ficheiro: src/app/(app)/aluno/atividades/atividades-client.tsx (VERSÃO CORRIGIDA)
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, Clock, MessageSquare, Star, Filter } from 'lucide-react';

// <<< ALTERAÇÃO: Tipos para lidar com a relação da disciplina de forma segura >>>
type DisciplinaRef = { id: number; nome: string };
type DisciplinaRelation = DisciplinaRef | DisciplinaRef[] | null;

type AtividadeComSubmissao = {
  id: number;
  titulo: string;
  bimestre: number;
  semana: number;
  disciplinas: DisciplinaRelation; // Usa o novo tipo seguro
  atividades_submissoes: {
    id: number;
    created_at: string;
    nota: number | null;
    feedback_texto: string | null;
  }[];
};

type Tab = 'pendentes' | 'enviadas';

// <<< NOVO: Helper para extrair o objeto da disciplina de forma segura >>>
function getDisciplina(rel: DisciplinaRelation): DisciplinaRef | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

export default function AtividadesClientPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [atividades, setAtividades] = useState<AtividadeComSubmissao[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('pendentes');
  const [selectedDisciplina, setSelectedDisciplina] = useState('todas');
  const [selectedBimestre, setSelectedBimestre] = useState('todos');

  const fetchAtividades = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('turma_id').eq('id', user.id).single();
    if (!profile || !profile.turma_id) {
      console.error("Não foi possível encontrar a turma do aluno.");
      setAtividades([]); setLoading(false); return;
    }

    const { data: disciplinasDaTurma } = await supabase.from('disciplinas_turmas').select('disciplina_id').eq('turma_id', profile.turma_id);
    const disciplinaIds = disciplinasDaTurma?.map(d => d.disciplina_id) || [];
    if (disciplinaIds.length === 0) {
      setAtividades([]); setLoading(false); return;
    }

    const { data, error } = await supabase
      .from('conteudos')
      .select(`
        id, titulo, bimestre, semana,
        disciplinas ( id, nome ),
        atividades_submissoes!left (id, created_at, nota, feedback_texto)
      `)
      .in('disciplina_id', disciplinaIds)
      .eq('tipo', 'EXERCICIO')
      .eq('atividades_submissoes.aluno_id', user.id)
      .order('bimestre', { ascending: true })
      .order('semana', { ascending: true });

    if (error) {
      console.error("Erro ao buscar atividades:", error);
    } else if (data) {
      setAtividades(data as unknown as AtividadeComSubmissao[]);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchAtividades();
  }, [fetchAtividades]);

  // <<< ALTERAÇÃO: Usa a função getDisciplina para popular o filtro >>>
  const disciplinasDisponiveis = useMemo(() => {
    const disciplinasMap = new Map<number, string>();
    atividades.forEach(ativ => {
      const disciplina = getDisciplina(ativ.disciplinas);
      if (disciplina) {
        disciplinasMap.set(disciplina.id, disciplina.nome);
      }
    });
    return Array.from(disciplinasMap.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [atividades]);

  // <<< ALTERAÇÃO: Usa a função getDisciplina na lógica de filtragem >>>
  const { pendentes, enviadas } = useMemo(() => {
    const atividadesFiltradas = atividades.filter(ativ => {
      const disciplina = getDisciplina(ativ.disciplinas);
      const disciplinaMatch = selectedDisciplina === 'todas' || String(disciplina?.id) === selectedDisciplina;
      const bimestreMatch = selectedBimestre === 'todos' || String(ativ.bimestre) === selectedBimestre;
      return disciplinaMatch && bimestreMatch;
    });
    const pendentes: AtividadeComSubmissao[] = [];
    const enviadas: AtividadeComSubmissao[] = [];
    atividadesFiltradas.forEach(ativ => {
      if (ativ.atividades_submissoes.length > 0) {
        enviadas.push(ativ);
      } else {
        pendentes.push(ativ);
      }
    });
    return { pendentes, enviadas };
  }, [atividades, selectedDisciplina, selectedBimestre]);
  
  const renderLista = (lista: AtividadeComSubmissao[]) => {
    if (lista.length === 0) {
      return <p className="mt-6 text-center text-gray-500">Nenhuma atividade encontrada com os filtros selecionados.</p>
    }
    return (
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map(ativ => {
          const submissao = ativ.atividades_submissoes[0];
          // <<< ALTERAÇÃO: Usa a função getDisciplina para exibição e link >>>
          const disciplina = getDisciplina(ativ.disciplinas);
          return (
            <div key={ativ.id} className="flex flex-col rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
              <div className="flex-grow">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {disciplina?.nome} - Bimestre {ativ.bimestre} / Semana {ativ.semana}
                </p>
                <h3 className="mt-1 font-bold text-gray-800 dark:text-gray-100">{ativ.titulo}</h3>
              </div>
              {submissao ? (
                <div className="mt-4 space-y-3 border-t pt-3 dark:border-gray-600">
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <CheckCircle size={16} className="mr-2" />
                    <span>Enviado em: {new Date(submissao.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {submissao.nota !== null ? (
                    <>
                      <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                         <Star size={16} className="mr-2 text-yellow-500" />
                         <span className="font-semibold">Nota: {submissao.nota.toLocaleString('pt-BR')}</span>
                      </div>
                      {submissao.feedback_texto && (<div className="flex items-start text-sm text-gray-700 dark:text-gray-300"><MessageSquare size={16} className="mr-2 mt-0.5 flex-shrink-0" /><p className="whitespace-pre-wrap italic">{`"${submissao.feedback_texto}"`}</p></div>)}
                    </>
                  ) : (<div className="flex items-center text-sm text-gray-500 dark:text-gray-400"><Clock size={16} className="mr-2" /><span>Aguardando avaliação</span></div>)}
                </div>
              ) : (
                <div className="mt-4 border-t pt-3 dark:border-gray-600">
                   <Link href={`/disciplinas/${disciplina?.id}/semana/${ativ.semana}`} className="inline-block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-700">Fazer Atividade</Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    );
  };

  if (loading) {
    return (<div className="p-6 text-center text-gray-500"><p>A carregar as suas atividades...</p></div>);
  }

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-6"><h1 className="text-3xl font-bold tracking-tight">Minhas Atividades</h1><p className="mt-1 text-gray-500 dark:text-gray-400">Acompanhe aqui as suas atividades pendentes e as suas notas.</p></div>
      <div className="mb-6 rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-2"><Filter size={16} className="text-gray-600 dark:text-gray-400" /><h3 className="font-semibold text-gray-700 dark:text-gray-200">Filtros</h3></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label htmlFor="disciplina-filter" className="sr-only">Filtrar por Disciplina</label><select id="disciplina-filter" value={selectedDisciplina} onChange={(e) => setSelectedDisciplina(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="todas">Todas as Disciplinas</option>{disciplinasDisponiveis.map(d => (<option key={d.id} value={d.id}>{d.nome}</option>))}</select></div>
            <div><label htmlFor="bimestre-filter" className="sr-only">Filtrar por Bimestre</label><select id="bimestre-filter" value={selectedBimestre} onChange={(e) => setSelectedBimestre(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="todos">Todos os Bimestres</option><option value="1">1º Bimestre</option><option value="2">2º Bimestre</option><option value="3">3º Bimestre</option><option value="4">4º Bimestre</option></select></div>
        </div>
      </div>
      <div>
        <div className="border-b border-gray-200 dark:border-gray-700"><nav className="-mb-px flex space-x-6" aria-label="Tabs"><button onClick={() => setActiveTab('pendentes')} className={`${activeTab === 'pendentes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition`}>Pendentes ({pendentes.length})</button><button onClick={() => setActiveTab('enviadas')} className={`${activeTab === 'enviadas' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition`}>Enviadas ({enviadas.length})</button></nav></div>
      </div>
      <div>
        {activeTab === 'pendentes' ? renderLista(pendentes) : renderLista(enviadas)}
      </div>
    </div>
  );
}