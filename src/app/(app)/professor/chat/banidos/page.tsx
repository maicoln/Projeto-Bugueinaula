'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Loader2, ShieldCheck, UserX } from 'lucide-react';

// #region --- TIPOS ---
// Tipo "Limpo"
type BanInfo = {
  id: number;
  expires_at: string | null;
  profile: { nome: string } | null;
  turma: { nome: string } | null;
};

// Tipos "Brutos" (Raw)
type RawBanInfo = {
  id: number;
  expires_at: string | null;
  profiles: { nome: string }[] | null;
  turmas: { nome: string }[] | null;
};

// <<< CORREÇÃO 1: O tipo agora reflete a estrutura de arrays profundamente aninhados >>>
// professores_disciplinas -> disciplinas (array) -> disciplinas_turmas (array)
type DisciplinaTurmaJoin = {
  disciplinas: {
    disciplinas_turmas: {
      turma_id: number;
    }[];
  }[] | null; // A relação com 'disciplinas' é um-para-muitos, então é um array
};
// #endregion

// --- Fetcher para o SWR ---
const fetchBannedUsers = async (userId: string): Promise<BanInfo[]> => {
  if (!userId) return [];

  const { data: disciplinasData, error: disciplinasError } = await supabase
    .from('professores_disciplinas')
    .select('disciplinas(disciplinas_turmas(turma_id))')
    .eq('professor_id', userId);

  if (disciplinasError) throw disciplinasError;

  // <<< CORREÇÃO 2: Lógica de extração robusta com flatMap aninhado >>>
  const nestedTurmas = (disciplinasData as DisciplinaTurmaJoin[])
    ?.flatMap(d => d.disciplinas || []) // Extrai o array de disciplinas
    .flatMap(di => di.disciplinas_turmas) // Extrai o array de turmas de cada disciplina
    .map(dt => dt.turma_id); // Pega o ID de cada turma
    
  const turmaIds = [...new Set(nestedTurmas.filter(Boolean))];

  if (turmaIds.length === 0) return [];

  const { data, error } = await supabase
    .from('chat_bans')
    .select(`id, expires_at, profiles ( nome ), turmas ( nome )`)
    .in('turma_id', turmaIds)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false });
    
  if (error) throw error;

  // Transformação para o tipo "limpo"
  return (data as RawBanInfo[]).map(ban => ({
    id: ban.id,
    expires_at: ban.expires_at,
    profile: ban.profiles?.[0] ?? null,
    turma: ban.turmas?.[0] ?? null,
  }));
};

export default function BannedUsersPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setCurrentUser(user);
      }
    }
    void getUser();
  }, [router]);
  
  const swrKey = currentUser ? `banned-users-${currentUser.id}` : null;
  const { data: bannedUsers, error, isLoading } = useSWR(swrKey, () => fetchBannedUsers(currentUser!.id));

  const handleUnban = async (banId: number) => {
    if (window.confirm("Tem a certeza que deseja desbanir este aluno? Ele poderá voltar a enviar mensagens no chat.")) {
      const { error: deleteError } = await supabase.from('chat_bans').delete().eq('id', banId);
      if (deleteError) {
        alert(`Erro ao desbanir: ${deleteError.message}`);
      } else {
        void mutate(swrKey);
      }
    }
  };

  const formatExpiration = (expiresAt: string | null) => {
    if (expiresAt === null) {
      return <span className="font-bold text-red-500">Permanente</span>;
    }
    const date = new Date(expiresAt);
    if (date < new Date()) {
      return 'Expirado';
    }
    return date.toLocaleString('pt-BR');
  };

  if (isLoading || !currentUser) {
    return <div className="p-6 text-center"><Loader2 className="animate-spin inline-block mr-2" /> A carregar lista de banimentos...</div>;
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-8">
        <Link href="/professor/chat" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
          <ArrowLeft size={16} />
          Voltar para o Chat
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Gestão de Banimentos</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Veja e reverta os banimentos ativos nos chats das suas turmas.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-800">
        {error && <p className="p-4 text-red-500">Erro ao carregar a lista.</p>}
        {bannedUsers && bannedUsers.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Aluno Banido</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Turma</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expira em</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {bannedUsers.map(ban => (
                <tr key={ban.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800 dark:text-gray-200">{ban.profile?.nome || 'Aluno desconhecido'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{ban.turma?.nome || 'Turma desconhecida'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{formatExpiration(ban.expires_at)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => handleUnban(ban.id)} className="flex items-center gap-2 rounded-md bg-green-100 px-3 py-1 text-sm font-semibold text-green-800 transition hover:bg-green-200">
                      <ShieldCheck size={16} />
                      Desbanir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center text-gray-500">
            <UserX size={48} className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Nenhum aluno banido.</h3>
            <p>Todos os alunos podem enviar mensagens nos chats.</p>
          </div>
        )}
      </div>
    </div>
  );
}