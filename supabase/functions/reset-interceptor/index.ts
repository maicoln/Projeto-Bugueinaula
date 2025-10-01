import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// O URL da sua página de update-password na Vercel
const APP_URL = 'https://bugueinaula.vercel.app/update-password';

serve(async (req) => {
  // Este código gera uma página HTML que corre no browser do utilizador por um instante
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>A redirecionar...</title>
        <script>
          try {
            // Pega o hash da URL (ex: #access_token=...)
            const hash = window.location.hash.substring(1);
            if (!hash) {
              throw new Error("Token não encontrado.");
            }

            // Converte o hash para parâmetros de busca (ex: ?access_token=...)
            const searchParams = new URLSearchParams(hash);

            if (!searchParams.has('access_token') || !searchParams.has('refresh_token')) {
              throw new Error("Tokens de acesso inválidos.");
            }

            // Constrói a URL final para a sua aplicação
            const finalUrl = \`\${APP_URL}?\${searchParams.toString()}\`;

            // Redireciona o utilizador
            window.location.replace(finalUrl);

          } catch (error) {
            console.error(error);
            // Se algo falhar, envia para a página de erro
            window.location.replace(\`\${APP_URL}?error=token_invalido\`);
          }
        </script>
      </head>
      <body>
        <p style="font-family: sans-serif; text-align: center; margin-top: 50px;">Aguarde um momento, estamos a redirecioná-lo em segurança...</p>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
});