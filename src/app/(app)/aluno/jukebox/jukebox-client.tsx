'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { Youtube, Music, Send, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface Profile {
  nome: string | null;
}

interface JukeboxQueueItem {
  id: number;
  song_title: string | null;
  thumbnail_url: string | null;
  created_at: string;
  profiles: Profile | null;
}

type AddSongResponse = {
  message?: string;
  error?: string;
  cooldown?: number;
};

export default function JukeboxClientPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  const [cooldown, setCooldown] = useState<number>(0);

  // Carrega cooldown do localStorage
  useEffect(() => {
    const stored = localStorage.getItem('jukeboxCooldown');
    if (stored) {
      const cooldownEnd = Number(stored);
      const diff = cooldownEnd - Date.now();
      if (diff > 0) setCooldown(diff);
      else localStorage.removeItem('jukeboxCooldown');
    }
  }, []);

  // Fetch fila
  const fetchQueue = async (): Promise<JukeboxQueueItem[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return [];

    const { data: profileData } = await supabase
      .from('profiles')
      .select('turma_id')
      .eq('id', userId)
      .single();

    if (!profileData?.turma_id) return [];
    const turmaId = profileData.turma_id;

    const { data, error } = await supabase
      .from('jukebox_queue')
      .select('id, song_title, thumbnail_url, created_at, profiles (nome)')
      .in('status', ['queued', 'playing'])
      .eq('turma_id', turmaId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(item => ({
      id: item.id,
      song_title: item.song_title,
      thumbnail_url: item.thumbnail_url,
      created_at: item.created_at,
      profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles ?? null,
    }));
  };

  // Fetch histórico
  const fetchHistory = async (): Promise<JukeboxQueueItem[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return [];

    const { data: profileData } = await supabase
      .from('profiles')
      .select('turma_id')
      .eq('id', userId)
      .single();

    if (!profileData?.turma_id) return [];
    const turmaId = profileData.turma_id;

    const { data, error } = await supabase
      .from('jukebox_queue')
      .select('id, song_title, thumbnail_url, created_at, profiles (nome)')
      .eq('status', 'played')
      .eq('turma_id', turmaId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return (data ?? []).map(item => ({
      id: item.id,
      song_title: item.song_title,
      thumbnail_url: item.thumbnail_url,
      created_at: item.created_at,
      profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles ?? null,
    }));
  };

  const { data: queue, mutate: mutateQueue } = useSWR<JukeboxQueueItem[]>('jukebox_queue', fetchQueue, { refreshInterval: 1000 });
  const { data: history } = useSWR<JukeboxQueueItem[]>('jukebox_history', fetchHistory, { refreshInterval: 5000 });

  const formatCooldown = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSubmitSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: responseData, error } = await supabase.functions.invoke<AddSongResponse>(
        'adicionar-musica',
        {
          body: { youtube_url: youtubeUrl }, // ✅ sem JSON.stringify
        }
      );

      if (error) throw error;
      if (!responseData) {
        setMessage({ type: 'error', text: 'Resposta inválida do servidor.' });
        return;
      }

      if (responseData.error) {
        setMessage({ type: 'error', text: responseData.error });
      } else if (responseData.message) {
        setMessage({ type: 'success', text: responseData.message });
        setYoutubeUrl('');
        mutateQueue();
      }

      if (typeof responseData.cooldown === 'number' && responseData.cooldown > 0) {
        setCooldown(responseData.cooldown);
        localStorage.setItem('jukeboxCooldown', (Date.now() + responseData.cooldown).toString());
      }
    } catch (err) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: err.message });
      } else {
        setMessage({ type: 'error', text: 'Ocorreu um erro desconhecido.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Atualiza cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => {
        const next = prev - 1000;
        if (next <= 0) {
          localStorage.removeItem('jukeboxCooldown');
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const currentSong = queue?.[0] ?? null;
  const nextSongs = queue?.slice(1) ?? [];

  return (
    <div className="p-6 animate-fade-in space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Jukebox Coletiva</h1>
        <p className="text-gray-500 dark:text-gray-400">Adicione uma música do YouTube à fila para tocar para todos!</p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmitSong} className="max-w-2xl mx-auto rounded-lg border bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={e => setYoutubeUrl(e.target.value)}
            required
            className="w-full pl-10 p-3 rounded-lg border bg-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || cooldown > 0}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={16} />}
          {cooldown > 0 ? `Aguarde ${formatCooldown(cooldown)}` : 'Enviar'}
        </button>
      </form>

      {message.text && (
        <p className={`text-center font-semibold ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
          {message.text}
        </p>
      )}

      {/* Música atual */}
      {currentSong && (
        <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
          <div className="relative w-full lg:w-1/2 aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
            {currentSong.thumbnail_url ? (
              <Image
                src={currentSong.thumbnail_url}
                alt={currentSong.song_title ?? 'Música'}
                fill
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gray-900 text-white">
                <Music size={64} />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-2xl font-bold">{currentSong.song_title ?? 'Título indisponível'}</h2>
            <p className="text-gray-500 dark:text-gray-400">Adicionado por: {currentSong.profiles?.nome ?? 'Desconhecido'}</p>
            <p className="text-green-500 font-semibold flex items-center gap-1"><Music size={16} /> Tocando agora</p>
          </div>
        </div>
      )}

      {/* Próximas músicas + histórico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Próximas músicas</h3>
          <div className="rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 p-4 max-h-[400px] overflow-y-auto">
            {nextSongs.length === 0 ? (
              <p className="text-gray-500">A fila está vazia.</p>
            ) : (
              <ul className="space-y-2">
                {nextSongs.map(item => (
                  <li key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                    {item.thumbnail_url ? (
                      <Image src={item.thumbnail_url} alt={item.song_title ?? 'Música'} width={48} height={48} sizes="48px" className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-12 w-12 bg-gray-900 text-white rounded">
                        <Music size={16} />
                      </div>
                    )}
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{item.song_title ?? 'Título indisponível'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Adicionado por: {item.profiles?.nome ?? 'Desconhecido'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold">Últimas músicas tocadas</h3>
          <div className="rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 p-4 max-h-[400px] overflow-y-auto">
            {history && history.length > 0 ? (
              <ul className="space-y-2">
                {history.map(item => (
                  <li key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                    {item.thumbnail_url ? (
                      <Image src={item.thumbnail_url} alt={item.song_title ?? 'Música'} width={48} height={48} sizes="48px" className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-12 w-12 bg-gray-900 text-white rounded">
                        <Music size={16} />
                      </div>
                    )}
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{item.song_title ?? 'Título indisponível'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Adicionado por: {item.profiles?.nome ?? 'Desconhecido'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Nenhuma música foi tocada ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
