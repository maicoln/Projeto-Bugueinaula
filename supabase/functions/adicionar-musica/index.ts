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

    // 1. Autentica o usuário
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    // 2. Cria o cliente Admin para operações de DB
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Busca o perfil do usuário para obter o turma_id
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('turma_id')
      .eq('id', user.id)
      .single();
    if (profileError || !profileData?.turma_id) {
      throw new Error("Não foi possível determinar a turma do usuário.");
    }
    const turmaId = profileData.turma_id;

    const videoId = getYouTubeVideoId(youtubeUrl);
    if (!videoId) throw new Error("URL do YouTube inválida.");

    // (Opcional, mas recomendado: Lógica de cooldown e verificação de duplicados)
    // Você pode descomentar esta seção se quiser reativar estas regras.
    const { data: lastSubmission } = await supabaseAdmin
      .from('jukebox_queue')
      .select('created_at')
      .eq('aluno_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastSubmission) {
      const diff = Date.now() - new Date(lastSubmission.created_at).getTime();
      const cooldownMs = 10 * 60 * 1000; // 10 minutos
      if (diff < cooldownMs) {
        return new Response(JSON.stringify({ error: 'Aguarde para adicionar outra música.', cooldown: cooldownMs - diff }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
    }

    
    // ===================================================================
    // PARTE RESTAURADA: BUSCA DE DADOS NO YOUTUBE
    // ===================================================================
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error("A chave da API do YouTube não foi configurada no servidor.");
    }

    const youtubeResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`);
    
    if (!youtubeResponse.ok) {
        console.error('Erro na resposta da API do YouTube:', await youtubeResponse.text());
        throw new Error("Não foi possível obter dados do YouTube. Verifique a chave da API.");
    }
    
    const youtubeData = await youtubeResponse.json();
    const videoDetails = youtubeData.items?.[0]?.snippet;
    
    if (!videoDetails) {
        throw new Error("Vídeo não encontrado no YouTube com o ID fornecido.");
    }
    // ===================================================================

    // 4. Insere a música na fila com todos os dados corretos
    const newSong = {
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      song_title: videoDetails.title, // <-- Valor correto
      thumbnail_url: videoDetails.thumbnails?.default?.url ?? null, // <-- Valor correto
      aluno_id: user.id,
      turma_id: turmaId,
      status: 'queued'
    };

    const { error: insertError } = await supabaseAdmin.from('jukebox_queue').insert(newSong);
    if (insertError) {
        console.error("Erro ao inserir no Supabase: ", insertError);
        throw insertError;
    }

    // 5. Retorna sucesso
    return new Response(JSON.stringify({
      message: "Música adicionada com sucesso!",
      cooldown: 10 * 60 * 1000 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});