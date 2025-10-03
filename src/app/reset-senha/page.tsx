'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { BrainCircuit, Mail, ArrowLeft } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

export default function ResetSenhaPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 60 } },
  };

  return (
    <div className="flex min-h-screen w-full flex-wrap">
      {/* lado azul */}
      <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex w-full flex-col items-center justify-center bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 p-8 text-white md:w-1/2">
        <div className="text-center">
          <BrainCircuit size={64} className="mx-auto mb-4 text-white drop-shadow-lg" />
          <h1 className="text-4xl font-bold drop-shadow">Bugueinaula</h1>
          <p className="mt-2 text-lg text-blue-100">Recupere o acesso à sua conta.</p>
        </div>
      </motion.div>

      {/* lado formulário */}
      <div className="flex w-full flex-col items-center justify-center bg-gray-100 p-8 dark:bg-gray-900 md:w-1/2">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white">Redefinir Senha</motion.h2>

          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-6 text-center text-gray-600 dark:text-gray-400">Digite seu e-mail para receber o link de redefinição.</motion.p>

          <motion.form onSubmit={handlePasswordReset} variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
            <motion.div className="relative" variants={itemVariants}>
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="Seu e-mail de cadastro"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </motion.div>
            <motion.button type="submit" disabled={loading} variants={itemVariants}
              whileHover={{ scale: 1.05, boxShadow: '0px 0px 12px rgba(59,130,246,0.6)' }}
              whileTap={{ scale: 0.95 }}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-3 text-white font-semibold shadow-md transition disabled:opacity-50">
              {loading ? 'Enviando...' : 'Enviar Link'}
            </motion.button>
          </motion.form>

          {message && (<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center text-sm text-green-500">{message}</motion.p>)}
          {error && (<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center text-sm text-red-500">{error}</motion.p>)}

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
