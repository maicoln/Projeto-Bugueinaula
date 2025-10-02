'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrainCircuit, Lock, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // Captura tokens do hash enviado pelo Supabase
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setError('Sessão inválida. Por favor, solicite um novo link.');
            setIsTokenValid(false);
          } else {
            setIsTokenValid(true);
            setMessage('Sessão válida. Crie sua nova senha.');
          }
          setIsValidatingToken(false);
        });
    } else {
      setError('Link inválido ou expirado. Solicite um novo link.');
      setIsTokenValid(false);
      setIsValidatingToken(false);
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
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
      setMessage('Senha atualizada com sucesso! Redirecionando para o login...');
      setTimeout(() => router.push('/login'), 3000);
    }

    setLoading(false);
  };

  const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 60 } } };

  if (isValidatingToken) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="ml-4 text-lg">Validando link...</p>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-800">Link Inválido ou Expirado</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <Link href="/login" className="mt-6 inline-block text-blue-600 hover:underline">Voltar para o Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-wrap">
      <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="flex w-full flex-col items-center justify-center bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 p-8 text-white md:w-1/2">
        <div className="text-center">
          <BrainCircuit size={64} className="mx-auto mb-4 text-white drop-shadow-lg" />
          <h1 className="text-4xl font-bold drop-shadow">Bugueinaula</h1>
          <p className="mt-2 text-lg text-blue-100">Crie uma nova senha de acesso.</p>
        </div>
      </motion.div>

      <div className="flex w-full flex-col items-center justify-center bg-gray-100 p-8 dark:bg-gray-900 md:w-1/2">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">Criar Nova Senha</motion.h2>

          <motion.form onSubmit={handleUpdatePassword} variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
            <motion.div className="relative" variants={itemVariants}>
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Nova Senha" className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </motion.div>

            <motion.div className="relative" variants={itemVariants}>
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirme a Nova Senha" className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </motion.div>

            <motion.button type="submit" disabled={loading} variants={itemVariants} whileHover={{ scale: 1.05, boxShadow: '0px 0px 12px rgba(59,130,246,0.6)' }} whileTap={{ scale: 0.95 }} className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-3 text-white font-semibold shadow-md transition disabled:opacity-50">
              {loading ? 'A atualizar...' : 'Atualizar Senha'}
            </motion.button>
          </motion.form>

          {message && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center text-sm text-green-500">{message}</motion.p>}
          {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center text-sm text-red-500">{error}</motion.p>}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="mt-6 text-center">
            <Link href="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
              <ArrowLeft size={16} /> Voltar para o Login
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
