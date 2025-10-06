'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useSWR from 'swr';
import Link from 'next/link';
import { MessageSquare, Check, Loader2, PlusCircle } from 'lucide-react';

// --- Tipos ---
type ProfileInfo = { id: string; nome: string; tipo_usuario: string };
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

// --- Componente Aluno ---
export function AlunoView({ user }: { user: ProfileInfo }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todas' | 'nao_resolvidas' | 'resolvidas' | 'gerais'>('todas');

  // --- SWR Fetcher ---
  const fetcher = async (): Promise<Duvida[]> => {
    if (!user?.id) return [];

    let query = supabase
      .from('duvidas')
      .select(`
        id,
        titulo,
        created_at,
        resolvida,
        is_anonymous,
        disciplina_id,
        profiles (nome),
        respostas_duvidas (count)
      `)
      .order('created_at', { ascending: false })
      .eq('aluno_id', user.id);

    if (searchTerm.trim().length > 2) {
      query = query.textSearch('fts', `'${searchTerm.trim()}'`, { type: 'websearch', config: 'portuguese' });
    }

    if (activeFilter === 'nao_resolvidas') query = query.eq('resolvida', false);
    else if (activeFilter === 'resolvidas') query = query.eq('resolvida', true);
    else if (activeFilter === 'gerais') query = query.is('disciplina_id', null);

    const { data, error } = await query;
    if (error) throw error;

    return (data as RawDuvida[]).map(d => ({
      ...d,
      profile: d.profiles?.[0] ?? null,
      respostas_count: d.respostas_duvidas[0]?.count ?? 0
    }));
  };

  const { data: duvidas, error, isLoading } = useSWR(['duvidas-aluno', user.id, searchTerm, activeFilter], fetcher);

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de Dúvidas — Aluno</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Bem-vindo, {user.nome}!</p>
        </div>
        <Link
          href="/duvidas/nova"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <PlusCircle size={20} /> Fazer uma Pergunta
        </Link>
      </div>

      {/* --- Pesquisa e filtros --- */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Pesquisar dúvidas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Filtrar por:</span>
          {['todas', 'nao_resolvidas', 'resolvidas', 'gerais'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f as typeof activeFilter)}
              className={`px-3 py-1 text-sm rounded-full transition ${
                activeFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
              }`}
            >
              {f === 'todas' ? 'Todas' : f === 'nao_resolvidas' ? 'Não Resolvidas' : f === 'resolvidas' ? 'Resolvidas' : 'Gerais'}
            </button>
          ))}
        </div>
      </div>

      {/* --- Lista de dúvidas --- */}
      <div className="space-y-4">
        {isLoading && (
          <p className="text-center text-gray-500">
            <Loader2 className="inline mr-2 h-5 w-5 animate-spin" /> Carregando dúvidas...
          </p>
        )}
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">{duvida.titulo}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Perguntado por {duvida.profile?.nome || 'Anônimo'} •{' '}
                    {new Date(duvida.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>{duvida.respostas_count}</span>
                    <MessageSquare size={16} />
                  </div>
                  {duvida.resolvida && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full dark:bg-green-900/50 dark:text-green-300">
                      <Check size={12} /> Resolvida
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
