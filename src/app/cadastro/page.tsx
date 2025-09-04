// Local: src/app/cadastro/page.tsx (Atualizado)
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link' // Importe o componente Link

type Escola = {
  id: number
  nome: string
}

type Turma = {
  id: number
  nome: string
}

export default function CadastroPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')

  const [escolas, setEscolas] = useState<Escola[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const router = useRouter()

  useEffect(() => {
    async function fetchEscolas() {
      const { data } = await supabase.from('escolas').select('id, nome')
      if (data) {
        setEscolas(data)
      }
      setLoading(false)
    }
    fetchEscolas()
  }, [])

  useEffect(() => {
    if (!escolaId) {
      setTurmas([])
      setTurmaId('')
      return
    }
    async function fetchTurmas() {
      const { data } = await supabase.from('turmas')
        .select('id, nome')
        .eq('escola_id', escolaId)
      if (data) {
        setTurmas(data)
      }
    }
    fetchTurmas()
  }, [escolaId])

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          tipo_usuario: 'ALUNO',
          escola_id: parseInt(escolaId),
          turma_id: parseInt(turmaId),
        },
      },
    })

    if (authError) {
      setMessage(`Erro no cadastro: ${authError.message}`)
      return
    }

    if (authData.user) {
      setMessage('Cadastro realizado com sucesso! Verifique seu e-mail para confirmação.')
      setNome('')
      setEmail('')
      setPassword('')
      setEscolaId('')
      setTurmaId('')
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
        <h1 className="mb-6 text-center text-2xl font-bold">Criar Conta de Aluno</h1>
        <form onSubmit={handleSignUp}>
          {/* ... todos os seus inputs de formulário (Nome, Email, etc.) ... */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium" htmlFor="nome">Nome Completo</label>
            <input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700" />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium" htmlFor="email">E-mail</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700" />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium" htmlFor="password">Senha</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700" />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium" htmlFor="escola">Escola</label>
            <select id="escola" value={escolaId} onChange={(e) => setEscolaId(e.target.value)} required disabled={loading} className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700">
              <option value="">{loading ? 'Carregando...' : 'Selecione sua escola'}</option>
              {escolas.map((escola) => (<option key={escola.id} value={escola.id}>{escola.nome}</option>))}
            </select>
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium" htmlFor="turma">Turma</label>
            <select id="turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)} required disabled={!escolaId} className="w-full rounded-md border p-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700">
              <option value="">Selecione sua turma</option>
              {turmas.map((turma) => (<option key={turma.id} value={turma.id}>{turma.nome}</option>))}
            </select>
          </div>
          <button type="submit" className="w-full rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700">
            Cadastrar
          </button>
        </form>
        {/*
          *
          * CÓDIGO ADICIONADO ABAIXO
          *
        */}
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Já possui uma conta?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Faça login
          </Link>
        </p>
        
        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </div>
  )
}