'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation'; // <<< CORREÇÃO AQUI

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

export default function ChatClientPage() {
  const router = useRouter(); // Agora está corretamente importado
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const { data: profile } = await supabase.from('profiles').select('turma_id').eq('id', user.id).single();
    if (!profile?.turma_id) {
      setError("Não foi possível encontrar a sua turma.");
      setLoading(false);
      return;
    }
    setTurmaId(profile.turma_id);

    const { data: initialMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select(`*, profiles(id, nome, tipo_usuario)`)
      .eq('turma_id', profile.turma_id)
      .order('created_at', { ascending: true });
    
    if (messagesError) {
      setError('Erro ao carregar as mensagens.');
    } else {
      setMessages(initialMessages as Message[]);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void fetchInitialData();
  }, [fetchInitialData]);
  
  useEffect(() => {
    if (!turmaId) return;

    const channel = supabase
      .channel(`chat_turma_${turmaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `turma_id=eq.${turmaId}`,
        },
        async (payload) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, nome, tipo_usuario')
            .eq('id', payload.new.autor_id)
            .single();

          const newMessagePayload: Message = {
            ...(payload.new as Message),
            profiles: profileData as Message['profiles'],
          };
          
          setMessages((prevMessages) => [...prevMessages, newMessagePayload]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [turmaId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || !turmaId) return;

    setIsSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from('chat_messages').insert({
      corpo: newMessage,
      autor_id: userId,
      turma_id: turmaId,
    });

    if (insertError) {
      if (insertError.message.includes('violates row-level security policy')) {
        setError("Você não tem permissão para enviar mensagens neste chat. Você pode estar banido.");
      } else {
        setError(`Erro ao enviar: ${insertError.message}`);
      }
    } else {
      setNewMessage('');
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return <div className="p-6 text-center">A carregar o chat da turma...</div>;
  }
  
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Chat da Turma</h1>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isSelf = msg.profiles?.id === userId;
            const isProfessor = msg.profiles?.tipo_usuario === 'PROFESSOR';
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col max-w-lg rounded-lg px-4 py-2 ${isSelf ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  {!isSelf && (
                    <p className={`text-xs font-bold ${isProfessor ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'}`}>
                      {msg.profiles?.nome || 'Desconhecido'}
                    </p>
                  )}
                  <p className="text-sm">{msg.corpo}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="mt-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-grow rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-700"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newMessage.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
          </button>
        </form>
        {error && (
          <div className="mt-2 flex items-center text-sm text-red-600">
            <AlertCircle size={16} className="mr-2" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
//