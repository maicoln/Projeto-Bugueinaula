'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Music, SkipForward, Trash2, ListMusic, PlayCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

type ReactPlayerPropsCustom = {
  url: string;
  playing?: boolean;
  controls?: boolean;
  width?: string | number;
  height?: string | number;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
};

const ReactPlayer = dynamic<ReactPlayerPropsCustom>(
  () => import('react-player').then(mod => mod.default),
  { ssr: false }
);

type SupabaseQueueItem = {
  id: number;
  song_title: string | null;
  youtube_url: string;
  status: 'playing' | 'queued' | 'played' | 'skipped';
  profiles: { nome: string }[] | { nome: string } | null;
};

type JukeboxQueueItem = {
  id: number;
  song_title: string | null;
  youtube_url: string;
  status: 'playing' | 'queued' | 'played' | 'skipped';
  profiles: { nome: string } | null;
};

// Helper para extrair o nome do usuário
function getUserNome(profiles: { nome: string } | { nome: string }[] | null): string {
  if (!profiles) return 'Desconhecido';
  if (Array.isArray(profiles)) return profiles[0]?.nome ?? 'Desconhecido';
  return profiles.nome ?? 'Desconhecido';
}

export default function JukeboxPlayerClientPage() {
  const [loading, setLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState<JukeboxQueueItem | null>(null);
  const [queue, setQueue] = useState<JukeboxQueueItem[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [newSongUrl, setNewSongUrl] = useState('');

  // Função para buscar a fila
  const fetchQueue = useCallback(async () => {
    const { data, error } = await supabase
      .from('jukebox_queue')
      .select(`id, song_title, youtube_url, status, profiles ( nome )`)
      .in('status', ['playing', 'queued'])
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.error('Erro ao buscar a fila:', error);
      if (loading) setLoading(false);
      return;
    }

    const songs: JukeboxQueueItem[] = (data as SupabaseQueueItem[]).map(item => ({
      id: item.id,
      song_title: item.song_title,
      youtube_url: item.youtube_url,
      status: item.status,
      profiles: Array.isArray(item.profiles) ? item.profiles[0] ?? null : item.profiles ?? null,
    }));

    const playingSong = songs.find(s => s.status === 'playing');
    const queuedSongs = songs.filter(s => s.status === 'queued');
    let nowPlaying = playingSong;

    if (!nowPlaying && queuedSongs.length > 0) {
      nowPlaying = queuedSongs[0];
      await supabase
        .from('jukebox_queue')
        .update({ status: 'playing' })
        .eq('id', nowPlaying.id);
    }

    setCurrentSong(prev => (prev?.id !== nowPlaying?.id ? nowPlaying || null : prev));
    setQueue(prev => {
      const newQueue = queuedSongs.filter(s => s.id !== nowPlaying?.id);
      if (JSON.stringify(prev.map(q => q.id)) !== JSON.stringify(newQueue.map(q => q.id))) {
        return newQueue;
      }
      return prev;
    });

    if (loading) setLoading(false);
  }, [loading]);

  // Polling leve para atualização imediata
  useEffect(() => {
    void fetchQueue(); // busca inicial
    const interval = setInterval(() => void fetchQueue(), 1000); // polling 1s
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Adicionar música
  const handleAddSong = async () => {
    if (!newSongUrl) return;
    await supabase.from('jukebox_queue').insert({
      youtube_url: newSongUrl,
      song_title: newSongUrl,
      status: 'queued',
      profiles: { nome: 'Você' } // aqui você pode colocar o nome real do usuário se tiver
    });
    setNewSongUrl('');
    void fetchQueue(); // atualiza imediatamente
  };

  // Próxima música
  const handlePlayNext = async () => {
    const songToFinish = currentSong;
    if (!songToFinish) return;

    setIsPlaying(true);
    const nextSong = queue[0];

    if (nextSong) {
      await Promise.all([
        supabase.from('jukebox_queue').update({ status: 'played' }).eq('id', songToFinish.id),
        supabase.from('jukebox_queue').update({ status: 'playing' }).eq('id', nextSong.id),
      ]);
    } else {
      await supabase.from('jukebox_queue').update({ status: 'played' }).eq('id', songToFinish.id);
      setIsPlaying(false);
    }
    void fetchQueue(); // atualiza imediatamente
  };

  // Remover música
  const handleRemoveFromQueue = async (songId: number) => {
    if (window.confirm('Tem certeza que deseja remover esta música da fila?')) {
      await supabase.from('jukebox_queue').delete().eq('id', songId);
      void fetchQueue(); // atualiza imediatamente
    }
  };

  if (loading) return <div className="p-6 text-center">Carregando a Jukebox...</div>;

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Jukebox Colaborativa</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Player */}
        <div className="lg:col-span-2">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-2xl bg-black">
            {currentSong && hasInteracted ? (
              <ReactPlayer
                url={currentSong.youtube_url}
                width="100%"
                height="100%"
                playing={isPlaying}
                controls
                onEnded={() => void handlePlayNext()}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                {currentSong ? (
                  <button
                    onClick={() => {
                      setHasInteracted(true);
                      setIsPlaying(true);
                    }}
                    className="flex items-center gap-3 rounded-full bg-blue-600 px-8 py-4 text-white font-bold text-lg transition hover:scale-105"
                  >
                    <PlayCircle size={32} /> Iniciar Jukebox
                  </button>
                ) : (
                  <div className="text-gray-500 text-center">
                    <Music size={48} />
                    <p className="mt-4">A fila está vazia.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {currentSong && (
            <div className="mt-4 p-4 rounded-lg bg-white dark:bg-gray-800">
              <p className="text-sm text-gray-500">Tocando agora:</p>
              <h2 className="text-2xl font-bold mt-1">{currentSong.song_title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Adicionado por: {getUserNome(currentSong?.profiles)}
              </p>
              <button
                onClick={() => void handlePlayNext()}
                disabled={queue.length === 0}
                className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                <SkipForward size={16} /> Próxima Música
              </button>
            </div>
          )}
        </div>

        {/* Fila */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <ListMusic />
              <h3 className="text-xl font-bold">Próximas na Fila ({queue.length})</h3>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="URL do vídeo"
                value={newSongUrl}
                onChange={e => setNewSongUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none"
              />
              <button
                onClick={() => void handleAddSong()}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition"
              >
                Adicionar
              </button>
            </div>
            {queue.length > 0 ? (
              <ul className="space-y-3">
                {queue.map((item, index) => (
                  <li key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50">
                    <span className="font-bold text-gray-400">{index + 1}</span>
                    <div className="flex-grow">
                      <p className="font-semibold text-sm">{item.song_title}</p>
                      <p className="text-xs text-gray-500">Por: {getUserNome(item.profiles)}</p>
                    </div>
                    <button onClick={() => void handleRemoveFromQueue(item.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">A fila está vazia.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
