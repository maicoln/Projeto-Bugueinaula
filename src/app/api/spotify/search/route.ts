import type { NextRequest } from 'next/server';
import yts from 'yt-search';

type SpotifyArtist = { name: string };
type SpotifyAlbum = { images: { url: string }[] };
type SpotifyTrackRaw = {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
};

type TrackResult = {
  id: string;
  name: string;
  artists: string[];
  thumbnail: string | null;
  youtubeUrl: string | null;
};

// Função para obter token de acesso do Spotify
async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

  if (!clientId || !clientSecret) {
    throw new Error('Por favor, configure SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET no .env');
  }

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
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
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (!q) {
      return new Response(JSON.stringify({ error: 'Parâmetro "q" é obrigatório' }), { status: 400 });
    }

    const token = await getSpotifyAccessToken();

    const spotifyResp = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!spotifyResp.ok) {
      const errorData = await spotifyResp.json();
      return new Response(JSON.stringify(errorData), { status: spotifyResp.status });
    }

    const spotifyData = await spotifyResp.json();
    const tracks: SpotifyTrackRaw[] = spotifyData.tracks.items;

    // Buscar link do YouTube para cada faixa
    const results: TrackResult[] = await Promise.all(
      tracks.map(async (track) => {
        const search = await yts(`${track.name} ${track.artists.map(a => a.name).join(' ')}`);
        const youtubeUrl = search?.videos[0]?.url || null;

        return {
          id: track.id,
          name: track.name,
          artists: track.artists.map(a => a.name),
          thumbnail: track.album.images[0]?.url || null,
          youtubeUrl,
        };
      })
    );

    return new Response(JSON.stringify({ tracks: results }), { status: 200 });
  } catch (err: unknown) {
    console.error('Erro ao buscar músicas no Spotify:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
