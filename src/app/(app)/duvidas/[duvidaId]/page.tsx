// Ficheiro: src/app/(app)/duvidas/[duvidaId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, ThumbsUp, CheckCircle, Trash2, Award } from 'lucide-react';
import AdvancedEditor from '@/components/AdvancedEditor';
import DOMPurify from 'dompurify';

// #region --- TIPOS ---
type ProfileInfo = { id: string; nome: string; tipo_usuario: string; };
type Resposta = {
  id: number;
  corpo: string;
  created_at: string;
  is_best_answer: boolean;
  votes: number;
  is_anonymous: boolean;
  profile: ProfileInfo | null;
  user_has_voted: boolean;
};
type DuvidaCompleta = {
  id: number;
  titulo: string;
  corpo: string;
  created_at: string;
  resolvida: boolean;
  is_anonymous: boolean;
  profile: ProfileInfo | null;
  respostas: Resposta[];
};

// Tipos Brutos (Raw) que correspondem à resposta da API
type RawProfile = { id: string; nome: string; tipo_usuario: string };
type RawResposta = {
  id: number;
  corpo: string;
  created_at: string;
  is_best_answer: boolean;
  votes: number;
  is_anonymous: boolean;
  profiles: RawProfile | null; // A query com join direto retorna objeto
  duvida_resposta_votes: { user_id: string }[];
};
type RawDuvida = {
  id: number;
  titulo: string;
  corpo: string;
  created_at: string;
  resolvida: boolean;
  is_anonymous: boolean;
  profiles: RawProfile | null; // A query com join direto retorna objeto
  respostas_duvidas: RawResposta[];
};
// #endregion

// --- Fetcher para o SWR ---
const fetchDuvida = async (duvidaId: string, userId: string | null) => {
  const { data, error } = await supabase
    .from('duvidas')
    .select(`
      *,
      profiles (id, nome, tipo_usuario),
      respostas_duvidas ( *, profiles (id, nome, tipo_usuario), duvida_resposta_votes(user_id) )
    `)
    .eq('id', duvidaId)
    .single();
  if (error) throw error;
  
  const rawDuvida = data as RawDuvida;

  // Transformação dos dados "brutos" para "limpos"
  const duvidaLimpa: DuvidaCompleta = {
    ...rawDuvida,
    profile: rawDuvida.profiles,
    respostas: rawDuvida.respostas_duvidas.map(resposta => ({
      ...resposta,
      profile: resposta.profiles,
      user_has_voted: userId ? resposta.duvida_resposta_votes.some(vote => vote.user_id === userId) : false,
    }))
  };
  return duvidaLimpa;
};

