import { NextResponse } from 'next/server';

type SpotifySearchResponse = {
  tracks: {
    items: {
      id: string;
      name: string;
      album: { images: { url: string }[] };
      artists: { name: string }[];
      external_urls: { spotify: string };
    }[];
  };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query é obrigatória.' }, { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Variáveis de ambiente do Spotify não configuradas.' }, { status: 500 });
  }

  try {
    // 1️⃣ Obter token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2️⃣ Buscar músicas
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data: SpotifySearchResponse = await searchRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Erro na API Spotify:', err);
    return NextResponse.json({ error: 'Erro ao buscar músicas no Spotify.' }, { status: 500 });
  }
}
