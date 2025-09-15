import type { NextRequest } from 'next/server';

interface SpotifyTrack {
  id: string;
  name: string;
  album: { images: { url: string }[] };
  artists: { name: string }[];
  external_urls: { spotify: string };
}

const clientId = process.env.SPOTIFY_CLIENT_ID!;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('Falha ao obter token do Spotify');
  const data = await res.json();
  return data.access_token;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    if (!q) return new Response(JSON.stringify({ error: 'Missing query parameter "q"' }), { status: 400 });

    const token = await getAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      const errData = await response.json();
      return new Response(JSON.stringify(errData), { status: response.status });
    }

    const data: { tracks: { items: SpotifyTrack[] } } = await response.json();
    return new Response(JSON.stringify(data.tracks.items));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error(err);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
