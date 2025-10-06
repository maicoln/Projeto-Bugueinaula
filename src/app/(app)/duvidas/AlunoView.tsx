'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useSWR from 'swr';
import Link from 'next/link';
import { MessageSquare, Search, Loader2 } from 'lucide-react';

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

type AlunoViewProps = { user: ProfileInfo };

// --- Componente ---
export function AlunoView({ user }: AlunoViewProps) {
  const [escolas, setEscolas] = useState<EscolaInfo[]>([]);
  const [turmas, setTurmas] = useState<TurmaInfo[]>([]);
  const [selectedEscola, setSelectedEscola] = useState<number | 'todas'>('todas');
  const [selectedTurma, setSelectedTurma] = useState<number | 'todas'>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todas' | 'nao_resolvidas' | 'resolvidas' | 'gerais'>('todas');

  // --- Buscar escolas do aluno ---
  useEffect(() => {
    async function fetchEscolas() {
      try {
        const { data, error } = await supabase
          .from('alunos_escolas')
          .select('escolas(id, nome)')
          .eq('aluno_id', user.id);

        if (error) throw error;
        const escolasList = data?.flatMap(item => item.escolas || []) ?? [];
        setEscolas(escolasList);
      } catch (err) {
        console.error('Erro ao buscar escolas:', err);
      }
    }
    void fetchEscolas();
  }, [user.id]);

  // --- Buscar turmas do aluno ao selecionar escola ---
  useEffect(() => {
    async function fetchTurmas() {
      if (selectedEscola === 'todas') {
        setTurmas([]);
        setSelectedTurma('todas');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('alunos_turmas')
          .select('turmas(id, nome)')
          .eq('aluno_id', user.id)
          .eq('turmas.escola_id', selectedEscola);

        if (error) throw error;
        setTurmas(data?.flatMap(item => item.turmas || []) ?? []);
      } catch (err) {
        console.error('Erro ao buscar turmas:', err);
      }
    }
    void fetchTurmas();
  }, [selectedEscola, user.id]);

  // --- Buscar dúvidas ---
  const fetchDuvidas = async () => {
    let query = supabase
      .from('duvidas')
      .select('id, titulo, created_at, resolvida, is_anonymous, disciplina_id, profiles(nome), respostas_duvidas(count)')
      .order('created_at', { ascending: false });

    // Filtrar por turma ou escola
    if (selectedTurma !== 'todas') query = query.eq('turma_id', selectedTurma);
    else if (selectedEscola !== 'todas') {
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', selectedEscola);
      const turmaIds = turmasData?.map(t => t.id) ?? [];
      if (turmaIds.length) query = query.in('turma_id', turmaIds);
    }

    // Buscar apenas dúvidas públicas
    query = query.eq('is_anonymous', false);

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

  const { data: duvidas, error, isLoading } = useSWR(
    ['duvidas_aluno', selectedEscola, selectedTurma, searchTerm, activeFilter],
    fetchDuvidas
  );

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Central de Dúvidas — Aluno</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Bem-vindo, {user.nome}!</p>
      </div>

      {/* Filtros */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <select
          value={selectedEscola}
          onChange={e => setSelectedEscola(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
          className="w-full rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="todas">Todas as Escolas</option>
          {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
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

      {/* Busca */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Pesquisar dúvidas..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border p-3 pl-10 shadow-sm dark:border-gray-600 dark:bg-gray-800"
        />
      </div>

      {/* Lista de dúvidas */}
      <div className="space-y-4">
        {isLoading && <p className="text-center text-gray-500">A carregar dúvidas...</p>}
        {error && <p className="text-center text-red-500">Erro ao carregar as dúvidas.</p>}
        {!isLoading && duvidas?.length === 0 && (
          <div className="py-16 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Nenhuma dúvida encontrada.</h3>
          </div>
        )}
        {duvidas?.map(duvida => (
          <Link key={duvida.id} href={`/duvidas/${duvida.id}`} className="block">
            <div className="rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">{duvida.titulo}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Perguntado por {duvida.profile?.nome || 'Desconhecido'} • {new Date(duvida.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{duvida.respostas_count}</span><MessageSquare size={16} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
