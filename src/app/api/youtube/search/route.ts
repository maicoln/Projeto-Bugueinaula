import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q');
    if (!q) return new Response(JSON.stringify({ error: 'Query "q" obrigatória' }), { status: 400 });

    const apiKey = process.env.YOUTUBE_API_KEY!;
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(q)}&key=${apiKey}`);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum vídeo encontrado' }), { status: 404 });
    }

    const video = data.items[0];
    return new Response(JSON.stringify({ items: [{ url: `https://www.youtube.com/watch?v=${video.id.videoId}` }] }));
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Erro no YouTube API' }), { status: 500 });
  }
}
