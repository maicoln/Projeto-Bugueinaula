'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { AlunoView } from './AlunoView';
import { ProfessorView } from './ProfessorView';
import { Loader2 } from 'lucide-react';

// --- Tipos ---
export type ProfileInfo = {
  id: string;
  nome: string;
  tipo_usuario: 'ALUNO' | 'PROFESSOR';
};

// --- Componente Principal ---
export default function CentralDeDuvidasPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/login');
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, nome, tipo_usuario')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          console.error('Erro ao buscar perfil:', error);
          setLoading(false);
          return;
        }

        setCurrentUser(profile as ProfileInfo);
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
      } finally {
        setLoading(false);
      }
    };

    void getCurrentUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> A verificar utilizador...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-6 text-center">
        Não foi possível identificar o utilizador.
        <br />
        <a href="/login" className="text-blue-600 underline">
          Ir para Login
        </a>
      </div>
    );
  }

  // Renderiza a view correta conforme tipo do usuário
  if (currentUser.tipo_usuario === 'ALUNO') return <AlunoView user={currentUser} />;
  if (currentUser.tipo_usuario === 'PROFESSOR') return <ProfessorView user={currentUser} />;

  return (
    <div className="p-6">
      Tipo de utilizador não reconhecido.
    </div>
  );
}
