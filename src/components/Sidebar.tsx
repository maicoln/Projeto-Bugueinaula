'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Book, ChevronLeft, LayoutDashboard, BrainCircuit, PenSquare, FileEdit, ClipboardList, Music, HelpCircle } from 'lucide-react'; // <<< Ícone adicionado
import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface SidebarProps {
  isCollapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
  isMobileOpen: boolean;
  setMobileOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({
  isCollapsed,
  setCollapsed,
  isMobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tipo_usuario')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserRole(profile.tipo_usuario);
        }
      }
    }
    void fetchUserRole();
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, text: 'Painel', href: '/', roles: ['ALUNO', 'PROFESSOR'] },
    // <<< NOVO LINK DA CENTRAL DE DÚVIDAS (para ambos os papéis) >>>
    { icon: HelpCircle, text: 'Central de Dúvidas', href: '/duvidas', roles: ['ALUNO', 'PROFESSOR'] },
    
    // Links de Aluno
    { icon: Book, text: 'Disciplinas', href: '/disciplinas', roles: ['ALUNO'] },
    { icon: ClipboardList, text: 'Minhas Atividades', href: '/aluno/atividades', roles: ['ALUNO'] },
    { icon: Music, text: 'Jukebox Coletiva', href: '/aluno/jukebox', roles: ['ALUNO'] },

    // Links de Professor
    { icon: Book, text: 'Minhas Disciplinas', href: '/professor/minhas-disciplinas', roles: ['PROFESSOR'] },
    { icon: PenSquare, text: 'Cadastrar Conteúdo', href: '/professor/cadastrar-conteudo', roles: ['PROFESSOR'] },
    { icon: FileEdit, text: 'Gerir Conteúdo', href: '/professor/gerir-conteudo', roles: ['PROFESSOR'] },
    { icon: ClipboardList, text: 'Ver Submissões', href: '/professor/submissoes', roles: ['PROFESSOR'] },
    { icon: Music, text: 'Jukebox Player', href: '/professor/jukebox', roles: ['PROFESSOR'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <>
      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[9998] md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="h-full w-full bg-black/20"></div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-[9999] h-screen
          bg-white dark:bg-gray-900 text-gray-900 dark:text-white
          flex flex-col border-r border-gray-200 dark:border-gray-700
          transition-transform duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        <button
          onClick={() => setCollapsed(!isCollapsed)}
          className="absolute top-6 -right-3 z-50 hidden md:flex items-center justify-center
                       h-6 w-6 rounded-full bg-blue-600 text-white
                       hover:scale-110 transition-transform shadow-md"
          aria-label="Recolher barra lateral"
        >
          <ChevronLeft
            size={16}
            className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="flex items-center h-16">
          <Link
            href="/"
            className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'gap-3 px-4'}`}
          >
            <BrainCircuit size={24} className="text-blue-600 flex-shrink-0" />
            <span
              className={`font-bold text-xl transition-all duration-300 ${
                isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 whitespace-nowrap'
              }`}
            >
              Bugueinaula
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-1">
          {visibleMenuItems.map((item) => {
            const isActive = pathname.startsWith(item.href) && item.href.length > 1 || pathname === item.href;
            return (
              <div key={item.text} className="relative group">
                <Link href={item.href}>
                  <span
                    className={`
                      flex items-center h-12 rounded-lg
                      transition-all duration-300 transform
                      ${isActive
                        ? 'bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-800'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}
                      ${isCollapsed ? 'justify-center' : 'gap-3 px-3'}
                      hover:scale-105
                    `}
                  >
                    <item.icon size={24} className="flex-shrink-0" />
                    <span
                      className={`transition-all duration-300 ${
                        isCollapsed
                          ? 'opacity-0 w-0 overflow-hidden'
                          : 'opacity-100 whitespace-nowrap'
                      }`}
                    >
                      {item.text}
                    </span>
                  </span>
                </Link>

                {isCollapsed && (
                  <div className="absolute left-full ml-4 hidden md:group-hover:block px-2 py-1 text-sm bg-blue-600 text-white dark:bg-gray-800 rounded-md whitespace-nowrap shadow-lg transition-all duration-300 transform scale-90 md:group-hover:scale-100">
                    {item.text}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}