'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Tipos de dados
type ProfileInfo = {
  nome: string;
  tipo_usuario: 'ALUNO' | 'PROFESSOR';
  escola_aluno: { nome: string } | null;
  turma_aluno: { nome: string } | null;
  escolas_professor: { nome: string }[];
};

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);

  const [nome, setNome] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [updateMessage, setUpdateMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const router = useRouter();

  // -----------------------------
  // Função corrigida de fetch
  // -----------------------------
  const fetchProfileData = useCallback(async (currentUser: User) => {
    setLoading(true);

    try {
      // Buscar dados básicos do perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, nome, tipo_usuario, escola_id, turma_id')
        .eq('id', currentUser.id)
        .single();

      if (profileError || !profileData) {
        console.error('Erro ao buscar perfil:', profileError);
        setUpdateMessage('Erro ao carregar os dados do perfil.');
        setLoading(false);
        return;
      }

      // Inicializa o objeto de retorno
      const info: ProfileInfo = {
        nome: profileData.nome,
        tipo_usuario: profileData.tipo_usuario as ProfileInfo['tipo_usuario'],
        escola_aluno: null,
        turma_aluno: null,
        escolas_professor: [],
      };

      // Buscar escola e turma do aluno
      if (profileData.tipo_usuario === 'ALUNO') {
        if (profileData.escola_id) {
          const { data: escolaData } = await supabase
            .from('escolas')
            .select('nome')
            .eq('id', profileData.escola_id)
            .single();
          if (escolaData) info.escola_aluno = { nome: escolaData.nome };
        }

        if (profileData.turma_id) {
          const { data: turmaData } = await supabase
            .from('turmas')
            .select('nome')
            .eq('id', profileData.turma_id)
            .single();
          if (turmaData) info.turma_aluno = { nome: turmaData.nome };
        }
      }

      // Buscar escolas do professor
      if (profileData.tipo_usuario === 'PROFESSOR') {
        const { data: escolasProfessorData } = await supabase
          .from('professores_escolas')
          .select('escolas ( nome )')
          .eq('professor_id', currentUser.id);

        if (escolasProfessorData) {
          info.escolas_professor = escolasProfessorData
            .flatMap((item: { escolas: { nome: string }[] | null }) => item.escolas || [])
            .filter((escola): escola is { nome: string } => escola !== null);
        }
      }

      setProfileInfo(info);
      setNome(info.nome);
      setLoading(false);
    } catch (err) {
      console.error('Erro inesperado ao buscar perfil:', err);
      setUpdateMessage('Erro ao carregar os dados do perfil.');
      setLoading(false);
    }
  }, []);

  // -----------------------------
  // useEffect para pegar usuário
  // -----------------------------
  useEffect(() => {
    async function getUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        fetchProfileData(currentUser);
      } else {
        setLoading(false);
        router.push('/login');
      }
    }
    getUser();
  }, [fetchProfileData, router]);

  // -----------------------------
  // Atualizar perfil
  // -----------------------------
  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdateMessage('');
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ nome })
      .eq('id', user.id);

    if (error) setUpdateMessage(`Erro ao atualizar o nome: ${error.message}`);
    else setUpdateMessage('Nome atualizado com sucesso!');
  };

  // -----------------------------
  // Atualizar senha
  // -----------------------------
  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMessage('');

    if (!user || !user.email) {
      setPasswordMessage('Não foi possível identificar o utilizador.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordMessage('As novas senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    // Verificar senha atual
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      setPasswordMessage('A senha atual está incorreta.');
      return;
    }

    // Atualizar senha
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setPasswordMessage(`Erro ao atualizar a senha: ${updateError.message}`);
    } else {
      setPasswordMessage('Senha atualizada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  if (loading) {
    return <div className="text-center">A carregar perfil...</div>;
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-900">
        <h2 className="mb-6 text-2xl font-semibold">Meu Perfil</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-400">E-mail</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full cursor-not-allowed rounded-md border bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div>
              <label htmlFor="nome" className="mb-2 block text-sm font-medium">Nome Completo</label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-md border p-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            {profileInfo?.tipo_usuario === 'ALUNO' && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-400">Escola</label>
                  <input
                    type="text"
                    value={profileInfo.escola_aluno?.nome || 'Não informada'}
                    disabled
                    className="w-full cursor-not-allowed rounded-md border bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-400">Turma</label>
                  <input
                    type="text"
                    value={profileInfo.turma_aluno?.nome || 'Não informada'}
                    disabled
                    className="w-full cursor-not-allowed rounded-md border bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              </>
            )}

            {profileInfo?.tipo_usuario === 'PROFESSOR' && profileInfo.escolas_professor.length > 0 && (
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-400">Escolas Associadas</label>
                <ul className="space-y-2">
                  {profileInfo.escolas_professor.map(escola => (
                    <li key={escola.nome} className="rounded-md border bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-800">{escola.nome}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700">Guardar Alterações</button>
          </div>
          {updateMessage && <p className="mt-2 text-center text-sm">{updateMessage}</p>}
        </form>

        <hr className="my-8 dark:border-gray-700" />
        <h3 className="mb-4 text-xl font-semibold">Alterar Senha</h3>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-2 block text-sm font-medium">Senha Atual</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-md border p-2 dark:border-gray-700 dark:bg-gray-800 sm:max-w-xs"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="mb-2 block text-sm font-medium">Nova Senha</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-md border p-2 dark:border-gray-700 dark:bg-gray-800 sm:max-w-xs"
            />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="mb-2 block text-sm font-medium">Confirmar Nova Senha</label>
            <input
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full rounded-md border p-2 dark:border-gray-700 dark:bg-gray-800 sm:max-w-xs"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700">Atualizar Senha</button>
          </div>
          {passwordMessage && <p className="mt-2 text-center text-sm">{passwordMessage}</p>}
        </form>
      </div>
    </div>
  );
}
