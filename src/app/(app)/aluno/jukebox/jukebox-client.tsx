'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Youtube, Music, Send, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

type JukeboxQueueItem = {
  id: number;
  song_title: string | null;
  thumbnail_url: string | null;
  profiles: { nome: string } | { nome: string }[] | null;
};

type SupabaseFunctionError = Error & {
  context?: {
    body?: {
      error?: string;
    };
  };
};

// Helper para extrair o nome do usuário
function getUserNome(profiles: { nome: string } | { nome: string }[] | null): string {
  if (!profiles) return 'Desconhecido';
  if (Array.isArray(profiles)) return profiles[0]?.nome ?? 'Desconhecido';
  return profiles.nome ?? 'Desconhecido';
}

export default function JukeboxClientPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [queue, setQueue] = useState<JukeboxQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

  // Função para buscar a fila
  const fetchQueue = useCallback(async () => {
    const { data, error } = await supabase
      .from('jukebox_queue')
      .select(`id, song_title, thumbnail_url, profiles ( nome )`)
      .in('status', ['queued', 'playing'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar a fila:', error);
      setMessage({ type: 'error', text: 'Não foi possível carregar a fila de músicas.' });
    } else {
      setQueue(data as JukeboxQueueItem[]);
    }
    setLoadingQueue(false);
  }, []);

  // Polling para atualizar a fila a cada 1 segundo
  useEffect(() => {
    void fetchQueue(); // busca inicial
    const interval = setInterval(() => void fetchQueue(), 1000); // polling
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleSubmitSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const { data, error } = await supabase.functions.invoke('adicionar-musica', {
        body: { youtube_url: youtubeUrl },
      });

      if (error) throw error;

      setMessage({ type: 'success', text: data.message });
      setYoutubeUrl('');
      void fetchQueue(); // atualiza imediatamente após envio
    } catch (err) {
      const error = err as SupabaseFunctionError;
      const errorMessage = error.context?.body?.error || error.message || 'Ocorreu um erro desconhecido.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Jukebox Coletiva</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Adicione uma música do YouTube à fila para tocar para todos!
        </p>
      </div>

      <form onSubmit={handleSubmitSong} className="mb-8 max-w-lg rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <label htmlFor="youtube-url" className="block text-sm font-medium mb-1">Link do YouTube</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <Youtube className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-0" />
            <input
              id="youtube-url"
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              className="relative w-full rounded-lg border bg-transparent p-3 pl-10 shadow-sm dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={16} />}
            <span>Enviar</span>
          </button>
        </div>
        {message.text && (
          <div className={`mt-4 flex items-center rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" /> {message.text}
          </div>
        )}
      </form>

      {/* Fila de Músicas */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Próximas Músicas</h2>
        {loadingQueue ? (
          <p className="text-gray-500">A carregar a fila...</p>
        ) : queue.length === 0 ? (
          <p className="text-gray-500">A fila está vazia. Seja o primeiro a adicionar uma música!</p>
        ) : (
          <ul className="space-y-3">
            {queue.map((item, index) => (
              <li key={item.id} className="flex items-center gap-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                <span className="text-xl font-bold text-gray-400">{index + 1}</span>
                {item.thumbnail_url && (
                  <Image 
                    src={item.thumbnail_url} 
                    alt={`Thumbnail da música ${item.song_title}`}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded object-cover" 
                  />
                )}
                <div className="flex-grow">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{item.song_title || 'Título indisponível'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Adicionado por: {getUserNome(item.profiles)}</p>
                </div>
                {index === 0 && (
                  <div className="flex items-center gap-2 text-green-500 text-sm font-semibold pr-2">
                    <Music size={16} />
                    <span>A tocar</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
