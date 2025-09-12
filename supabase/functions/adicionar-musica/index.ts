// Ficheiro: supabase/functions/adicionar-musica/index.ts (VERSÃO CORRIGIDA)

// O ambiente de build da Vercel (baseado em Node.js) não reconhece importações de URL do Deno.
// Esta diretiva faz com que o TypeScript ignore o erro na linha seguinte durante o build.
// A função executará corretamente no ambiente Deno, que entende a importação da URL.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface AddSongPayload {
  youtube_url: string;
}

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

Deno.serve(async (req: Request) => { // Adicionado tipo 'Request' para clareza
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: AddSongPayload = await req.json();
    const youtubeUrl = payload.youtube_url;
    const videoId = getYouTubeVideoId(youtubeUrl);

    if (!videoId) {
      throw new Error("URL do YouTube inválida.");
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("Utilizador não autenticado.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: lastSubmission, error: lastSubError } = await supabaseAdmin
      .from('jukebox_queue')
      .select('created_at')
      .eq('aluno_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastSubError && lastSubError.code !== 'PGRST116') {
        throw lastSubError;
    }
    
    if (lastSubmission && new Date(lastSubmission.created_at) > new Date(tenMinutesAgo)) {
        return new Response(JSON.stringify({ error: 'Você só pode adicionar uma música a cada 10 minutos.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429,
        });
    }

    const { count: queuedSongCount, error: queuedError } = await supabaseAdmin
      .from('jukebox_queue')
      .select('*', { count: 'exact', head: true })
      .eq('aluno_id', user.id)
      .eq('status', 'queued');

    if (queuedError) throw queuedError;
    if (queuedSongCount && queuedSongCount > 0) {
        return new Response(JSON.stringify({ error: 'Você já tem uma música na fila. Espere ela tocar.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409,
        });
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`;
    
    const youtubeResponse = await fetch(youtubeApiUrl);
    if (!youtubeResponse.ok) {
      throw new Error("Não foi possível obter os dados do vídeo do YouTube.");
    }
    const youtubeData = await youtubeResponse.json();
    const videoDetails = youtubeData.items[0]?.snippet;

    if (!videoDetails) {
        throw new Error("Vídeo não encontrado no YouTube.");
    }

    const newSong = {
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      song_title: videoDetails.title,
      thumbnail_url: videoDetails.thumbnails.default.url,
      aluno_id: user.id,
      status: 'queued'
    };

    const { error: insertError } = await supabaseAdmin.from('jukebox_queue').insert(newSong);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ message: "Música adicionada com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    const error = err as Error; // Tratamento de erro explícito
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
