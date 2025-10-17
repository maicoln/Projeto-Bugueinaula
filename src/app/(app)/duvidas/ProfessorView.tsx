// Ficheiro: src/app/(app)/duvidas/ProfessorView.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useSWR from 'swr';
import Link from 'next/link';
import { MessageSquare, Search, Loader2, Check } from 'lucide-react';

// --- Tipos ---
export type ProfileInfo = { id: string; nome: string; tipo_usuario: string; turma_id: number | null };

type EscolaInfo = { id: number; nome: string; };
type TurmaInfo = { id: number; nome: string; escola_id: number; };

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

// Omit<> remove as chaves especificadas do tipo Duvida para criar um novo tipo
type RawDuvida = Omit<Duvida, 'profile' | 'respostas_count'> & {
  profiles: { nome: string }[] | null;
  respostas_duvidas: { count: number }[];
};

type ProfessorViewProps = { user: ProfileInfo };

// --- Fetchers ---

const fetchEscolas = async () => {
  const { data, error } = await supabase.from('escolas').select('id, nome').order('nome');
  if (error) throw error;
  return data as EscolaInfo[];
};

const fetchTurmas = async (escolaId: number) => {
  const { data, error } = await supabase.from('turmas').select('id, nome, escola_id').eq('escola_id', escolaId).order('nome');
  if (error) throw error;
  return data as TurmaInfo[];
};

// --- Componente ---
export function ProfessorView({ user }: ProfessorViewProps) {
  const [selectedEscola, setSelectedEscola] = useState<number | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todas' | 'nao_resolvidas' | 'resolvidas' | 'gerais'>('todas');
  
  // Busca de Escolas
  const { data: escolas, isLoading: isLoadingEscolas } = useSWR('escolas', fetchEscolas);
  
  // Busca de Turmas
  const { data: turmas, isLoading: isLoadingTurmas } = useSWR(selectedEscola ? `turmas-${selectedEscola}` : null, () => fetchTurmas(selectedEscola!));
  
  // Efeito para selecionar a primeira escola por padrão
  useEffect(() => {
    if (escolas && escolas.length > 0 && selectedEscola === null) {
      setSelectedEscola(escolas[0].id);
    }
  }, [escolas, selectedEscola]);
  
  // --- Buscar dúvidas ---
  const fetchDuvidas = async () => {
    if (!selectedEscola) return [];
    
    let query = supabase
      .from('duvidas')
      // CORREÇÃO: Adicionado 'disciplina_id' para corresponder ao tipo RawDuvida
      .select('id, titulo, created_at, resolvida, is_anonymous, escola_id, disciplina_id, profiles(nome), respostas_duvidas(count)')
      .order('created_at', { ascending: false });

    // Filtro por escola
    query = query.eq('escola_id', selectedEscola);

    // Filtro por turma (se selecionada)
    if (selectedTurma) {
      query = query.eq('turma_id', selectedTurma);
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
    if (error) {
          console.error("Erro no fetchDuvidas (Professor):", error);
          throw error;
    }

    return (data as RawDuvida[]).map(d => ({
      ...d,
      // O nome do perfil é extraído do array de profiles retornado pelo Supabase
      profile: d.profiles?.[0] ?? null,
      respostas_count: d.respostas_duvidas[0]?.count ?? 0,
    }));
  };

  const { data: duvidas, error, isLoading } = useSWR(
    ['duvidas_professor', selectedEscola, selectedTurma, searchTerm, activeFilter],
    fetchDuvidas
  );
  
  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Painel do Professor</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Bem-vindo, Professor(a) {user.nome}.</p>
      </div>

      {/* Filtros */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <select value={selectedEscola ?? ''} onChange={(e) => { setSelectedEscola(Number(e.target.value)); setSelectedTurma(null); }} className="rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800" disabled={isLoadingEscolas}>
          <option value="">{isLoadingEscolas ? 'A carregar escolas...' : 'Selecione a Escola'}</option>
          {escolas?.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        
        <select value={selectedTurma ?? ''} onChange={(e) => setSelectedTurma(Number(e.target.value))} className="rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800" disabled={!selectedEscola || isLoadingTurmas}>
          <option value="">{isLoadingTurmas ? 'A carregar turmas...' : 'Todas as Turmas'}</option>
          {turmas?.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        
        <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800" />
      </div>

      {/* Lista de dúvidas */}
      <div className="space-y-4">
        {(isLoading || !selectedEscola) && <p className="text-center text-gray-500"><Loader2 className="mr-2 h-6 w-6 animate-spin mx-auto" />A carregar dúvidas...</p>}
        {error && <p className="text-center text-red-500">Erro ao carregar as dúvidas.</p>}
        {!isLoading && selectedEscola && duvidas?.length === 0 && (
          <div className="py-16 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Nenhuma dúvida encontrada nos filtros selecionados.</h3>
          </div>
        )}
        {duvidas?.map(duvida => {
            // Lógica de Exibição do Nome:
            // O professor sempre vê o nome real, ignorando is_anonymous.
            const nomeAutor = (duvida.is_anonymous && user.tipo_usuario !== 'PROFESSOR')
              ? 'Anónimo'
              : duvida.profile?.nome || 'Desconhecido';

            return (
              <Link key={duvida.id} href={`/duvidas/${duvida.id}`} className="block">
                <div className="rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">{duvida.titulo}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Perguntado por {nomeAutor} • {new Date(duvida.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{duvida.respostas_count}</span><MessageSquare size={16} />
                      </div>
                      {duvida.resolvida ? <Check size={16} className="text-green-600" /> : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
        })}
      </div>
    </div>
  );
}