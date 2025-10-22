// src/lib/supabaseServer.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface CreateClientOptions {
  isAdmin?: boolean;
}

// 1. MUDANÇA: A função agora precisa ser 'async' para poder usar 'await' dentro dela.
export async function createClient({ isAdmin = false }: CreateClientOptions = {}) {
  // 2. MUDANÇA: Adicionamos 'await' aqui para esperar a "entrega" dos cookies.
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = isAdmin
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Ignorar erros em Server Actions é esperado.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // Ignorar erros em Server Actions é esperado.
        }
      },
    },
  });
}