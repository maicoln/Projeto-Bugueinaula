import type { NextRequest } from 'next/server';
import ytSearch from 'yt-search';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  url: string;
  image: string;
  duration: string;
  timestamp: string;
  author: {
    name: string;
    url: string;
  };
}

interface YTSearchVideoRaw {
  videoId: string;
  title: string;
  description: string;
  url: string;
  image: string;
  duration: string | number;
  timestamp: string;
  author: { name: string; url: string };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing query parameter "q"' }), { status: 400 });
  }

  try {
    const searchResult = await ytSearch(q);

    // Map para tipagem correta
    const videos: YouTubeVideo[] = (searchResult.videos || []).map((video: YTSearchVideoRaw) => ({
      videoId: video.videoId,
      title: video.title,
      description: video.description,
      url: video.url,
      image: video.image,
      duration: video.duration.toString(),
      timestamp: video.timestamp,
      author: { name: video.author.name, url: video.author.url },
    }));

    return new Response(JSON.stringify({ videos }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Erro ao buscar vídeos no YouTube:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
