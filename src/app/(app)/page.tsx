// Local: src/app/(app)/page.tsx (Versão Final com Workaround)
'use client'; // <-- PASSO 1: Transforma este em um Componente de Cliente

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LogoutButton from './LogoutButton';
import { supabase } from '@/lib/supabaseClient'; // <-- PASSO 2: Usa o cliente do NAVEGADOR

// Tipo para os dados do perfil
type ProfileData = {
  nome: string;
  tipo_usuario: string;
};

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const router = useRouter();

  useEffect(() => {
    // PASSO 3: A lógica de busca de dados agora acontece dentro de um useEffect
    async function fetchUserData() {
      // Usamos getUser() do lado do cliente, que é seguro
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Se não houver usuário, redireciona para o login
        router.push('/login');
        return;
      }

      // Se houver usuário, busca o perfil
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('nome, tipo_usuario')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Erro ao buscar perfil:', error);
        // Lida com o erro, talvez mostrando uma mensagem
      } else {
        setProfile(profileData);
      }

      setLoading(false);
    }

    fetchUserData();
  }, [router]);

  // Enquanto os dados estão carregando, mostramos uma mensagem
  if (loading) {
    return <div className="text-center">Carregando...</div>;
  }

  return (
    <div className="text-center">
      <h1 className="mb-4 text-4xl font-bold">
        Bem-vindo(a) ao Bugueinaula, {profile?.nome ?? 'Usuário'}!
      </h1>
      <p className="mb-8">Você está logado como: <strong>{profile?.tipo_usuario}</strong></p>
      <LogoutButton />
    </div>
  );
}