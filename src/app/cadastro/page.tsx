'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrainCircuit, User, Mail, Lock, CheckCircle, XCircle, Loader2, Award } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

// <<< NOVO: Tipo para o status da validação do RA >>>
type RaStatus = 'idle' | 'checking' | 'valid' | 'invalid';

export default function CadastroPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // <<< ALTERAÇÃO: Estados para RA em vez de escola/turma >>>
  const [ra, setRa] = useState('');
  const [raStatus, setRaStatus] = useState<RaStatus>('idle');
  
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // useEffects para buscar escolas e turmas foram removidos.

  // <<< NOVO: Função para verificar o RA em tempo real >>>
  const checkRa = useCallback(async (currentRa: string) => {
    if (currentRa.length < 4) { // Validação de tamanho mínimo
      setRaStatus('idle');
      return;
    }
    setRaStatus('checking');
    
    const { data, error } = await supabase
      .from('alunos_pre_cadastrados')
      .select('user_id')
      .eq('ra', currentRa)
      .single();

    if (error || !data) {
      setRaStatus('invalid'); // RA não encontrado
    } else if (data.user_id !== null) {
      setRaStatus('invalid'); // RA já foi usado
    } else {
      setRaStatus('valid'); // RA válido e disponível
    }
  }, []);

  // <<< ALTERAÇÃO: handleSignUp agora envia nome e RA nos metadados >>>
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (raStatus !== 'valid') {
        setMessage('Por favor, insira um RA válido e disponível antes de continuar.');
        return;
    }
    setMessage('');
    setFormLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome_completo: nome, // O nome preenchido pelo aluno
          ra: ra,              // O RA validado
        },
      },
    });

    if (error) {
      setMessage(`Erro no cadastro: ${error.message}`);
    } else {
      setMessage('Cadastro realizado! Verifique seu e-mail para confirmação.');
      setTimeout(() => router.push('/login'), 3000);
    }
    setFormLoading(false);
  };
  
  const raStatusIndicator = () => {
    switch (raStatus) {
      case 'checking': return <Loader2 className="animate-spin text-gray-400" size={20} />;
      case 'valid': return <CheckCircle className="text-green-500" size={20} />;
      case 'invalid': return <XCircle className="text-red-500" size={20} />;
      default: return null;
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 60 },
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
            Crie sua conta e comece sua jornada de aprendizado.
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
            Crie sua Conta de Aluno
          </motion.h2>

          <motion.form
            onSubmit={handleSignUp}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <motion.div className="relative" variants={itemVariants}>
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                required placeholder="Nome Completo"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </motion.div>

            <motion.div className="relative" variants={itemVariants}>
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    id="ra" type="text" value={ra}
                    onChange={(e) => setRa(e.target.value)}
                    onBlur={() => checkRa(ra)}
                    required placeholder="Seu RA (Registro Acadêmico)"
                    className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    {raStatusIndicator()}
                </div>
            </motion.div>
            {raStatus === 'invalid' && <p className="text-xs text-red-600 px-1 -mt-2">RA não encontrado ou já em uso.</p>}
            {raStatus === 'valid' && <p className="text-xs text-green-600 px-1 -mt-2">RA válido! Pode prosseguir.</p>}

            <motion.div className="relative" variants={itemVariants}>
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="E-mail"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </motion.div>

            <motion.div className="relative" variants={itemVariants}>
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required placeholder="Senha"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </motion.div>
            
            <motion.button
              type="submit"
              disabled={formLoading || raStatus !== 'valid'}
              variants={itemVariants}
              whileHover={{ scale: 1.05, boxShadow: '0px 0px 12px rgba(59,130,246,0.6)' }}
              whileTap={{ scale: 0.95 }}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-3 font-semibold text-white shadow-md transition disabled:opacity-50"
            >
              {formLoading ? 'Criando conta...' : 'Criar Conta'}
            </motion.button>
          </motion.form>

          {message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`mt-4 text-center text-sm ${message.startsWith('Erro') ? 'text-red-600' : 'text-green-600'}`}
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
            Já tem uma conta?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Faça login
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}