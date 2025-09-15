import type { NextRequest } from 'next/server';

const clientId = process.env.SPOTIFY_CLIENT_ID!;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

async function getAccessToken(): Promise<string> {
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) {
    throw new Error('Falha ao obter token do Spotify');
  }

  const data = await resp.json();
  return data.access_token;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) return new Response(JSON.stringify({ error: 'Query vazia' }), { status: 400 });

  try {
    const token = await getAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify(errorData), { status: response.status });
    }

    const data = await response.json();
    // Retorna apenas os itens de música
    return new Response(JSON.stringify(data.tracks.items));
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
}
