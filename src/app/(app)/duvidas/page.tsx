'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AlunoView } from './aluno-view';
import { ProfessorView } from './professor-view';

type ProfileInfo = { id: string; nome: string; tipo_usuario: 'aluno' | 'professor' };

export default function CentralDeDuvidasPage() {
  const [user, setUser] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const { data: { user: supaUser } } = await supabase.auth.getUser();
        if (!supaUser) {
          setUser(null);
          return;
        }

        // Busca o perfil do usuário no Supabase
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome, tipo_usuario')
          .eq('id', supaUser.id)
          .single();

        if (error) throw error;
        setUser(data);
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return <p className="p-6 text-center">Carregando perfil...</p>;

  if (!user)
    return (
      <div className="p-6 text-center">
        <p>Não foi possível identificar o utilizador.</p>
        <a href="/login" className="text-blue-600 underline">
          Ir para Login
        </a>
      </div>
    );

  return user.tipo_usuario === 'professor' ? (
    <ProfessorView user={user} />
  ) : (
    <AlunoView user={user} />
  );
}
