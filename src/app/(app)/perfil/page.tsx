// Arquivo: src/app/(app)/perfil/page.tsx (Versão de Depuração)
'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
//
// TIPO SIMPLIFICADO: Apenas com o nome

export default function PerfilPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  
  const [nome, setNome] = useState('')
  const [updateMessage, setUpdateMessage] = useState('')

  const fetchProfileData = useCallback(async (currentUser: User) => {
    console.log('Iniciando busca de perfil para o usuário:', currentUser.id);
    setLoading(true)
    
    // CONSULTA SIMPLIFICADA: Buscando apenas 'nome' da tabela 'profiles'
    const { data, error } = await supabase
      .from('profiles')
      .select('nome') // Apenas um campo da tabela principal
      .eq('id', currentUser.id)
      .single()

    // Verificando o resultado da consulta no console
    console.log('Resultado da consulta - Dados:', data);
    console.log('Resultado da consulta - Erro:', error);

    if (error) {
      console.error('Erro detalhado ao buscar perfil:', error) // Mostra o erro completo no console
      setUpdateMessage(`Erro ao carregar os dados do perfil. Causa: ${error.message}`)
    } else if (data) {
      setNome(data.nome)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        fetchProfileData(user)
      } else {
        setLoading(false)
      }
    }
    getUser()
  }, [fetchProfileData])
  
  // Função para atualizar o nome (sem alterações)
  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUpdateMessage('')
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ nome })
      .eq('id', user.id)

    if (error) {
      setUpdateMessage(`Erro ao atualizar o nome: ${error.message}`)
    } else {
      setUpdateMessage('Nome atualizado com sucesso!')
    }
  }


  if (loading) {
    return <div>Verificando permissões e carregando perfil...</div>
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <h2 className="mb-4 text-2xl font-semibold">Meu Perfil (Modo de Depuração)</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">E-mail</label>
            <input type="email" value={user?.email || ''} disabled className="w-full cursor-not-allowed rounded-md border bg-gray-100 p-2 dark:border-gray-600 dark:bg-gray-700"/>
          </div>
          <div>
            <label htmlFor="nome" className="mb-2 block text-sm font-medium">Nome</label>
            <input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700"/>
          </div>
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Salvar Alterações
          </button>
          {updateMessage && <p className="mt-2 text-sm">{updateMessage}</p>}
        </form>
      </div>
    </div>
  )
}