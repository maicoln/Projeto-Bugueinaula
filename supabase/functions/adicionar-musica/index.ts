import { createClient } from '@supabase/supabase-js';

export const main = async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  }

  try {
    const payload = await req.json();
    console.log("Payload recebido:", payload); // 👀 DEBUG

    const youtubeUrl = payload.youtube_url;
    if (!youtubeUrl) {
      return new Response(JSON.stringify({ error: 'URL do YouTube não enviada' }), { status: 400 });
    }

    // 👉 Chama API do YouTube para pegar título + thumb
    const videoId = new URL(youtubeUrl).searchParams.get('v');
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'ID do vídeo inválido' }), { status: 400 });
    }

    const YT_API_KEY = process.env.YOUTUBE_API_KEY!;
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YT_API_KEY}`
    );
    const ytData = await ytRes.json();

    if (!ytData.items || ytData.items.length === 0) {
      return new Response(JSON.stringify({ error: 'Vídeo não encontrado' }), { status: 404 });
    }

    const snippet = ytData.items[0].snippet;
    const title = snippet.title || 'Título não encontrado';
    const thumb =
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      null;

    // 👉 Conexão Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") ?? "");
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), { status: 401 });
    }

    const alunoId = userData.user.id;

    // Pega turma_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('turma_id')
      .eq('id', alunoId)
      .single();

    if (!profile?.turma_id) {
      return new Response(JSON.stringify({ error: 'Turma não encontrada' }), { status: 400 });
    }

    // Salva na fila
    const { error: insertError } = await supabase.from('jukebox_queue').insert({
      youtube_url: youtubeUrl,
      song_title: title,
      thumbnail_url: thumb,
      aluno_id: alunoId,
      turma_id: profile.turma_id,
      status: 'queued',
    });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ message: 'Música adicionada com sucesso!' }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500 });
  }
};
