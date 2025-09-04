// Arquivo: src/lib/supabaseClient.ts (Versão Corrigida)
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// A função createClientComponentClient é a correta para criar um cliente Supabase
// que funciona em Componentes de Cliente ('use client') no App Router do Next.js.
// Ela não precisa receber as variáveis de ambiente aqui, pois a biblioteca as acessa
// de outra forma quando executada no navegador.
export const supabase = createClientComponentClient()