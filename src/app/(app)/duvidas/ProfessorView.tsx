'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useSWR from 'swr';
import Link from 'next/link';
import { PlusCircle, Search, MessageSquare, Check, Loader2 } from 'lucide-react';

// --- Tipos ---
export type ProfileInfo = { id: string; nome: string; tipo_usuario: string };
type EscolaInfo = { id: number; nome: string };
type TurmaInfo = { id: number; nome: string };

type Duvida = {
  id: number;
  titulo: string;
  created_at: string;
  resolvida: boolean;
  is_anonymous: boolean;
  disciplina_id: number | null;
  profile: { nome: string } | null;
  respostas_count: number;
};

type RawDuvida = Omit<Duvida, 'profile' | 'respostas_count'> & {
  profiles: { nome: string }[] | null;
  respostas_duvidas: { count: number }[];
};

type ProfessorViewProps = { user: ProfileInfo };

// --- Componente ---
export function ProfessorView({ user }: ProfessorViewProps) {
  const [escolas, setEscolas] = useState<EscolaInfo[]>([]);
  const [turmas, setTurmas] = useState<TurmaInfo[]>([]);
  const [selectedEscola, setSelectedEscola] = useState<number | 'todas'>('todas');
  const [selectedTurma, setSelectedTurma] = useState<number | 'todas'>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todas' | 'nao_resolvidas' | 'resolvidas' | 'gerais'>('todas');

  // --- Buscar escolas ---
  useEffect(() => {
    async function fetchEscolas() {
      try {
        const { data, error } = await supabase
          .from('professores_escolas')
          .select('escolas(id, nome)')
          .eq('professor_id', user.id);

        if (error) throw error;

        const escolasList = data?.flatMap(item => item.escolas || []) ?? [];
        setEscolas(escolasList);
      } catch (err) {
        console.error('Erro ao buscar escolas:', err);
      }
    }
    void fetchEscolas();
  }, [user.id]);

  // --- Buscar turmas ao selecionar escola ---
  useEffect(() => {
    async function fetchTurmas() {
      if (selectedEscola === 'todas') {
        setTurmas([]);
        setSelectedTurma('todas');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('turmas')
          .select('id, nome')
          .eq('escola_id', selectedEscola);

        if (error) throw error;
        setTurmas(data ?? []);
      } catch (err) {
        console.error('Erro ao buscar turmas:', err);
      }
    }
    void fetchTurmas();
  }, [selectedEscola]);

  // --- Buscar dúvidas com SWR ---
  const fetchDuvidas = async () => {
    let query = supabase
      .from('duvidas')
      .select('id, titulo, created_at, resolvida, is_anonymous, disciplina_id, profiles(nome), respostas_duvidas(count)')
      .order('created_at', { ascending: false });

    // Filtrar por turma ou escola
    if (selectedTurma !== 'todas') query = query.eq('turma_id', selectedTurma);
    else if (selectedEscola !== 'todas') {
      const { data: turmasData } = await supabase.from('turmas').select('id').eq('escola_id', selectedEscola);
      const turmaIds = turmasData?.map(t => t.id) ?? [];
      if (turmaIds.length) query = query.in('turma_id', turmaIds);
    }

    // Filtro de busca
    if (searchTerm.trim().length > 2) {
      query = query.textSearch('fts', `'${searchTerm.trim()}'`, { type: 'websearch', config: 'portuguese' });
    }

    // Filtro de resolvida/gerais
    if (activeFilter === 'nao_resolvidas') query = query.eq('resolvida', false);
    else if (activeFilter === 'resolvidas') query = query.eq('resolvida', true);
    else if (activeFilter === 'gerais') query = query.is('disciplina_id', null);

    const { data, error } = await query;
    if (error) throw error;

    return (data as RawDuvida[]).map(d => ({
      ...d,
      profile: d.profiles?.[0] ?? null,
      respostas_count: d.respostas_duvidas[0]?.count ?? 0,
    }));
  };

  const { data: duvidas, error, isLoading } = useSWR(['duvidas', selectedEscola, selectedTurma, searchTerm, activeFilter], fetchDuvidas);

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de Dúvidas</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Filtre para ver as perguntas das suas turmas.</p>
        </div>
        <Link
          href="/duvidas/nova"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <PlusCircle size={20} /> Fazer uma Pergunta
        </Link>
      </div>

      {/* Filtros de Escola e Turma */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <select value={selectedEscola} onChange={e => setSelectedEscola(e.target.value === 'todas' ? 'todas' : Number(e.target.value))} className="w-full rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800">
            <option value="todas">Todas as Escolas</option>
            {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div>
          <select
            value={selectedTurma}
            onChange={e => setSelectedTurma(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
            disabled={selectedEscola === 'todas'}
            className="w-full rounded-lg border p-3 shadow-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="todas">Todas as Turmas</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border p-3 pl-10 shadow-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
      </div>

      {/* Lista de dúvidas */}
      <div className="space-y-4">
        {isLoading && <p className="text-center text-gray-500">A carregar dúvidas...</p>}
        {error && <p className="text-center text-red-500">Erro ao carregar as dúvidas.</p>}
        {!isLoading && duvidas?.length === 0 && (
          <div className="py-16 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Nenhuma dúvida encontrada para os filtros selecionados.</h3>
          </div>
        )}
        {duvidas?.map(duvida => (
          <Link key={duvida.id} href={`/duvidas/${duvida.id}`} className="block">
            <div className="rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">{duvida.titulo}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Perguntado por {duvida.profile?.nome || 'Desconhecido'} • {new Date(duvida.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>{duvida.respostas_count}</span><MessageSquare size={16} />
                  </div>
                  {duvida.resolvida ? <Check className="text-green-600" /> : null}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
