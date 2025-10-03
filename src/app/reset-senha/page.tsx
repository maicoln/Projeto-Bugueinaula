'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { BrainCircuit, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResetSenhaPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://bugueinaula.vercel.app/update-password',
    });

    if (error) {
      setError(`Erro: ${error.message}`);
    } else {
      setMessage('Link de redefinição de senha enviado! Verifique seu e-mail.');
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* UI simplificada */}
      <form onSubmit={handlePasswordReset} className="m-auto space-y-4">
        <h2 className="text-2xl font-bold">Redefinir Senha</h2>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Seu e-mail"
          className="border rounded p-2 w-full"
        />
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">
          {loading ? 'Enviando...' : 'Enviar Link'}
        </button>
        {message && <p className="text-green-600">{message}</p>}
        {error && <p className="text-red-600">{error}</p>}
        <Link href="/login" className="block text-blue-600 mt-4">Voltar ao Login</Link>
      </form>
    </div>
  );
}
