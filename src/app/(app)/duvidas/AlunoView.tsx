// Ficheiro: src/app/(app)/duvidas/AlunoView.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import useSWR from 'swr';
import Link from 'next/link';
import { MessageSquare, Search, Loader2 } from 'lucide-react';

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
  // O turma_id é lido diretamente do perfil do usuário, que é carregado no page.tsx
  const turmaIdDoAluno = user.turma_id;
  
  // Estados do filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todas' | 'nao_resolvidas' | 'resolvidas' | 'gerais'>('todas');
  
  // --- Função Fetcher (sem alterações, mas isolada para clareza) ---
  const fetchDuvidas = async () => {
    // Esta checagem NÃO viola a regra de Hooks, pois está dentro da função fetcher
    if (!turmaIdDoAluno) {
      // Isso não deve ocorrer se a checagem no JSX for bem-sucedida, mas é uma proteção
      return []; 
    }
    
    let query = supabase
      .from('duvidas')
      .select('id, titulo, created_at, resolvida, is_anonymous, disciplina_id, profiles(nome), respostas_duvidas(count)')
      .order('created_at', { ascending: false })
      // FILTRO PRINCIPAL: Apenas dúvidas da turma do aluno
      .eq('turma_id', turmaIdDoAluno);
      
    // Buscar apenas dúvidas não anônimas
    // Se você quiser que o aluno veja as dúvidas anônimas feitas por outros alunos da turma, remova esta linha.
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

  // CORREÇÃO: O useSWR é chamado incondicionalmente no topo do componente.
  // Ele usa `turmaIdDoAluno ? [...] : null` como chave para DESABILITAR o fetching 
  // se o turma_id ainda não estiver disponível.
  const swrKey = turmaIdDoAluno ? ['duvidas_aluno', turmaIdDoAluno, searchTerm, activeFilter] : null;
  
  const { data: duvidas, error, isLoading } = useSWR(
    swrKey,
    fetchDuvidas
  );
  
  // --- Renderização Condicional (Não é um Hook, então está OK) ---
  if (!turmaIdDoAluno) {
    return (
      <div className="p-6 text-center text-red-500">
        Não foi possível encontrar a turma associada ao seu perfil.
      </div>
    );
  }
  
  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Central de Dúvidas da Turma</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Aqui estão as dúvidas da sua turma, {user.nome}!</p>
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