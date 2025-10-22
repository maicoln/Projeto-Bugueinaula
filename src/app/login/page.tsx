'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrainCircuit, Mail, Lock } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

export default function LoginPage() {
  const [supabase] = useState(() => createClient());

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(`Erro no login: ${error.message}`);
    } else {
      router.push('/');
      router.refresh();
    }

    setLoading(false);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 60 },
    },
  };

  return (
    <div className="flex min-h-screen w-full flex-wrap">
      {/* Lado Esquerdo: Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex w-full flex-col items-center justify-center bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 p-8 text-white md:w-1/2"
      >
        <div className="text-center">
          <BrainCircuit size={64} className="mx-auto mb-4 text-white drop-shadow-lg" />
          <h1 className="text-4xl font-bold drop-shadow">Bugueinaula</h1>
          <p className="mt-2 text-lg text-blue-100">
            Entre e continue sua jornada de aprendizado.
          </p>
        </div>
      </motion.div>

      {/* Lado Direito: Formulário */}
      <div className="flex w-full flex-col items-center justify-center bg-gray-100 p-8 dark:bg-gray-900 md:w-1/2">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
        >
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white"
          >
            Acesse sua Conta
          </motion.h2>

          <motion.form
            onSubmit={handleLogin}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <motion.div className="relative" variants={itemVariants}>
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="E-mail"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </motion.div>

            <motion.div className="relative" variants={itemVariants}>
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Senha"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </motion.div>

            <motion.div className="text-right text-sm" variants={itemVariants}>
              <Link href="/reset-senha" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                Esqueceu sua senha?
              </Link>
            </motion.div>

            <motion.button
              type="submit"
              disabled={loading}
              variants={itemVariants}
              whileHover={{ scale: 1.05, boxShadow: '0px 0px 12px rgba(59,130,246,0.6)' }}
              whileTap={{ scale: 0.95 }}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-3 text-white font-semibold shadow-md transition disabled:opacity-50"
              aria-label="Entrar"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </motion.button>
          </motion.form>

          {message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-center text-sm text-red-500"
            >
              {message}
            </motion.p>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400"
          >
            Não tem uma conta?{' '}
            <Link href="/cadastro" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Cadastre-se
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
