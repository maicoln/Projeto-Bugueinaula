import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve((_req) => {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Redirecionando...</title>
      </head>
      <body>
        <p>Redirecionando para a redefinição de senha...</p>
        <script>
          // Captura o hash da URL (tokens do Supabase)
          const hash = window.location.hash;

          // Redireciona para a página do seu site, preservando o hash
          window.location.href = "https://bugueinaula.com/update-password" + hash;
        </script>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
