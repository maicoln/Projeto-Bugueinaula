'use client';

import { useState } from 'react';
import { Youtube, Music, Send, Loader2 } from 'lucide-react';

interface YouTubeSnippet {
  title: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
}

interface YouTubeAPIResponse {
  items?: { snippet: YouTubeSnippet }[];
}

interface AddSongResponse {
  message?: string;
  error?: string;
  cooldown?: number;
}

export default function JukeboxTestPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [previewThumb, setPreviewThumb] = useState<string | null>(null);

  const fetchYouTubePreview = async (url: string) => {
    try {
      setPreviewTitle('Fetching title...');
      setPreviewThumb(null);

      const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
      if (!videoIdMatch) throw new Error('URL inválida');

      const videoId = videoIdMatch[1];
      const res = await fetch(`/api/youtube-preview?videoId=${videoId}`);
      if (!res.ok) throw new Error('Erro ao buscar vídeo');
      const data: YouTubeAPIResponse = await res.json();

      console.log('DEBUG: YouTube API response:', data);

      const snippet = data.items?.[0]?.snippet;
      if (!snippet) throw new Error('Vídeo não encontrado');

      setPreviewTitle(snippet.title);
      setPreviewThumb(
        snippet.thumbnails?.high?.url ??
        snippet.thumbnails?.medium?.url ??
        snippet.thumbnails?.default?.url ??
        null
      );
    } catch (err: unknown) {
      setPreviewTitle(null);
      setPreviewThumb(null);
      if (err instanceof Error) console.error('Erro ao buscar preview do YouTube:', err.message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setYoutubeUrl(url);
    if (url) fetchYouTubePreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl) return;

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/adicionar-musica', {
        method: 'POST',
        body: JSON.stringify({ youtube_url: youtubeUrl }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data: AddSongResponse = await res.json();
      if (data.error) setMessage({ type: 'error', text: data.error });
      else setMessage({ type: 'success', text: data.message ?? 'Sucesso!' });
    } catch (err: unknown) {
      if (err instanceof Error) setMessage({ type: 'error', text: err.message });
      else setMessage({ type: 'error', text: 'Erro desconhecido' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={youtubeUrl}
            onChange={handleChange}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full pl-10 p-3 rounded-lg border"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={16} />}
          Enviar
        </button>
      </form>

      {message.text && (
        <p className={`mt-2 font-semibold ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
          {message.text}
        </p>
      )}

      {previewTitle && (
        <div className="mt-4 p-4 border rounded flex items-center gap-4">
          {previewThumb ? (
            <img src={previewThumb} alt={previewTitle} className="w-24 h-24 object-cover rounded" />
          ) : (
            <div className="w-24 h-24 bg-gray-300 flex items-center justify-center rounded">
              <Music size={24} />
            </div>
          )}
          <p className="font-semibold">{previewTitle}</p>
        </div>
      )}
    </div>
  );
}
