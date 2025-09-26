import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Interface para o corpo da requisição
interface AddSongPayload {
  youtube_url: string;
}

// Função para extrair o ID do vídeo de uma URL do YouTube
function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

Deno.serve(async (req: Request) => {
  // Responde a requisições OPTIONS (necessário para CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Valida a requisição
    const payload: AddSongPayload = await req.json();
    const youtubeUrl = payload.youtube_url;
    if (!youtubeUrl) {
      throw new Error("A URL do YouTube é obrigatória.");
    }

    // 2. Autentica o usuário a partir do token enviado pelo frontend
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado. Sessão inválida ou expirada.");
    }

    // 3. Cria o cliente Admin para realizar operações no banco de dados (ignora RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Busca o perfil do usuário para obter o `turma_id`
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('turma_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData?.turma_id) {
      throw new Error("Não foi possível encontrar o perfil do usuário ou a turma associada.");
    }
    const turmaId = profileData.turma_id;

    const videoId = getYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error("A URL do YouTube fornecida é inválida.");
    }

    // 5. Busca os detalhes do vídeo na API do YouTube
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error("A chave da API do YouTube não foi configurada como um 'Secret' nesta função.");
    }

    const youtubeResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`);
    if (!youtubeResponse.ok) {
      throw new Error("Não foi possível obter os dados do YouTube. Verifique se a chave da API é válida.");
    }

    const youtubeData = await youtubeResponse.json();
    const videoDetails = youtubeData.items?.[0]?.snippet;
    if (!videoDetails) {
      throw new Error("Vídeo não encontrado no YouTube com a URL fornecida.");
    }

    // 6. Prepara o objeto com todos os dados corretos para inserção
    const newSong = {
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      song_title: videoDetails.title, // <-- Título correto do YouTube
      thumbnail_url: videoDetails.thumbnails?.default?.url ?? null, // <-- Thumbnail correta do YouTube
      aluno_id: user.id,
      turma_id: turmaId,
      status: 'queued'
    };

    // 7. Insere a nova música na tabela `jukebox_queue`
    const { error: insertError } = await supabaseAdmin.from('jukebox_queue').insert(newSong);
    if (insertError) {
      throw new Error(`Erro ao salvar a música no banco de dados: ${insertError.message}`);
    }

    // 8. Retorna a resposta de sucesso para o frontend
    return new Response(JSON.stringify({
      message: "Música adicionada com sucesso!",
      cooldown: 10 * 60 * 1000 // Cooldown de 10 minutos
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err) {
    // Captura qualquer erro que ocorreu e o envia como resposta
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});