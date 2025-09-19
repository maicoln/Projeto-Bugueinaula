import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface AddSongPayload {
  youtube_url: string;
}

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: AddSongPayload = await req.json();
    const youtubeUrl = payload.youtube_url;
    if (!youtubeUrl) throw new Error("URL do YouTube é obrigatória.");

    // 1. Cria um cliente temporário APENAS para validar o usuário
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    // 2. Cria o cliente ADMIN para TODAS as operações de banco de dados
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // =======================================================================
    // MUDANÇA PRINCIPAL: Usamos o cliente ADMIN para buscar o perfil.
    // Ele tem permissão para ler qualquer perfil, então a consulta funciona.
    // =======================================================================
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('turma_id')
      .eq('id', user.id) // Usamos o ID do usuário já autenticado
      .single();

    if (profileError || !profileData?.turma_id) {
      console.error("Erro ao buscar perfil com admin:", profileError);
      throw new Error("Não foi possível determinar a turma do usuário.");
    }
    const turmaId = profileData.turma_id;
    // =======================================================================

    const videoId = getYouTubeVideoId(youtubeUrl);
    if (!videoId) throw new Error("URL do YouTube inválida.");

    // Cooldown: última música adicionada pelo usuário
    const { data: lastSubmission } = await supabaseAdmin
      .from('jukebox_queue')
      .select('created_at')
      .eq('aluno_id', user.id)
      .eq('turma_id', turmaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastSubmission) {
      const lastTime = new Date(lastSubmission.created_at).getTime();
      const diff = Date.now() - lastTime;
      const cooldownMs = 10 * 60 * 1000; // 10 minutos
      
      if (diff < cooldownMs) {
        return new Response(JSON.stringify({
          error: 'Você só pode adicionar uma música a cada 10 minutos.',
          cooldown: cooldownMs - diff // Retorna o tempo que AINDA falta
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Usando 200 para que o frontend possa processar a mensagem de erro e o cooldown
        });
      }
    }

    // Verifica se já há música na fila
    const { count: queuedCount } = await supabaseAdmin
      .from('jukebox_queue')
      .select('*', { count: 'exact', head: true })
      .eq('aluno_id', user.id)
      .eq('turma_id', turmaId)
      .eq('status', 'queued');

    if (queuedCount && queuedCount > 0) {
      return new Response(JSON.stringify({
        error: 'Você já tem uma música na fila. Espere ela tocar.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Busca dados do YouTube
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const youtubeResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`);
    if (!youtubeResponse.ok) throw new Error("Não foi possível obter dados do YouTube.");
    const youtubeData = await youtubeResponse.json();
    const videoDetails = youtubeData.items?.[0]?.snippet;
    if (!videoDetails) throw new Error("Vídeo não encontrado no YouTube.");

    // Insere música na fila
    const newSong = {
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      song_title: videoDetails.title,
      thumbnail_url: videoDetails.thumbnails?.default?.url ?? null,
      aluno_id: user.id,
      turma_id: turmaId, // AGORA VAI COM O VALOR CORRETO!
      status: 'queued'
    };

    const { error: insertError } = await supabaseAdmin.from('jukebox_queue').insert(newSong);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      message: "Música adicionada com sucesso!",
      cooldown: 10 * 60 * 1000 // Inicia novo cooldown de 10 min
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err) {
    const error = err as Error;
    console.error("Erro na Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});