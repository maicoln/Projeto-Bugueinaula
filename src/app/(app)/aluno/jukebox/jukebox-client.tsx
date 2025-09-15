'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { Music, Send, Loader2, AlertCircle, Search } from 'lucide-react';
import Image from 'next/image';

type Profile = { nome: string | null };

type JukeboxQueueItem = {
  id: number;
  song_title: string | null;
  thumbnail_url: string | null;
  profiles: Profile | Profile[] | null;
};

type SpotifyTrack = {
  id: string;
  name: string;
  album: { images: { url: string }[] };
  artists: { name: string }[];
  external_urls: { spotify: string };
};

type SupabaseFunctionError = Error & { context?: { body?: { error?: string } } };

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
    .limit(10);
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

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const currentSong = queue?.[0] ?? null;
  const nextSongs = queue?.slice(1) ?? [];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error('Erro ao buscar músicas no Spotify.');
      const data: SpotifyTrack[] = await res.json();
      setSearchResults(data);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTrack = async (track: SpotifyTrack) => {
    try {
      await supabase.from('jukebox_queue').insert({
        youtube_url: track.external_urls.spotify,
        song_title: track.name,
        thumbnail_url: track.album.images[0]?.url,
        status: 'queued',
        profiles: { nome: 'Você' }
      });
      setMessage({ type: 'success', text: `"${track.name}" adicionada à fila!` });
      mutateQueue();
    } catch {
      setMessage({ type: 'error', text: 'Não foi possível adicionar a música.' });
    }
  };

  return (
    <div className="p-6 animate-fade-in space-y-8">
      {/* Cabeçalho */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Jukebox Coletiva</h1>
        <p className="text-gray-500 dark:text-gray-400">Busque músicas no Spotify e adicione à fila!</p>
      </div>

      {/* Formulário de busca */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto rounded-lg border bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Digite o nome da música ou artista..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            required
            className="w-full pl-10 p-3 rounded-lg border bg-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition"
        >
          {isSearching ? <Loader2 className="animate-spin" /> : <Send size={16} />}
          Buscar
        </button>
      </form>

      {/* Resultados da busca */}
      {searchResults.length > 0 && (
        <div className="max-w-3xl mx-auto space-y-4">
          <h3 className="text-xl font-bold">Resultados da busca</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {searchResults.map(track => (
              <div key={track.id} className="flex items-center gap-3 rounded-lg border p-3 shadow-sm hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/50 transition">
                {track.album.images[0]?.url && (
                  <Image src={track.album.images[0].url} alt={track.name} width={48} height={48} className="rounded object-cover" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{track.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{track.artists.map(a => a.name).join(', ')}</p>
                </div>
                <button
                  onClick={() => handleAddTrack(track)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg font-semibold text-sm"
                >
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* O restante do layout da fila + histórico continua igual */}
      {/* ... */}
    </div>
  );
}
