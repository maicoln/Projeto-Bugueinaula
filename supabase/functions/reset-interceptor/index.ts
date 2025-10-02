import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve((req) => {
  const url = new URL(req.url);

  // captura os parâmetros normais (?param=value)
  const searchParams = url.searchParams.toString();

  // captura também o hash (#access_token=...&refresh_token=...)
  const hash = url.hash; // já vem com o "#"

  // monta a URL final mantendo tudo
  const redirectUrl =
    `https://bugueinaula.vercel.app/update-password${searchParams ? "?" + searchParams : ""}${hash}`;

  // redireciona para o site
  return Response.redirect(redirectUrl, 302);
});