// Ficheiro: supabase/functions/adicionar-musica/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface AddSongPayload {
  youtube_url: string;
}

// Função para extrair o ID do vídeo do YouTube
function getYouTubeVideoId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.slice(1);
    }
    return parsedUrl.searchParams.get("v");
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Valida o payload
    const payload: AddSongPayload = await req.json();
    const youtubeUrl = payload.youtube_url;
    const videoId = getYouTubeVideoId(youtubeUrl);

    if (!videoId) {
      throw new Error("URL do YouTube inválida.");
    }

    // 2. Autentica usuário
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    // 3. Cria admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 4. Busca turma_id do usuário
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("turma_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData?.turma_id) {
      throw new Error("Não foi possível encontrar o perfil ou a turma do usuário.");
    }
    const turmaId = profileData.turma_id;

    // 5. Regras de cooldown
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: lastSubmission, error: lastSubError } = await supabaseAdmin
      .from("jukebox_queue")
      .select("created_at")
      .eq("aluno_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastSubError && lastSubError.code !== "PGRST116") {
      throw lastSubError;
    }

    if (
      lastSubmission &&
      new Date(lastSubmission.created_at) > new Date(tenMinutesAgo)
    ) {
      return new Response(
        JSON.stringify({
          error: "Você só pode adicionar uma música a cada 10 minutos.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        }
      );
    }

    // 6. Checa se o usuário já tem música na fila
    const { count: queuedSongCount, error: queuedError } = await supabaseAdmin
      .from("jukebox_queue")
      .select("*", { count: "exact", head: true })
      .eq("aluno_id", user.id)
      .eq("status", "queued");

    if (queuedError) throw queuedError;

    if (queuedSongCount && queuedSongCount > 0) {
      return new Response(
        JSON.stringify({
          error: "Você já tem uma música na fila. Espere ela tocar.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        }
      );
    }

    // 7. Chama YouTube API
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!YOUTUBE_API_KEY) {
      throw new Error("Chave da API do YouTube não configurada.");
    }

    const youtubeResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`
    );

    if (!youtubeResponse.ok) {
      console.error("YouTube API error:", await youtubeResponse.text());
      throw new Error("Não foi possível obter os dados do YouTube.");
    }

    const youtubeData = await youtubeResponse.json();
    console.log("YouTube API response:", youtubeData);

    const videoDetails = youtubeData.items?.[0]?.snippet;
    if (!videoDetails) {
      throw new Error("Vídeo não encontrado no YouTube.");
    }

    // 8. Prepara a música para salvar
    const newSong = {
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      song_title: videoDetails.title,
      thumbnail_url:
        videoDetails.thumbnails?.high?.url ??
        videoDetails.thumbnails?.medium?.url ??
        videoDetails.thumbnails?.default?.url ??
        null,
      aluno_id: user.id,
      turma_id: turmaId,
      status: "queued",
    };

    // 9. Insere na fila
    const { error: insertError } = await supabaseAdmin
      .from("jukebox_queue")
      .insert(newSong);

    if (insertError) {
      throw new Error(`Erro ao salvar a música: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        message: "Música adicionada com sucesso!",
        cooldown: 10 * 60 * 1000, // 10 minutos
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
