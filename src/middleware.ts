import { createServerClient, type CookieOptions } from '@supabase/ssr' // Importe CookieOptions
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        // CORREÇÃO: Adicionado o tipo 'CookieOptions'
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        // CORREÇÃO: Adicionado o tipo 'CookieOptions'
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Atualiza a sessão do usuário. Essencial para Server Components.
  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: [
    /*
     * Corresponde a todos os caminhos de solicitação, exceto aqueles que começam com:
     * - _next/static (arquivos estáticos)
     * - _next/image (arquivos de otimização de imagem)
     * - favicon.ico (arquivo favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

