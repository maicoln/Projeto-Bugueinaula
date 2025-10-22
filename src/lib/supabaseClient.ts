// Arquivo: src/lib/supabaseClient.ts

import { createBrowserClient } from '@supabase/ssr'

// Exportamos uma FUNÇÃO 'createClient'.
// Isso é crucial para que o Next.js App Router funcione corretamente.
// Você não vai mais importar 'supabase', mas sim 'createClient'.
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

