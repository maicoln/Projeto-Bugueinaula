// src/app/(app)/professor/jukebox/jukebox-client.tsx
'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import { Music, SkipForward, Trash2, ListMusic, PlayCircle } from 'lucide-react';

const ReactPlayer = dynamic(() => import('react-player').then(mod => mod.default), { ssr: false });

type Profile = {
  nome: string | null;
};

type JukeboxQueueItem = {
  id: number;
  song_title: string | null;
  youtube_url: string;
  status: 'playing' | 'queued' | 'played' | 'skipped';
  profiles: Profile | null;
};

// Helper para extrair o nome do usuário
function getUserNome(profiles: Profile | Profile[] | null): string {
  if (!profiles) return 'Desconhecido';
  if (Array.isArray(profiles)) return profiles[0]?.nome ?? 'Desconhecido';
  return profiles.nome ?? 'Desconhecido';
}

// Fetcher tipado
async function fetchQueue(): Promise<JukeboxQueueItem[]> {
  const { data, error } = await supabase
    .from('jukebox_queue')
    .select(`id, song_title, youtube_url, status, profiles ( nome )`)
    .in('status', ['playing', 'queued'])
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map(item => ({
    id: item.id,
    song_title: item.song_title,
    youtube_url: item.youtube_url,
    status: item.status,
    profiles: Array.isArray(item.profiles) ? item.profiles[0] ?? null : item.profiles ?? null,
  }));
}

export default function JukeboxPlayerClientPage() {
  const { data: songs, mutate } = useSWR<JukeboxQueueItem[]>('jukebox_queue', fetchQueue, {
    refreshInterval: 1000, // Polling 1s
  });

  const [currentSong, setCurrentSong] = useState<JukeboxQueueItem | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Atualiza a música atual automaticamente
  useEffect(() => {
    if (!songs || songs.length === 0) return;
    const playingSong = songs.find(s => s.status === 'playing');
    const queuedSong = songs.find(s => s.status === 'queued');
    const nowPlaying = playingSong ?? queuedSong ?? null;
    setCurrentSong(prev => (prev?.id !== nowPlaying?.id ? nowPlaying : prev));
  }, [songs]);


  const handlePlayNext = async () => {
    if (!currentSong || !songs) return;

    const nextSong = songs.find(s => s.status === 'queued');

    if (nextSong) {
      await Promise.all([
        supabase.from('jukebox_queue').update({ status: 'played' }).eq('id', currentSong.id),
        supabase.from('jukebox_queue').update({ status: 'playing' }).eq('id', nextSong.id),
      ]);
    } else {
      await supabase.from('jukebox_queue').update({ status: 'played' }).eq('id', currentSong.id);
      setIsPlaying(false);
    }

    mutate(); // Atualiza imediatamente
  };

  const handleRemoveFromQueue = async (songId: number) => {
    if (!window.confirm('Tem certeza que deseja remover esta música da fila?')) return;
    await supabase.from('jukebox_queue').delete().eq('id', songId);
    mutate();
  };

  if (!songs) return <div className="p-6 text-center">Carregando a Jukebox...</div>;

  const queue = songs.filter(s => s.status === 'queued');

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
                onEnded={handlePlayNext}
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
                Adicionado por: {getUserNome(currentSong.profiles)}
              </p>
              <button
                onClick={handlePlayNext}
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
            {queue.length > 0 ? (
              <ul className="space-y-3">
                {queue.map((item, index) => (
                  <li key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50">
                    <span className="font-bold text-gray-400">{index + 1}</span>
                    <div className="flex-grow">
                      <p className="font-semibold text-sm">{item.song_title}</p>
                      <p className="text-xs text-gray-500">Por: {getUserNome(item.profiles)}</p>
                    </div>
                    <button onClick={() => handleRemoveFromQueue(item.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
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
