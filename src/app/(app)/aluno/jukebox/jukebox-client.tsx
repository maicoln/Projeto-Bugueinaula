'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { Youtube, Music, Send, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

type Profile = { nome: string | null };

type JukeboxQueueItem = {
  id: number;
  song_title: string | null;
  thumbnail_url: string | null;
  profiles: Profile | Profile[] | null;
};

type SupabaseFunctionError = Error & {
  context?: { body?: { error?: string } };
};

function getUserNome(profiles: Profile | Profile[] | null): string {
  if (!profiles) return 'Desconhecido';
  if (Array.isArray(profiles)) return profiles[0]?.nome ?? 'Desconhecido';
  return profiles.nome ?? 'Desconhecido';
}

async function fetchQueue(): Promise<JukeboxQueueItem[]> {
  const { data, error } = await supabase
    .from('jukebox_queue')
    .select(`id, song_title, thumbnail_url, profiles ( nome )`)
    .in('status', ['queued', 'playing'])
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data.map(item => ({
    id: item.id,
    song_title: item.song_title,
    thumbnail_url: item.thumbnail_url,
    profiles: Array.isArray(item.profiles) ? item.profiles[0] ?? null : item.profiles ?? null,
  }));
}

async function fetchHistory(): Promise<JukeboxQueueItem[]> {
  const { data, error } = await supabase
    .from('jukebox_queue')
    .select(`id, song_title, thumbnail_url, profiles ( nome )`)
    .eq('status', 'played')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  return data.map(item => ({
    id: item.id,
    song_title: item.song_title,
    thumbnail_url: item.thumbnail_url,
    profiles: Array.isArray(item.profiles) ? item.profiles[0] ?? null : item.profiles ?? null,
  }));
}

export default function JukeboxClientPage() {
  const { data: queue, mutate: mutateQueue } = useSWR<JukeboxQueueItem[]>('jukebox_queue', fetchQueue, { refreshInterval: 1000 });
  const { data: history } = useSWR<JukeboxQueueItem[]>('jukebox_history', fetchHistory, { refreshInterval: 5000 });

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmitSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const { data, error } = await supabase.functions.invoke('adicionar-musica', { body: { youtube_url: youtubeUrl } });
      if (error) throw error;

      setMessage({ type: 'success', text: data.message });
      setYoutubeUrl('');
      mutateQueue();
    } catch (err) {
      const error = err as SupabaseFunctionError;
      setMessage({ type: 'error', text: error.context?.body?.error || error.message || 'Ocorreu um erro desconhecido.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSong = queue?.[0] ?? null;
  const nextSongs = queue?.slice(1) ?? [];

  return (
    <div className="p-6 animate-fade-in space-y-8">
      {/* Cabeçalho */}
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
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={16} />}
          Enviar
        </button>
      </form>

      {/* Player central */}
      {currentSong && (
        <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
          <div className="relative w-full lg:w-1/2 aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
            {currentSong.thumbnail_url ? (
              <Image src={currentSong.thumbnail_url} alt={currentSong.song_title ?? 'Música'} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gray-900 text-white">
                <Music size={64} />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-2xl font-bold">{currentSong.song_title ?? 'Título indisponível'}</h2>
            <p className="text-gray-500 dark:text-gray-400">Adicionado por: {getUserNome(currentSong.profiles)}</p>
            <p className="text-green-500 font-semibold flex items-center gap-1"><Music size={16} /> Tocando agora</p>
          </div>
        </div>
      )}

      {/* Grid fila + histórico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fila */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Próximas músicas</h3>
          <div className="rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 p-4 max-h-[400px] overflow-y-auto">
            {nextSongs.length === 0 ? (
              <p className="text-gray-500">A fila está vazia.</p>
            ) : (
              <ul className="space-y-2">
                {nextSongs.map((item, index) => (
                  <li key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                    {item.thumbnail_url && <Image src={item.thumbnail_url} alt={item.song_title ?? 'Música'} width={48} height={48} className="h-12 w-12 rounded object-cover" />}
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{item.song_title ?? 'Título indisponível'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Adicionado por: {getUserNome(item.profiles)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Histórico */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Últimas músicas tocadas</h3>
          <div className="rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 p-4 max-h-[400px] overflow-y-auto">
            {!history || history.length === 0 ? (
              <p className="text-gray-500">Nenhuma música tocada ainda.</p>
            ) : (
              <ul className="space-y-2">
                {history.map(item => (
                  <li key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                    {item.thumbnail_url && <Image src={item.thumbnail_url} alt={item.song_title ?? 'Música'} width={48} height={48} className="h-12 w-12 rounded object-cover" />}
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{item.song_title ?? 'Título indisponível'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Adicionado por: {getUserNome(item.profiles)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
