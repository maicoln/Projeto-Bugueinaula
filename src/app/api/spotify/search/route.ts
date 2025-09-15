import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q');
    if (!q) return new Response(JSON.stringify({ error: 'Query "q" obrigatória' }), { status: 400 });

    // Obter token
    const tokenRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/spotify/getAccessToken`);
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) throw new Error('Não foi possível obter token Spotify');

    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errData = await res.json();
      return new Response(JSON.stringify(errData), { status: res.status });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data.tracks.items));
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
