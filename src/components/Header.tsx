'use client';

import { useState, useEffect } from 'react';
// CORREÇÃO: Importar a FUNÇÃO 'createClient' em vez do objeto 'supabase'
import { createClient } from '@/lib/supabaseClient';
import { ThemeSwitcher } from './ThemeSwitcher';
import { User, LogOut, ChevronDown, Menu } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ProfileData = {
  nome: string;
  tipo_usuario: string;
};

interface HeaderProps {
  onMobileMenuClick: () => void;
}

export default function Header({ onMobileMenuClick }: HeaderProps) {
  // CORREÇÃO: Instanciar o cliente Supabase usando useState
  const [supabase] = useState(() => createClient());
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    // Esta chamada agora funciona
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    async function fetchUserData() {
      // Esta chamada também funciona
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nome, tipo_usuario')
          .eq('id', user.id)
          .single();
        if (profileData) setProfile(profileData);
      }
    }
    fetchUserData();
  }, [supabase]); // Adicionado 'supabase' ao array de dependências

  return (
    <header className="sticky top-0 z-[1000] flex h-16 w-full items-center justify-between border-b border-border bg-white dark:bg-gray-900 px-4 md:px-6 shadow">
      {/* Botão do Menu Mobile */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuClick}
          className="rounded-full p-2 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-800 md:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Botões e dropdown */}
      <div className="flex items-center gap-4">
        <div className="hidden">
          <ThemeSwitcher />
        </div>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">
              {getInitials(profile?.nome)}
            </div>
            <div className="hidden flex-col items-start text-left md:flex">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {profile?.nome || 'Usuário'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-300">
                {profile?.tipo_usuario}
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`hidden transition-transform duration-200 md:block ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown fixo, sempre sobre a página */}
      {isDropdownOpen && (
        <div className="fixed top-16 right-4 z-[9999] w-56 rounded-md border border-gray-200 bg-white dark:bg-gray-900 shadow-lg">
          <div className="py-1">
            {/* Informações do usuário */}
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {profile?.nome || 'Usuário'}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-300">
                {profile?.tipo_usuario}
              </p>
            </div>

            {/* Links */}
            <Link
              href="/perfil"
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
              onClick={() => setDropdownOpen(false)}
            >
              <User size={16} />
              <span>Meu Perfil</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