export default function DuvidaDetalhePage() {
  const params = useParams();
  const duvidaId = params.duvidaId as string;
  const router = useRouter();
  const { mutate } = useSWRConfig(); 
  
  const [newAnswer, setNewAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<ProfileInfo | null>(null);
  const [newAnswerIsAnonymous, setNewAnswerIsAnonymous] = useState(false);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('id, nome, tipo_usuario').eq('id', user.id).single();
        if (profile) setCurrentUser(profile as ProfileInfo);
      }
    }
    void getUser();
  }, []);
  
  const swrKey = currentUser ? `duvida-${duvidaId}-${currentUser.id}` : null;
  const { data: duvida, error, isLoading } = useSWR(swrKey, () => fetchDuvida(duvidaId, currentUser!.id));

  useEffect(() => {
    if (!duvidaId) return;
    const channel = supabase
      .channel(`respostas_duvida_${duvidaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'respostas_duvidas', filter: `duvida_id=eq.${duvidaId}` }, () => { void mutate(swrKey); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duvidas', filter: `id=eq.${duvidaId}` }, () => { void mutate(swrKey); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [duvidaId, mutate, swrKey]);

  const handlePostAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswer.trim() || !currentUser) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('respostas_duvidas').insert({ corpo: newAnswer, duvida_id: Number(duvidaId), autor_id: currentUser.id, is_anonymous: newAnswerIsAnonymous });
    if (error) { setMessage(`Erro ao enviar resposta: ${error.message}`); } 
    else { setNewAnswer(''); setNewAnswerIsAnonymous(false); }
    setIsSubmitting(false);
  };

  const handleUpvote = async (respostaId: number) => {
    await supabase.rpc('upvote_resposta', { resposta_id_param: respostaId });
    void mutate(swrKey);
  };

  const handleMarkBest = async (respostaId: number) => {
    await supabase.rpc('marcar_melhor_resposta', { resposta_id_param: respostaId });
    void mutate(swrKey);
  };

  const handleDeleteAnswer = async (respostaId: number) => {
    if (window.confirm("Tem a certeza que deseja apagar esta resposta?")) {
      await supabase.from('respostas_duvidas').delete().eq('id', respostaId);
    }
  };
    
  if (isLoading || !currentUser) return <div className="p-6 text-center">A carregar dúvida...</div>;
  if (error || !duvida) return <div className="p-6 text-center text-red-500">Erro: Dúvida não encontrada ou você não tem permissão para a ver.</div>;

  const sortedRespostas = [...duvida.respostas].sort((a, b) => {
      if (a.is_best_answer) return -1;
      if (b.is_best_answer) return 1;
      return b.votes - a.votes;
  });
    
  const podeMarcarMelhorResposta = currentUser.tipo_usuario === 'PROFESSOR' || currentUser.id === duvida.profile?.id;

  return (
    <div className="p-6 animate-fade-in max-w-4xl mx-auto">
        <Link href="/duvidas" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors mb-4"><ArrowLeft size={16} />Voltar para a Central de Dúvidas</Link>

        {/* Pergunta Original */}
        <div className="p-6 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">{duvida.titulo}</h1>{duvida.resolvida && <span className="flex items-center gap-1 text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full dark:bg-green-900/50 dark:text-green-300"><CheckCircle size={16} /> Resolvida</span>}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Perguntado por {(duvida.is_anonymous && currentUser.tipo_usuario !== 'PROFESSOR') ? 'Anónimo' : duvida.profile?.nome || 'Desconhecido'} em {new Date(duvida.created_at).toLocaleDateString('pt-BR')}
            </p>
            <div className="prose prose-sm dark:prose-invert mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(duvida.corpo) }} />
        </div>

        {/* Lista de Respostas */}
        <h2 className="text-2xl font-bold mt-8 mb-4">Respostas ({sortedRespostas.length})</h2>
        <div className="space-y-4">
            {sortedRespostas.map(resposta => {
                const autor = resposta.profile;
                const nomeAutor = (resposta.is_anonymous && currentUser.tipo_usuario !== 'PROFESSOR') ? 'Anónimo' : autor?.nome || 'Desconhecido';
                return (
                    <div key={resposta.id} className={`rounded-lg border p-5 ${resposta.is_best_answer ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700' : 'bg-white dark:bg-gray-800 dark:border-gray-700'}`}>
                        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className={`font-semibold ${autor?.tipo_usuario === 'PROFESSOR' ? 'text-blue-600' : 'text-gray-800 dark:text-gray-200'}`}>{nomeAutor}</span>{autor?.tipo_usuario === 'PROFESSOR' && <span className="text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">PROFESSOR</span>}</div><span className="text-xs text-gray-500">{new Date(resposta.created_at).toLocaleString('pt-BR')}</span></div>
                        <div className="prose prose-sm dark:prose-invert mt-3 max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resposta.corpo) }} />
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={() => handleUpvote(resposta.id)} disabled={resposta.user_has_voted || autor?.id === currentUser.id} className={`flex items-center gap-1.5 text-sm transition ${resposta.user_has_voted ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-blue-600'}`}><ThumbsUp size={16} /> {resposta.votes}</button>
                                {podeMarcarMelhorResposta && !duvida.resolvida && !resposta.is_best_answer && (<button onClick={() => handleMarkBest(resposta.id)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition"><Award size={16} /> Marcar como melhor resposta</button>)}
                            </div>
                            {currentUser.tipo_usuario === 'PROFESSOR' && (<button onClick={() => handleDeleteAnswer(resposta.id)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition"><Trash2 size={16} /> Excluir</button>)}
                        </div>
                        {resposta.is_best_answer && <div className="mt-3 text-sm font-bold text-green-700 dark:text-green-300 border-t dark:border-green-800 pt-3 flex items-center gap-2"><CheckCircle size={16}/> Melhor Resposta</div>}
                    </div>
                );
            })}
        </div>

        {/* Formulário para Nova Resposta */}
        <div className="mt-8">
            <h3 className="text-xl font-bold mb-2">A sua Resposta</h3>
            <form onSubmit={handlePostAnswer}>
                <AdvancedEditor content={newAnswer} onChange={setNewAnswer} placeholder="Escreva a sua resposta aqui..." />
                <div className="mt-4 flex items-center">
                    <input id="newAnswerIsAnonymous" type="checkbox" checked={newAnswerIsAnonymous} onChange={(e) => setNewAnswerIsAnonymous(e.target.checked)} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="newAnswerIsAnonymous" className="ml-3 block text-sm font-medium">Responder como anônimo</label>
                </div>
                <div className="flex justify-end mt-4"><button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}{isSubmitting ? 'A Enviar...' : 'Enviar Resposta'}</button></div>
            </form>
        </div>
    </div>
    );
}