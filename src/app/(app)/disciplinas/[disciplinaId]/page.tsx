// src/app/(app)/disciplinas/[disciplinaId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FileText, Lightbulb, ClipboardCheck } from 'lucide-react';

type Conteudo = {
  id: number;
  tipo: 'MATERIAL_AULA' | 'EXEMPLO' | 'EXERCICIO';
  titulo: string;
  descricao: string | null;
};

type Semana = { numero: number; conteudos: Conteudo[] };
type Bimestre = { numero: number; semanas: Semana[] };

function ConteudoIcon({ tipo }: { tipo: Conteudo['tipo'] }) {
  const iconMap = {
    MATERIAL_AULA: (
      <FileText className="h-5 w-5 flex-shrink-0 text-blue-500" />
    ),
    EXEMPLO: (
      <Lightbulb className="h-5 w-5 flex-shrink-0 text-yellow-500" />
    ),
    EXERCICIO: (
      <ClipboardCheck className="h-5 w-5 flex-shrink-0 text-green-500" />
    ),
  };
  return <span className="mt-1">{iconMap[tipo]}</span>;
}

export default function DisciplinaDetalhesPage({
  params,
}: {
  params: Promise<{ disciplinaId: string }>;
}) {
  const [loading, setLoading] = useState(true);
  const [disciplinaNome, setDisciplinaNome] = useState('');
  const [estruturaOrganizada, setEstruturaOrganizada] = useState<Bimestre[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchConteudo() {
      const { disciplinaId } = await params;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: disciplina } = await supabase
        .from('disciplinas')
        .select('nome')
        .eq('id', disciplinaId)
        .single();

      if (disciplina) setDisciplinaNome(disciplina.nome);

      const { data: conteudos } = await supabase
        .from('conteudos')
        .select('id, bimestre, semana, tipo, titulo, descricao')
        .eq('disciplina_id', disciplinaId)
        .order('bimestre', { ascending: true })
        .order('semana', { ascending: true });

      const estrutura = (conteudos || []).reduce<Bimestre[]>((acc, item) => {
        let bimestre = acc.find((b) => b.numero === item.bimestre);
        if (!bimestre) {
          bimestre = { numero: item.bimestre, semanas: [] };
          acc.push(bimestre);
        }

        let semana = bimestre.semanas.find((s) => s.numero === item.semana);
        if (!semana) {
          semana = { numero: item.semana, conteudos: [] };
          bimestre.semanas.push(semana);
        }

        semana.conteudos.push({
          id: item.id,
          tipo: item.tipo as Conteudo['tipo'],
          titulo: item.titulo,
          descricao: item.descricao,
        });

        return acc;
      }, []);

      setEstruturaOrganizada(estrutura);
      setLoading(false);
    }
    fetchConteudo();
  }, [params, router]);

  if (loading) {
    return <div className="text-center">Carregando conteúdo da disciplina...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">
        {disciplinaNome || 'Conteúdo da Disciplina'}
      </h1>
      <div className="space-y-6">
        {estruturaOrganizada.length > 0 ? (
          estruturaOrganizada.map((bimestre) => (
            <details
              key={bimestre.numero}
              open
              className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"
            >
              <summary className="cursor-pointer text-xl font-semibold hover:text-blue-600 dark:hover:text-blue-400">
                {bimestre.numero}º Bimestre
              </summary>
              <div className="mt-4 space-y-4 border-l-2 border-gray-200 pl-4 dark:border-gray-700">
                {bimestre.semanas.map((semana) => (
                  <details
                    key={semana.numero}
                    open
                    className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900"
                  >
                    <summary className="cursor-pointer font-medium hover:text-blue-600 dark:hover:text-blue-400">
                      Semana {semana.numero}
                    </summary>
                    <ul className="mt-3 space-y-3 pl-4">
                      {semana.conteudos.map((conteudo) => (
                        <li
                          key={conteudo.id}
                          className="flex items-start gap-4"
                        >
                          <ConteudoIcon tipo={conteudo.tipo} />
                          <div>
                            <h4 className="font-semibold">{conteudo.titulo}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {conteudo.descricao}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </details>
          ))
        ) : (
          <p>Nenhum conteúdo cadastrado para esta disciplina ainda.</p>
        )}
      </div>
    </div>
  );
}
