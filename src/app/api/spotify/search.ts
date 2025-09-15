import type { NextApiRequest, NextApiResponse } from 'next';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: 'Query é obrigatória.' });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Variáveis de ambiente do Spotify não configuradas.' });
  }

  try {
    // 1️⃣ Obter token de acesso
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

    // 2️⃣ Fazer a busca no Spotify
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data: SpotifySearchResponse = await searchRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Erro na API Spotify:', err);
    return res.status(500).json({ error: 'Erro ao buscar músicas no Spotify.' });
  }
}
