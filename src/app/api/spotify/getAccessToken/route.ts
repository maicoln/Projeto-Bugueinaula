export async function GET() {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!resp.ok) throw new Error('Não foi possível gerar token do Spotify');

    const data = await resp.json();
    return new Response(JSON.stringify({ access_token: data.access_token }));
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Erro ao gerar token Spotify' }), { status: 500 });
  }
}
