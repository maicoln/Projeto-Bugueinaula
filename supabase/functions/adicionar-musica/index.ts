// Ficheiro: supabase/functions/adicionar-musica/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface AddSongPayload {
  youtube_url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: AddSongPayload = await req.json();
    console.log("📥 Body recebido:", payload);

    const youtubeUrl = payload.youtube_url;
    if (!youtubeUrl) throw new Error("URL do YouTube não fornecida.");

    // Extrai o videoId
    let videoId: string | null = null;
    try {
      const parsedUrl = new URL(youtubeUrl);
      if (parsedUrl.hostname.includes("youtu.be")) {
        videoId = parsedUrl.pathname.slice(1);
      } else {
        videoId = parsedUrl.searchParams.get("v");
      }
    } catch {
      throw new Error("URL do YouTube inválida.");
    }
    console.log("🎬 Video ID extraído:", videoId);
    if (!videoId) throw new Error("Não foi possível extrair o ID do vídeo.");

    // Cria client autenticado
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");
    console.log("✅ Usuário autenticado. ID:", user.id);

    // Admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Busca turma_id
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("turma_id")
      .eq("id", user.id)
      .single();

    console.log("DEBUG: Resultado da busca de perfil:", { profileData, profileError });
    if (profileError || !profileData?.turma_id) {
      throw new Error("Não foi possível encontrar a turma do usuário.");
    }
    const turmaId = profileData.turma_id;
    console.log("✅ turma_id encontrado:", turmaId);

    // Chama YouTube API
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!YOUTUBE_API_KEY) throw new Error("Chave da API do YouTube não configurada.");

    const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`;
    console.log("📡 Chamando YouTube API:", youtubeApiUrl);

    const youtubeResponse = await fetch(youtubeApiUrl);
    const youtubeText = await youtubeResponse.text();
    console.log("📺 Resposta da API do YouTube:", youtubeText);

    if (!youtubeResponse.ok) {
      throw new Error("Falha na chamada à API do YouTube.");
    }

    const youtubeData = JSON.parse(youtubeText);
    const videoDetails = youtubeData.items?.[0]?.snippet;

    if (!videoDetails) {
      throw new Error("Vídeo não encontrado ou não retornou dados da API do YouTube.");
    }

    console.log("🎵 Dados do vídeo extraídos:", videoDetails);

    const newSong = {
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      song_title: videoDetails.title ?? "Título não disponível",
      thumbnail_url: videoDetails.thumbnails?.high?.url
        ?? videoDetails.thumbnails?.medium?.url
        ?? videoDetails.thumbnails?.default?.url
        ?? null,
      aluno_id: user.id,
      turma_id: turmaId,
      status: "queued",
    };

    console.log("💾 Música a ser salva no Supabase:", newSong);

    const { error: insertError } = await supabaseAdmin
      .from("jukebox_queue")
      .insert(newSong);

    if (insertError) throw new Error(`Erro ao salvar a música: ${insertError.message}`);

    return new Response(JSON.stringify({ message: "Música adicionada com sucesso!", debug_turma_id: turmaId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("❌ Erro na função adicionar-musica:", err);
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
