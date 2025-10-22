// src/app/reset-senha/actions.ts
'use server';

import { createClient } from '@/lib/supabaseServer';

interface ActionResult {
  success: boolean;
  message: string;
}

export async function requestPasswordReset(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get('email') as string;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'Por favor, insira um e-mail válido.' };
  }

  try {
    const supabaseAdmin = await createClient({ isAdmin: true });

    // Verifica se o e-mail existe usando listUsers()
    const { data: usersData, error: userError } = await supabaseAdmin.auth.admin.listUsers();

    if (userError || !usersData) {
      return { success: false, message: 'Erro ao verificar o e-mail.' };
    }

    const userExists = usersData.users.some((u) => u.email === email);

    if (userExists) {
      const supabase = await createClient(); // Cliente público para enviar o e-mail
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/update-password`,
      });

      if (resetError) {
        return { success: false, message: 'Erro ao enviar o e-mail de recuperação.' };
      }

      return {
        success: true,
        message: 'E-mail encontrado! Um link de recuperação foi enviado para você.',
      };
    } else {
      return {
        success: false,
        message: 'Este e-mail não está cadastrado em nosso sistema.',
      };
    }
  } catch (error) {
    console.error('Erro inesperado no servidor:', error);
    return { success: false, message: 'Ocorreu um erro no servidor.' };
  }
}
