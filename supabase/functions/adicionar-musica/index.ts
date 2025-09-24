import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req: Request) => {
  try {
    console.log("🚀 Função adicionar-musica iniciada");

    // 🔹 Pega body enviado pelo cliente
    const body = await req.json();
    console.log("📥 Body recebido:", body);

    const youtubeUrl = body.youtube_url;
    if (!youtubeUrl) {
      console.error("❌ Nenhum youtube_url recebido");
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400,
      });
    }

    // 🔹 Extrair ID do YouTube
    const videoIdMatch = youtubeUrl.match(/v=([^&]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (!videoId) {
      console.error("❌ Não foi possível extrair o ID do vídeo:", youtubeUrl);
      return new Response(JSON.stringify({ error: "URL de YouTube inválida" }), {
        status: 400,
      });
    }

    // 🔹 Pega metadados do vídeo pela API pública do YouTube
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
    );
    const ytData = await ytRes.json();

    console.log("📺 Resposta da API do YouTube:", JSON.stringify(ytData, null, 2));

    const snippet = ytData?.items?.[0]?.snippet;
    const songTitle = snippet?.title ?? "Título não encontrado";
    const thumbnailUrl = snippet?.thumbnails?.high?.url ?? null;

    console.log("🎵 Dados extraídos:", {
      titulo: songTitle,
      thumbnail: thumbnailUrl,
    });

    // 🔹 Pega usuário autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(req);

    if (userError || !user) {
      console.error("❌ Usuário não autenticado:", userError);
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
      });
    }

    console.log("✅ Usuário autenticado:", user.id);

    // 🔹 Busca turma_id do perfil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("turma_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.turma_id) {
      console.error("❌ Erro ao buscar turma_id:", profileError);
      return new Response(JSON.stringify({ error: "Turma não encontrada" }), {
        status: 400,
      });
    }

    console.log("📚 Turma encontrada:", profile.turma_id);

    // 🔹 Insere música na fila
    const { data: insertData, error: insertError } = await supabase
      .from("jukebox_queue")
      .insert([
        {
          song_title: songTitle,
          thumbnail_url: thumbnailUrl,
          status: "queued",
          user_id: user.id,
          turma_id: profile.turma_id,
        },
      ])
      .select();

    if (insertError) {
      console.error("❌ Erro ao salvar no banco:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao salvar música" }), {
        status: 500,
      });
    }

    console.log("✅ Música salva com sucesso:", insertData);

    return new Response(
      JSON.stringify({ message: "Música adicionada com sucesso!" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("💥 Erro inesperado:", err);
    return new Response(JSON.stringify({ error: "Erro interno no servidor" }), {
      status: 500,
    });
  }
});
