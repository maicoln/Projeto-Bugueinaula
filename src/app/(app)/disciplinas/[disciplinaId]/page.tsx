// Local: /src/app/(app)/disciplinas/[disciplinaId]/page.tsx (Com correção de tipo)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FileText, Lightbulb, ClipboardCheck } from 'lucide-react';

// --- Tipos e Componentes Auxiliares (sem alterações) ---
type Conteudo = { id: number; tipo: 'MATERIAL_AULA' | 'EXEMPLO' | 'EXERCICIO'; titulo: string; descricao: string | null };
type Semana = { numero: number; conteudos: Conteudo[] };
type Bimestre = { numero: number; semanas: Semana[] };

function ConteudoIcon({ tipo }: { tipo: Conteudo['tipo'] }) {
  const iconMap = {
    MATERIAL_AULA: <FileText className="h-5 w-5 flex-shrink-0 text-blue-500" />,
    EXEMPLO: <Lightbulb className="h-5 w-5 flex-shrink-0 text-yellow-500" />,
    EXERCICIO: <ClipboardCheck className="h-5 w-5 flex-shrink-0 text-green-500" />,
  };
  return <span className="mt-1">{iconMap[tipo]}</span>;
}
// --- Fim dos Tipos e Componentes Auxiliares ---

// MUDANÇA 1: A tipagem de 'params' foi simplificada para um objeto normal.
export default function DisciplinaDetalhesPage({ params }: { params: { disciplinaId: string } }) {
  const [loading, setLoading] = useState(true);
  const [disciplinaNome, setDisciplinaNome] = useState('');
  const [estruturaOrganizada, setEstruturaOrganizada] = useState<Bimestre[]>([]);
  const router = useRouter();

  // MUDANÇA 2: Lemos o disciplinaId diretamente de params
  const { disciplinaId } = params;

  useEffect(() => {
    async function fetchConteudo() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Busca o nome da disciplina
      const { data: disciplina } = await supabase
        .from('disciplinas')
        .select('nome')
        .eq('id', disciplinaId) // Usa a variável disciplinaId
        .single();
      if (disciplina) setDisciplinaNome(disciplina.nome);

      // Busca os conteúdos
      const { data: conteudos, error } = await supabase
        .from('conteudos')
        .select('id, bimestre, semana, tipo, titulo, descricao')
        .eq('disciplina_id', disciplinaId) // Usa a variável disciplinaId
        .order('bimestre', { ascending: true })
        .order('semana', { ascending: true });

      if (error) {
        console.error('Erro ao buscar conteúdo:', error);
      } else if (conteudos) {
        // ... Lógica de reduce (sem alterações)
        const estrutura = (conteudos || []).reduce<Bimestre[]>((acc, item) => {
          let bimestre = acc.find(b => b.numero === item.bimestre);
          if (!bimestre) {
            bimestre = { numero: item.bimestre, semanas: [] };
            acc.push(bimestre);
          }
          let semana = bimestre.semanas.find(s => s.numero === item.semana);
          if (!semana) {
            semana = { numero: item.semana, conteudos: [] };
            bimestre.semanas.push(semana);
          }
          semana.conteudos.push({
            id: item.id,
            tipo: item.tipo as Conteudo['tipo'],
            titulo: item.titulo,
            descricao: item.descricao
          });
          return acc;
        }, []);
        setEstruturaOrganizada(estrutura);
      }
      setLoading(false);
    }
    fetchConteudo();
  }, [disciplinaId, router]);

  if (loading) {
    return <div className="text-center">Carregando conteúdo da disciplina...</div>;
  }

  // O JSX para renderização permanece o mesmo
  return (
    <div>
      {/* ... */}
    </div>
  );
}