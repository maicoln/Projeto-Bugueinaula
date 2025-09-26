'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { Youtube, Music, Send, Loader2 } from 'lucide-react';
import Image from 'next/image';

// --- Tipos de Dados ---
interface Profile {
  nome: string | null;
}

interface JukeboxQueueItem {
  id: number;
  song_title: string | null;
  thumbnail_url: string | null;
  created_at: string;
  // A propriedade 'profiles' espera um único objeto ou nulo
  profiles: Profile | null;
}

type AddSongResponse = {
  message?: string;
  error?: string;
  cooldown?: number;
};

// --- Componente Principal ---
export default function JukeboxClientPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  const [cooldown, setCooldown] = useState<number>(0);

  // Efeito para carregar o cooldown do localStorage ao iniciar a página
  useEffect(() => {
    const storedCooldownEnd = localStorage.getItem('jukeboxCooldownEnd');
    if (storedCooldownEnd) {
      const cooldownEnd = Number(storedCooldownEnd);
      const remainingTime = cooldownEnd - Date.now();

      if (remainingTime > 0) {
        setCooldown(remainingTime);
      } else {
        localStorage.removeItem('jukeboxCooldownEnd');
      }
    }
  }, []);

  // Efeito para a contagem regressiva em tempo real
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => {
        const next = prev - 1000;
        if (next <= 0) {
          localStorage.removeItem('jukeboxCooldownEnd');
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // ===================================================================
  // FUNÇÃO FETCHER CORRIGIDA
  // ===================================================================
  const fetcher = async (key: 'jukebox_queue' | 'jukebox_history'): Promise<JukeboxQueueItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profileData } = await supabase
      .from('profiles')
      .select('turma_id')
      .eq('id', user.id)
      .single();
    if (!profileData?.turma_id) return [];

    const turmaId = profileData.turma_id;

    let query = supabase
      .from('jukebox_queue')
      .select('id, song_title, thumbnail_url, created_at, profiles (nome)')
      .eq('turma_id', turmaId);

    if (key === 'jukebox_queue') {
      query = query
        .in('status', ['queued', 'playing'])
        .order('created_at', { ascending: true });
    } else { // jukebox_history
      query = query
        .eq('status', 'played')
        .order('created_at', { ascending: false })
        .limit(20);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    // Mapeia os resultados para corrigir a incompatibilidade de tipo
    return data.map(item => ({
      ...item,
      // Se 'profiles' for um array, pegamos o primeiro elemento. Caso contrário, usamos o valor como está.
      profiles: Array.isArray(item.profiles) ? item.profiles[0] ?? null : item.profiles,
    }));
  };
  // ===================================================================

  const { data: queue, mutate: mutateQueue } = useSWR<JukeboxQueueItem[]>('jukebox_queue', fetcher, { refreshInterval: 1000 });
  const { data: history } = useSWR<JukeboxQueueItem[]>('jukebox_history', fetcher, { refreshInterval: 5000 });
  
  const formatCooldown = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleSubmitSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim() || isSubmitting || cooldown > 0) return;

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: responseData, error } = await supabase.functions.invoke<AddSongResponse>(
        'adicionar-musica',
        {
          method: 'POST',
          body: JSON.stringify({ youtube_url: youtubeUrl })
        }
      );

      if (error) throw error;
      if (!responseData) throw new Error('Resposta inválida do servidor.');
      
      if (responseData.error) {
        setMessage({ type: 'error', text: responseData.error });
      } else if (responseData.message) {
        setMessage({ type: 'success', text: responseData.message });
        setYoutubeUrl('');
        mutateQueue();
      }

      if (typeof responseData.cooldown === 'number' && responseData.cooldown > 0) {
        const cooldownEndTime = Date.now() + responseData.cooldown;
        localStorage.setItem('jukeboxCooldownEnd', cooldownEndTime.toString());
        setCooldown(responseData.cooldown);
      }

    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSong = queue?.[0] ?? null;
  const nextSongs = queue?.slice(1) ?? [];

  return (
    <div className="p-6 animate-fade-in space-y-8">
      {/* ... o resto do seu JSX continua aqui, sem alterações ... */}
            {/* --- Cabeçalho --- */}
            <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Jukebox Coletiva</h1>
        <p className="text-gray-500 dark:text-gray-400">Adicione uma música do YouTube para tocar para a turma!</p>
      </div>

      {/* --- Formulário de Envio --- */}
      <form onSubmit={handleSubmitSong} className="max-w-2xl mx-auto rounded-lg border bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cole o link do YouTube aqui..."
            value={youtubeUrl}
            onChange={e => setYoutubeUrl(e.target.value)}
            required
            className="w-full pl-10 p-3 rounded-lg border bg-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || cooldown > 0}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={16} />}
          {cooldown > 0 ? `Aguarde ${formatCooldown(cooldown)}` : 'Enviar'}
        </button>
      </form>

      {/* --- Mensagem de Status --- */}
      {message.text && (
        <p className={`text-center font-semibold ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
          {message.text}
        </p>
      )}

      {/* --- Player da Música Atual --- */}
      {currentSong && (
         <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
           <div className="relative w-full lg:w-1/2 aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
             {currentSong.thumbnail_url ? (
               <Image src={currentSong.thumbnail_url} alt={currentSong.song_title ?? 'Música'} fill sizes="100vw" className="object-cover"/>
             ) : (
               <div className="flex items-center justify-center w-full h-full bg-gray-900 text-white"><Music size={64} /></div>
             )}
           </div>
           <div className="flex-1 space-y-2">
             <h2 className="text-2xl font-bold">{currentSong.song_title ?? 'Título indisponível'}</h2>
             <p className="text-gray-500 dark:text-gray-400">Adicionado por: {currentSong.profiles?.nome ?? 'Desconhecido'}</p>
             <p className="text-green-500 font-semibold flex items-center gap-1"><Music size={16} /> Tocando agora</p>
           </div>
         </div>
      )}

      {/* --- Fila e Histórico --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Próximas Músicas */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Próximas na Fila</h3>
          <div className="rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 p-4 max-h-[400px] overflow-y-auto">
            {nextSongs.length > 0 ? (
              <ul className="space-y-2">
                {nextSongs.map(item => (
                  <li key={item.id} className="flex items-center gap-3 p-2 rounded-lg">
                    {item.thumbnail_url && <Image src={item.thumbnail_url} alt={item.song_title ?? ''} width={48} height={48} className="h-12 w-12 rounded object-cover" />}
                    <div>
                      <p className="font-semibold">{item.song_title}</p>
                      <p className="text-xs text-gray-500">Por: {item.profiles?.nome ?? 'Desconhecido'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-500">A fila está vazia. Adicione a próxima música!</p>}
          </div>
        </div>

        {/* Últimas Tocadas */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Últimas Tocadas</h3>
          <div className="rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 p-4 max-h-[400px] overflow-y-auto">
            {history && history.length > 0 ? (
              <ul className="space-y-2">
                {history.map(item => (
                  <li key={item.id} className="flex items-center gap-3 p-2 rounded-lg">
                    {item.thumbnail_url && <Image src={item.thumbnail_url} alt={item.song_title ?? ''} width={48} height={48} className="h-12 w-12 rounded object-cover" />}
                    <div>
                      <p className="font-semibold">{item.song_title}</p>
                      <p className="text-xs text-gray-500">Por: {item.profiles?.nome ?? 'Desconhecido'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-500">Nenhuma música foi tocada ainda.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}