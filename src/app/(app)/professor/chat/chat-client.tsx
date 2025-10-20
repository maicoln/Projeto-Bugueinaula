'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Send, Loader2, AlertCircle, School, Users, MoreVertical, Ban } from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- Tipos ---
type Message = {
  id: number;
  corpo: string;
  created_at: string;
  profiles: {
    id: string;
    nome: string;
    tipo_usuario: 'ALUNO' | 'PROFESSOR';
  } | null;
};
type Escola = { id: number; nome: string };
type Turma = { id: number; nome: string };

// <<< CORREÇÃO 1: Tipo para o join de escolas, esperando um array >>>
type ProfessorEscolaJoin = {
  escolas: Escola[] | null;
};

// Tipo para o payload do Supabase Realtime
type RealtimeMessagePayload = {
  new: {
    id: number;
    corpo: string;
    created_at: string;
    autor_id: string;
    turma_id: number;
  };
};

export default function ChatClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedEscola, setSelectedEscola] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');

  const [currentUser, setCurrentUser] = useState<{ id: string; tipo_usuario: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null); // Estado para o menu de moderação
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('id, tipo_usuario').eq('id', user.id).single();
      if (profile?.tipo_usuario !== 'PROFESSOR') { router.push('/'); return; }
      setCurrentUser(profile as { id: string, tipo_usuario: string });

      const { data: escolasData } = await supabase.from('professores_escolas').select('escolas!inner(id, nome)').eq('professor_id', user.id);
      if (escolasData) {
        // <<< CORREÇÃO 1: Usar flatMap para achatar o array de arrays >>>
        const professorEscolas = (escolasData as ProfessorEscolaJoin[])
          .flatMap(item => item.escolas || [])
          .filter(Boolean);
        setEscolas(professorEscolas);
      }
      setLoading(false);
    }
    void fetchInitialData();
  }, [router]);

  useEffect(() => {
    async function fetchTurmas() {
      if (!selectedEscola || !currentUser) { setTurmas([]); setSelectedTurma(''); return; }
      const { data: disciplinasData } = await supabase.from('disciplinas').select('id, professores_disciplinas!inner(professor_id)').eq('escola_id', selectedEscola).eq('professores_disciplinas.professor_id', currentUser.id);
      const disciplinaIds = disciplinasData?.map(d => d.id) || [];
      if (disciplinaIds.length === 0) { setTurmas([]); return; }
      const { data: turmasData } = await supabase.from('turmas').select('id, nome, disciplinas_turmas!inner(disciplina_id)').in('disciplinas_turmas.disciplina_id', disciplinaIds);
      setTurmas(turmasData || []);
    }
    void fetchTurmas();
  }, [selectedEscola, currentUser]);

  useEffect(() => {
    if (!selectedTurma) { setMessages([]); return; }
    
    async function fetchMessages() {
      const { data, error } = await supabase.from('chat_messages').select(`*, profiles(id, nome, tipo_usuario)`).eq('turma_id', selectedTurma).order('created_at', { ascending: true });
      if (error) { setError('Erro ao carregar mensagens.'); } 
      else { setMessages(data as Message[]); }
    }
    void fetchMessages();

    const channel = supabase.channel(`chat_turma_prof_${selectedTurma}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `turma_id=eq.${selectedTurma}` }, async (payload: RealtimeMessagePayload) => {
        // <<< CORREÇÃO 2: Buscar o perfil e montar o objeto Message completo >>>
        const { data: profileData } = await supabase.from('profiles').select('id, nome, tipo_usuario').eq('id', payload.new.autor_id).single();
        const newMessagePayload: Message = {
          id: payload.new.id,
          corpo: payload.new.corpo,
          created_at: payload.new.created_at,
          profiles: profileData as Message['profiles'],
        };
        setMessages(prev => [...prev, newMessagePayload]);
      }).subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [selectedTurma]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedTurma) return;
    setIsSubmitting(true); setError(null);
    const { error: insertError } = await supabase.from('chat_messages').insert({ corpo: newMessage, autor_id: currentUser.id, turma_id: Number(selectedTurma) });
    if (insertError) {
      setError(`Erro ao enviar: ${insertError.message}`);
    } else { setNewMessage(''); }
    setIsSubmitting(false);
  };
  
  const handleBan = async (alunoId: string, turmaId: number, durationMinutes: number | null) => {
    if (!currentUser) return;
    setOpenMenuId(null); // Fecha o menu
    const expires_at = durationMinutes ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString() : null;
    const durationText = durationMinutes ? `por ${durationMinutes} minutos` : 'permanentemente';
    if(window.confirm(`Tem a certeza que deseja banir este aluno do chat ${durationText}?`)) {
        const { error: banError } = await supabase.from('chat_bans').upsert({ user_id: alunoId, turma_id: turmaId, banned_by_id: currentUser.id, expires_at: expires_at }, { onConflict: 'user_id,turma_id' });
        if(banError) { alert(`Erro ao banir aluno: ${banError.message}`); } 
        else { alert('Aluno banido com sucesso.'); }
    }
  };

  if (loading) { return <div className="p-6 text-center">A carregar...</div>; }
  
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Chat das Turmas</h1>
        <p className="text-gray-500 dark:text-gray-400">Selecione uma escola e turma para ver e moderar o chat.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="relative"><School className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><select value={selectedEscola} onChange={e => setSelectedEscola(e.target.value)} className="w-full appearance-none rounded-lg border p-3 pl-10 dark:border-gray-600 dark:bg-gray-800"><option value="">Selecione uma escola</option>{escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
        <div className="relative"><Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><select value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)} disabled={!selectedEscola} className="w-full appearance-none rounded-lg border p-3 pl-10 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"><option value="">Selecione uma turma</option>{turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
      </div>

      {selectedTurma ? (
        <>
          <div className="flex-1 overflow-y-auto rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="space-y-4">
              {messages.map((msg) => {
                  const isSelf = msg.profiles?.id === currentUser?.id;
                  const isProfessor = msg.profiles?.tipo_usuario === 'PROFESSOR';
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 group ${isSelf ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex items-start max-w-lg rounded-lg px-4 py-2 ${isSelf ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        <div className="flex flex-col">
                          {!isSelf && (<p className={`text-xs font-bold ${isProfessor ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'}`}>{msg.profiles?.nome || 'Desconhecido'}</p>)}
                          <p className="text-sm">{msg.corpo}</p>
                        </div>
                        {/* Menu de Moderação */}
                        {!isSelf && !isProfessor && msg.profiles?.id && (
                          <div className="relative ml-2">
                            <button onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">
                              <MoreVertical size={16} />
                            </button>
                            {openMenuId === msg.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 rounded-md shadow-lg bg-white dark:bg-gray-900 ring-1 ring-black ring-opacity-5 z-10">
                                    <div className="py-1">
                                        <button onClick={() => handleBan(msg.profiles!.id, Number(selectedTurma), 10)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"><Ban size={14}/>Banir por 10 min</button>
                                        <button onClick={() => handleBan(msg.profiles!.id, Number(selectedTurma), 60)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"><Ban size={14}/>Banir por 1 hora</button>
                                        <button onClick={() => handleBan(msg.profiles!.id, Number(selectedTurma), null)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"><Ban size={14}/>Banir Permanentemente</button>
                                    </div>
                                </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="mt-4">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Digite sua mensagem..." className="flex-grow rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-700"/>
              <button type="submit" disabled={isSubmitting || !newMessage.trim()} className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
              </button>
            </form>
            {error && (<div className="mt-2 flex items-center text-sm text-red-600"><AlertCircle size={16} className="mr-2" />{error}</div>)}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed text-gray-500">
          <p>Selecione uma escola e uma turma para começar a moderar.</p>
        </div>
      )}
    </div>
  );
}