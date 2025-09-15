import type { NextRequest } from 'next/server';
import yts from 'yt-search';

interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  url: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    if (!q) return new Response(JSON.stringify({ error: 'Missing query parameter "q"' }), { status: 400 });

    const r = await yts(q);
    const videos: YouTubeVideo[] = r.videos.map((video) => ({
      videoId: video.videoId,
      title: video.title,
      thumbnail: video.thumbnail,
      url: video.url,
    }));

    return new Response(JSON.stringify(videos));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error(err);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
