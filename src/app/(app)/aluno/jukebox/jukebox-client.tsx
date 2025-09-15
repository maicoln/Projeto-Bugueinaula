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
      const data = await res.json();
      setSearchResults(data.tracks.items);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTrack = async (track: SpotifyTrack) => {
    try {
      await supabase.from('jukebox_queue').insert({
        youtube_url: track.external_urls.spotify, // aqui você pode usar spotify link
        song_title: track.name,
        thumbnail_url: track.album.images[0]?.url,
        status: 'queued',
        profiles: { nome: 'Você' } // ou perfil real
      });
      setMessage({ type: 'success', text: `"${track.name}" adicionada à fila!` });
      mutateQueue();
    } catch (err) {
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

      {/* Mensagem global */}
      {message.text && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-md shadow-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} flex items-center gap-2`}>
          <AlertCircle className="h-5 w-5" /> {message.text}
        </div>
      )}
    </div>
  );
}
