// Ficheiro: supabase/functions/adicionar-musica/index.ts

import { createClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface AddSongPayload {
  youtube_url: string;
}

interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

interface YouTubeSnippet {
  title: string;
  thumbnails?: {
    default?: YouTubeThumbnail;
    medium?: YouTubeThumbnail;
    high?: YouTubeThumbnail;
  };
}

interface YouTubeItem {
  snippet?: YouTubeSnippet;
}

interface YouTubeResponse {
  items?: YouTubeItem[];
}

interface NewSong {
  youtube_url: string;
  song_title: string | null;
  thumbnail_url: string | null;
  aluno_id: string;
  turma_id: string;
  status: 'queued';
}

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = (url || '').match(regExp);
  if (match && match[2] && match[2].length >= 10) return match[2];

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1);
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: AddSongPayload | null = await req.json().catch(() => null);
    console.log('Payload recebido:', payload);

    if (!payload || typeof payload.youtube_url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Payload inválido ou youtube_url ausente', received: payload }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const youtubeUrl = payload.youtube_url;
    const videoId = getYouTubeVideoId(youtubeUrl);
    console.log('videoId extraído:', videoId);

    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Não foi possível extrair videoId do YouTube.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // --- autenticação do usuário
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header ausente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userResp, error: userErr } = await supabaseClient.auth.getUser();
    console.log('auth.getUser ->', { userResp, userErr });
    const user: User | null = userResp?.user ?? null;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // --- admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('turma_id')
      .eq('id', user.id)
      .single();

    console.log('profileData, profileError ->', { profileData, profileError });

    if (profileError || !profileData?.turma_id) {
      return new Response(JSON.stringify({ error: 'Não foi possível obter turma_id do perfil.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const turmaId: string = profileData.turma_id;

    // --- YouTube API
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      return new Response(JSON.stringify({ error: 'YOUTUBE_API_KEY não configurada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const youtubeUrlApi = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`;
    const youtubeResponse = await fetch(youtubeUrlApi);
    const youtubeText = await youtubeResponse.text();
    console.log('YouTube raw response:', youtubeText.slice(0, 500));

    let youtubeData: YouTubeResponse;
    try {
      youtubeData = JSON.parse(youtubeText) as YouTubeResponse;
    } catch {
      return new Response(JSON.stringify({ error: 'Resposta inválida da YouTube API.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    const videoDetails: YouTubeSnippet | undefined = youtubeData.items?.[0]?.snippet;
    if (!videoDetails) {
      return new Response(JSON.stringify({ error: 'Vídeo não encontrado na YouTube API.', youtubeData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const title: string | null = videoDetails.title ?? null;
    const thumbnail: string | null =
      videoDetails.thumbnails?.high?.url ??
      videoDetails.thumbnails?.medium?.url ??
      videoDetails.thumbnails?.default?.url ??
      null;

    const newSong: NewSong = {
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      song_title: title,
      thumbnail_url: thumbnail,
      aluno_id: user.id,
      turma_id: turmaId,
      status: 'queued',
    };

    console.log('newSong a inserir:', newSong);

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('jukebox_queue')
      .insert(newSong)
      .select();

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Erro ao salvar a música', detail: insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(
      JSON.stringify({
        message: 'Música adicionada com sucesso!',
        inserted: Array.isArray(inserted) ? inserted[0] : inserted,
        debug: { videoId, title, thumbnail },
        cooldown: 10 * 60 * 1000,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    console.error('Erro geral na function:', err);
    const error = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
