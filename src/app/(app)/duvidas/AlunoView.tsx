// Ficheiro: src/app/(app)/duvidas/AlunoView.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useSWR from 'swr';
import Link from 'next/link';
// Importação do Plus para o botão de criar dúvida
import { MessageSquare, Search, Loader2, Plus } from 'lucide-react'; 

// --- Tipos ---
export type ProfileInfo = { id: string; nome: string; tipo_usuario: string; turma_id: number | null }; 

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

// --- Componente Corrigido ---
export function AlunoView({ user }: AlunoViewProps) {
  const turmaIdDoAluno = user.turma_id;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todas' | 'nao_resolvidas' | 'resolvidas' | 'gerais'>('todas');
  
  // --- Função Fetcher ---
  const fetchDuvidas = async () => {
    if (!turmaIdDoAluno) return []; 
    
    let query = supabase
      .from('duvidas')
      // Buscando profiles(nome) para obter o nome do autor
      .select('id, titulo, created_at, resolvida, is_anonymous, profiles(nome), respostas_duvidas(count)') 
      .order('created_at', { ascending: false })
      .eq('turma_id', turmaIdDoAluno);
      
    if (searchTerm.trim().length > 2) {
      query = query.textSearch('fts', `'${searchTerm.trim()}'`, { type: 'websearch', config: 'portuguese' });
    }

    if (activeFilter === 'nao_resolvidas') query = query.eq('resolvida', false);
    else if (activeFilter === 'resolvidas') query = query.eq('resolvida', true);
    else if (activeFilter === 'gerais') query = query.is('disciplina_id', null);

    const { data, error } = await query;
    if (error) {
         console.error("Erro no fetchDuvidas (Aluno):", error);
         throw error;
    }

    return (data as RawDuvida[]).map(d => ({
      ...d,
      // O nome do perfil é extraído do array de profiles retornado pelo Supabase
      profile: d.profiles?.[0] ?? null, 
      respostas_count: d.respostas_duvidas[0]?.count ?? 0,
    }));
  };

  const swrKey = turmaIdDoAluno ? ['duvidas_aluno', turmaIdDoAluno, searchTerm, activeFilter] : null;
  
  const { data: duvidas, error, isLoading } = useSWR(
    swrKey,
    fetchDuvidas
  );
  
  if (!turmaIdDoAluno) {
    return (
      <div className="p-6 text-center text-red-500">
        Não foi possível encontrar a turma associada ao seu perfil.
      </div>
    );
  }
  
  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de Dúvidas da Turma</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Aqui estão as dúvidas da sua turma, {user.nome}!</p>
        </div>
        {/* CORREÇÃO: Botão Criar Dúvida */}
        <Link href="/duvidas/nova" className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white shadow-md hover:bg-blue-700 transition-colors">
          <Plus size={20} className="mr-2" />
          Criar Dúvida
        </Link>
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
        {(isLoading || !swrKey) && <p className="text-center text-gray-500"><Loader2 className="mr-2 h-6 w-6 animate-spin mx-auto" />A carregar dúvidas...</p>}
        {error && <p className="text-center text-red-500">Erro ao carregar as dúvidas.</p>}
        {!isLoading && swrKey && duvidas?.length === 0 && (
          <div className="py-16 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Nenhuma dúvida encontrada na sua turma.</h3>
          </div>
        )}
        {duvidas?.map(duvida => {
            // Lógica de Exibição do Nome:
             // Se for anônima E o usuário logado não for professor -> 'Anónimo'
             // Senão -> Nome real (ou 'Desconhecido' se o perfil falhar)
            const nomeAutor = (duvida.is_anonymous && user.tipo_usuario !== 'PROFESSOR') 
                ? 'Anónimo' 
                : duvida.profile?.nome || 'Desconhecido';
            
            return (
              <Link key={duvida.id} href={`/duvidas/${duvida.id}`} className="block">
                <div className="rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">{duvida.titulo}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Perguntado por {nomeAutor} • {new Date(duvida.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>{duvida.respostas_count}</span><MessageSquare size={16} />
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