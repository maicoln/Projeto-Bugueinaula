'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { Music, Send, Loader2, AlertCircle, Search } from 'lucide-react';
import Image from 'next/image';

type Profile = { nome: string | null };
type JukeboxQueueItem = { id: number, song_title: string | null, thumbnail_url: string | null, youtube_url: string, profiles: Profile | Profile[] | null };
type SpotifyTrack = { id: string, name: string, album: { images: { url: string }[] }, artists: { name: string }[] };

function getUserNome(profiles: Profile | Profile[] | null) {
  if (!profiles) return 'Desconhecido';
  if (Array.isArray(profiles)) return profiles[0]?.nome ?? 'Desconhecido';
  return profiles.nome ?? 'Desconhecido';
}

async function fetchQueue(): Promise<JukeboxQueueItem[]> {
  const { data, error } = await supabase
    .from('jukebox_queue')
    .select(`id, song_title, youtube_url, thumbnail_url, profiles`)
    .in('status', ['queued', 'playing'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export default function JukeboxClientPage() {
  const { data: queue, mutate: mutateQueue } = useSWR('jukebox_queue', fetchQueue, { refreshInterval: 1000 });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error('Erro ao buscar músicas no Spotify');
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally { setIsSearching(false); }
  };

  const handleAddTrack = async (track: SpotifyTrack) => {
    try {
      const { getYoutubeUrl } = await import('@/lib/getYoutubeUrl');
      const { url, thumbnail } = await getYoutubeUrl(track.name, track.artists[0].name);

      await supabase.from('jukebox_queue').insert({
        youtube_url: url,
        song_title: track.name,
        thumbnail_url: thumbnail,
        status: 'queued',
        profiles: { nome: 'Você' }
      });

      setMessage({ type: 'success', text: `"${track.name}" adicionada à fila!` });
      mutateQueue();
    } catch (err) {
      setMessage({ type: 'error', text: 'Não foi possível adicionar a música' });
    }
  };

  return (
    <div className="p-6 space-y-8">
      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar música" />
        <button type="submit" disabled={isSearching}>Buscar</button>
      </form>

      <div className="grid gap-2">
        {searchResults.map(track => (
          <div key={track.id} className="flex items-center gap-2 p-2 border rounded">
            {track.album.images[0]?.url && <Image src={track.album.images[0].url} alt={track.name} width={48} height={48} />}
            <div className="flex-1">
              <p>{track.name}</p>
              <p className="text-sm text-gray-500">{track.artists.map(a => a.name).join(', ')}</p>
            </div>
            <button onClick={() => handleAddTrack(track)}>Adicionar</button>
          </div>
        ))}
      </div>

      <div>
        <h3>Fila de reprodução</h3>
        <ul>
          {queue?.map(q => (
            <li key={q.id}>{q.song_title} - {getUserNome(q.profiles)}</li>
          ))}
        </ul>
      </div>

      {message.text && <div>{message.text}</div>}
    </div>
  );
}
