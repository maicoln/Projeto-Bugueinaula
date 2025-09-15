import { NextRequest, NextResponse } from 'next/server';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  throw new Error('Por favor, configure SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET no .env');
}

async function getSpotifyAccessToken(): Promise<string> {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao gerar token Spotify: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Parâmetro "q" é obrigatório' }, { status: 400 });
  }

  try {
    const token = await getSpotifyAccessToken();
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!searchRes.ok) {
      const text = await searchRes.text();
      throw new Error(`Erro na busca Spotify: ${text}`);
    }

    const data = await searchRes.json();
    // Retorna somente os tracks
    return NextResponse.json(data.tracks);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
