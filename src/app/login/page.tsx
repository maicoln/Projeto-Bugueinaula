// Arquivo: src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(`Erro no login: ${error.message}`)
    } else {
      // O redirecionamento será tratado pelo listener de autenticação,
      // mas podemos forçar um refresh ou redirecionamento aqui se necessário.
      router.push('/') // Redireciona para a Home após o login
      router.refresh() // Força a atualização do estado do servidor
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
        <h1 className="mb-6 text-center text-2xl font-bold">Entrar no Bugueinaula</h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700"
          >
            Entrar
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm text-red-500">{message}</p>}
         <p className="mt-4 text-center text-sm">
            Não tem uma conta?{' '}
            <a href="/cadastro" className="text-blue-500 hover:underline">
                Cadastre-se
            </a>
        </p>
      </div>
    </div>
  )
}