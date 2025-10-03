// Ficheiro: src/app/(app)/duvidas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { PlusCircle, Search, MessageSquare, Check } from 'lucide-react';

// --- Tipos ---
type Duvida = {
  id: number;
  titulo: string;
  created_at: string;
  resolvida: boolean;
  disciplina_id: number | null;
  // <<< CORREÇÃO 1: 'profiles' agora é um array para corresponder aos dados do Supabase >>>
  profiles: { nome: string }[] | null;
  respostas_duvidas: { count: number }[];
};

// --- Fetcher para o SWR ---
const fetchDuvidas = async ([key, turmaId, searchTerm, filter]: [string, number, string, string]) => {
  let query = supabase
    .from('duvidas')
    .select(`
      id,
      titulo,
      created_at,
      resolvida,
      disciplina_id,
      profiles ( nome ),
      respostas_duvidas ( count )
    `, { count: 'exact' })
    .eq('turma_id', turmaId)
    .order('created_at', { ascending: false });

  if (searchTerm.trim().length > 2) {
    query = query.textSearch('fts', searchTerm.trim(), { type: 'websearch' });
  }

  if (filter === 'nao_resolvidas') {
    query = query.eq('resolvida', false);
  } else if (filter === 'gerais') {
    query = query.is('disciplina_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Duvida[];
};

export default function CentralDeDuvidasPage() {
  const router = useRouter();
  const [turmaId, setTurmaId] = useState<number | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('todas');

  useEffect(() => {
    async function getUserTurma() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('turma_id').eq('id', user.id).single();
      if (profile?.turma_id) {
        setTurmaId(profile.turma_id);
      }
    }
    void getUserTurma();
  }, [router]);

  const { data: duvidas, error, isLoading } = useSWR(
    turmaId ? ['duvidas', turmaId, searchTerm, activeFilter] : null,
    fetchDuvidas,
    {
      refreshInterval: 30000,
    }
  );

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de Dúvidas</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Veja as perguntas da sua turma ou faça uma nova pergunta.
          </p>
        </div>
        <Link href="/duvidas/nova" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-700">
          <PlusCircle size={20} />
          Fazer uma Pergunta
        </Link>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar por título ou conteúdo da dúvida..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border p-3 pl-10 shadow-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Filtrar por:</span>
          <button onClick={() => setActiveFilter('todas')} className={`px-3 py-1 text-sm rounded-full transition ${activeFilter === 'todas' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`}>Todas</button>
          <button onClick={() => setActiveFilter('nao_resolvidas')} className={`px-3 py-1 text-sm rounded-full transition ${activeFilter === 'nao_resolvidas' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`}>Não Resolvidas</button>
          <button onClick={() => setActiveFilter('gerais')} className={`px-3 py-1 text-sm rounded-full transition ${activeFilter === 'gerais' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`}>Gerais</button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading && <p className="text-center text-gray-500">A carregar dúvidas...</p>}
        {error && <p className="text-center text-red-500">Erro ao carregar as dúvidas.</p>}
        {!isLoading && duvidas?.length === 0 && (
          <div className="py-16 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Nenhuma dúvida encontrada.</h3>
            <p>Seja o primeiro a fazer uma pergunta!</p>
          </div>
        )}
        {duvidas?.map(duvida => (
          <Link key={duvida.id} href={`/duvidas/${duvida.id}`} className="block">
            <div className="rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">{duvida.titulo}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {/* <<< CORREÇÃO 2: Aceder ao primeiro item do array de profiles >>> */}
                    Perguntado por {duvida.profiles?.[0]?.nome || 'Anónimo'} • {new Date(duvida.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>{duvida.respostas_duvidas[0]?.count || 0}</span>
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