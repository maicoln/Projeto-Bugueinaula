'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { Music, Send, Loader2, AlertCircle, Search } from 'lucide-react';
import Image from 'next/image';

type Profile = { nome: string | null };
type JukeboxQueueItem = { id: number; song_title: string; youtube_url: string; thumbnail_url: string; profiles: Profile | Profile[] | null };
type SpotifyTrack = { id: string; name: string; artists: string[]; thumbnail: string; youtubeUrl: string | null };

function getUserNome(profiles: Profile | Profile[] | null) {
  if (!profiles) return 'Desconhecido';
  if (Array.isArray(profiles)) return profiles[0]?.nome ?? 'Desconhecido';
  return profiles.nome ?? 'Desconhecido';
}

// Fetch fila
async function fetchQueue(): Promise<JukeboxQueueItem[]> {
  const { data, error } = await supabase
    .from('jukebox_queue')
    .select('id, song_title, youtube_url, thumbnail_url, profiles ( nome )')
    .in('status', ['queued', 'playing'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

// Fetch histórico
async function fetchHistory(): Promise<JukeboxQueueItem[]> {
  const { data, error } = await supabase
    .from('jukebox_queue')
    .select('id, song_title, youtube_url, thumbnail_url, profiles ( nome )')
    .eq('status', 'played')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

export default function JukeboxClientPage() {
  const { data: queue, mutate: mutateQueue } = useSWR('jukebox_queue', fetchQueue, { refreshInterval: 1000 });
  const { data: history } = useSWR('jukebox_history', fetchHistory, { refreshInterval: 5000 });

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
      if (!res.ok) throw new Error('Erro ao buscar músicas no Spotify');
      const data: SpotifyTrack[] = await res.json();
      setSearchResults(data);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTrack = async (track: SpotifyTrack) => {
    if (!track.youtubeUrl) {
      setMessage({ type: 'error', text: 'Não foi possível encontrar o link do YouTube desta música' });
      return;
    }

    try {
      await supabase.from('jukebox_queue').insert({
        youtube_url: track.youtubeUrl,
        song_title: track.name,
        thumbnail_url: track.thumbnail,
        status: 'queued',
        profiles: { nome: 'Você' },
      });
      setMessage({ type: 'success', text: `"${track.name}" adicionada à fila!` });
      mutateQueue();
    } catch (err) {
      setMessage({ type: 'error', text: 'Não foi possível adicionar a música à fila.' });
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Cabeçalho */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">Jukebox Coletiva</h1>
        <p className="text-gray-500">Busque músicas no Spotify e adicione à fila!</p>
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Digite música ou artista..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 p-3 border rounded"
          />
        </div>
        <button type="submit" disabled={isSearching} className="bg-blue-600 text-white px-4 rounded">
          {isSearching ? <Loader2 className="animate-spin" /> : 'Buscar'}
        </button>
      </form>

      {/* Resultados */}
      {searchResults.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <h3 className="font-bold mb-2">Resultados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {searchResults.map(track => (
              <div key={track.id} className="flex items-center gap-2 border rounded p-2 hover:bg-gray-100 transition">
                {track.thumbnail && <Image src={track.thumbnail} width={48} height={48} alt={track.name} className="rounded" />}
                <div className="flex-1">
                  <p className="font-semibold">{track.name}</p>
                  <p className="text-xs text-gray-500">{track.artists.join(', ')}</p>
                </div>
                <button onClick={() => handleAddTrack(track)} className="bg-green-600 text-white px-3 py-1 rounded">Adicionar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
