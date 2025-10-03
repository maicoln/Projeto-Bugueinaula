'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrainCircuit, Lock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(`Erro ao atualizar a senha: ${error.message}`);
    } else {
      setMessage('Senha atualizada com sucesso! Redirecionando...');
      setTimeout(() => router.push('/login'), 3000);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full">
      <form onSubmit={handleUpdatePassword} className="m-auto space-y-4 max-w-sm w-full p-6 bg-white rounded shadow">
        <h2 className="text-2xl font-bold text-center">Criar Nova Senha</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Nova senha"
          className="border rounded p-2 w-full"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Confirme a nova senha"
          className="border rounded p-2 w-full"
        />
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">
          {loading ? 'Atualizando...' : 'Atualizar Senha'}
        </button>
        {message && <p className="text-green-600 text-sm">{message}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Link href="/login" className="block text-blue-600 mt-4 text-center">
          <ArrowLeft size={16} className="inline mr-1" /> Voltar ao Login
        </Link>
      </form>
    </div>
  );
}
