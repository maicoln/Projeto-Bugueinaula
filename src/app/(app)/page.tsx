'use client';

import Link from 'next/link';
import { Book, User } from 'lucide-react';
import type { ElementType } from 'react';

interface NavCardProps {
  href: string;
  icon: ElementType;
  title: string;
  description: string;
}

const NavCard = ({ href, icon: Icon, title, description }: NavCardProps) => (
  <Link href={href} className="flex"> {/* Adicionado 'flex' para o Link ocupar a altura */}
    {/* Adicionado 'flex flex-col' para o card se esticar */}
    <div className="group flex flex-col w-full rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-all hover:border-primary/80 hover:shadow-md dark:border-dark-border dark:bg-dark-card dark:text-dark-card-foreground dark:hover:border-dark-primary/80">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary dark:bg-dark-primary/10 dark:text-dark-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold group-hover:text-primary dark:group-hover:text-dark-primary">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground dark:text-dark-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  </Link>
);

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
        <p className="mt-1 text-muted-foreground dark:text-dark-muted-foreground">
          Acesse rapidamente as seções mais importantes do site.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <NavCard 
          href="/disciplinas"
          icon={Book}
          title="Minhas Disciplinas"
          description="Acesse o material de aula, exemplos e exercícios."
        />
        <NavCard 
          href="/perfil"
          icon={User}
          title="Meu Perfil"
          description="Visualize e atualize suas informações pessoais e sua senha."
        />
      </div>
    </div>
  );
}

