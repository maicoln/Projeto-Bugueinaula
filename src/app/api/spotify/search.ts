// src/pages/api/spotify/search.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const clientId = process.env.SPOTIFY_CLIENT_ID!;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

// Função para obter token de acesso do Spotify
async function getAccessToken(): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error('Falha ao obter token do Spotify');
  }

  const data = await res.json();
  return data.access_token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Missing query parameter "q"' });
    }

    const token = await getAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    // Retorna apenas os itens das músicas
    return res.status(200).json(data.tracks.items);
  } catch (err) {
    console.error('Erro ao buscar músicas no Spotify:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
