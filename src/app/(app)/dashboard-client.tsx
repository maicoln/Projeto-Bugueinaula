'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Book, CheckSquare, Users, FileText, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Tipos básicos
type DisciplinaInfo = { id: number; nome: string };

type SubmissaoPendente = {
  id: number;
  titulo_conteudo: string | null;
  nome_aluno: string | null;
  nome_disciplina: string | null;
  id_disciplina: number | null;
  id_conteudo: number | null;
  created_at: string;
};

type Stats = {
  totalAlunos: number;
  totalConteudos: number;
  totalSubmissoesPendentes: number;
};

// Tipos para payloads flexíveis (pode vir como array, objeto ou null)
type ProfilePayload = { nome?: string | null };
type ProfilesPayload = ProfilePayload[] | ProfilePayload | null;

type DisciplinaPayload = { nome?: string | null };
type DisciplinaPayloads = DisciplinaPayload[] | DisciplinaPayload | null;

type ConteudoPayload = {
  id?: number | null;
  titulo?: string | null;
  disciplina_id?: number | null;
  disciplinas?: DisciplinaPayloads;
};
type ConteudosPayload = ConteudoPayload[] | ConteudoPayload | null;

type PendentesQueryResult = {
  id: number;
  created_at: string;
  conteudos: ConteudosPayload;
  profiles: ProfilesPayload;
};

// Helpers robustos (aceitam array | objeto | null)
function getUserNome(profiles: ProfilesPayload): string {
  if (!profiles) return 'Aluno desconhecido';
  if (Array.isArray(profiles)) return profiles[0]?.nome ?? 'Aluno desconhecido';
  return (profiles as ProfilePayload).nome ?? 'Aluno desconhecido';
}

function getConteudoTitulo(conteudos: ConteudosPayload): string {
  if (!conteudos) return 'Conteúdo desconhecido';
  if (Array.isArray(conteudos)) return conteudos[0]?.titulo ?? 'Conteúdo desconhecido';
  return (conteudos as ConteudoPayload).titulo ?? 'Conteúdo desconhecido';
}

function getDisciplinaNomeFromConteudo(conteudos: ConteudosPayload): string | null {
  if (!conteudos) return null;
  const firstConteudo: ConteudoPayload | undefined = Array.isArray(conteudos) ? conteudos[0] : (conteudos as ConteudoPayload | null) ?? undefined;
  const disciplinas = firstConteudo?.disciplinas ?? null;
  if (!disciplinas) return null;
  if (Array.isArray(disciplinas)) return disciplinas[0]?.nome ?? null;
  return (disciplinas as DisciplinaPayload).nome ?? null;
}

export default function DashboardClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [disciplinas, setDisciplinas] = useState<DisciplinaInfo[]>([]);
  const [submissoesPendentes, setSubmissoesPendentes] = useState<SubmissaoPendente[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalAlunos: 0,
    totalConteudos: 0,
    totalSubmissoesPendentes: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('tipo_usuario').eq('id', user.id).single();
      if (profile?.tipo_usuario === 'ALUNO') {
        router.push('/aluno/atividades');
        return;
      }
      if (profile?.tipo_usuario !== 'PROFESSOR') {
        setLoading(false);
        return;
      }

      // 1) Disciplinas do professor
      const { data: disciplinasData } = await supabase
        .from('professores_disciplinas')
        .select('disciplinas(id, nome)')
        .eq('professor_id', user.id);

      const profDisciplinas = (disciplinasData as { disciplinas?: DisciplinaInfo[] | null }[] | null)
        ?.flatMap(item => item.disciplinas || [])
        .filter(Boolean) as DisciplinaInfo[] || [];
      setDisciplinas(profDisciplinas);
      const disciplinaIds = profDisciplinas.map(d => d.id);

      if (disciplinaIds.length === 0) {
        setLoading(false);
        return;
      }

      // 2) Submissões pendentes
      const { data: conteudosIdsData } = await supabase.from('conteudos').select('id').in('disciplina_id', disciplinaIds);
      const conteudosIds = conteudosIdsData?.map((c: { id: number }) => c.id) || [];

      let pendentes: SubmissaoPendente[] = [];
      let totalPendentes = 0;

      if (conteudosIds.length > 0) {
        const { data: pendentesData, count } = await supabase
          .from('atividades_submissoes')
          .select(`id, created_at, conteudos (id, titulo, disciplina_id, disciplinas (nome)), profiles (nome)`, { count: 'exact' })
          .in('conteudo_id', conteudosIds)
          .is('nota', null)
          .order('created_at', { ascending: false })
          .limit(5);

        totalPendentes = count || 0;

        const rows = (pendentesData as PendentesQueryResult[] | null) ?? [];

        pendentes = rows.map((s) => {
          // Usamos os helpers para extrair valores de forma consistente
          const titulo_conteudo = getConteudoTitulo(s.conteudos);
          const nome_disciplina = getDisciplinaNomeFromConteudo(s.conteudos);
          const nome_aluno = getUserNome(s.profiles);

          // Pegar ids a partir do primeiro conteúdo (se existir)
          const firstConteudo = Array.isArray(s.conteudos) ? s.conteudos[0] : (s.conteudos as ConteudoPayload | null) ?? undefined;

          return {
            id: s.id,
            created_at: s.created_at,
            titulo_conteudo,
            nome_aluno,
            id_disciplina: firstConteudo?.disciplina_id ?? null,
            nome_disciplina,
            id_conteudo: firstConteudo?.id ?? null,
          } as SubmissaoPendente;
        });

        setSubmissoesPendentes(pendentes);
      } else {
        setSubmissoesPendentes([]);
      }

      // 3) Estatísticas
      const { count: totalConteudos } = await supabase.from('conteudos').select('id', { count: 'exact' }).in('disciplina_id', disciplinaIds);
      const { data: turmas } = await supabase.from('disciplinas_turmas').select('turma_id').in('disciplina_id', disciplinaIds);
      const turmaIds = turmas?.map((t: { turma_id: number }) => t.turma_id) || [];

      let totalAlunos = 0;
      if (turmaIds.length > 0) {
        const { count } = await supabase.from('profiles').select('id', { count: 'exact' }).in('turma_id', turmaIds).eq('tipo_usuario', 'ALUNO');
        totalAlunos = count || 0;
      }

      setStats({
        totalAlunos,
        totalConteudos: totalConteudos || 0,
        totalSubmissoesPendentes: totalPendentes,
      });
    } catch (error) {
      // Mantemos o erro no console para depuração
      // (não usamos "any" aqui — o TS infere o tipo do catch como unknown)
      // eslint-disable-next-line no-console
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Polling a cada 15s (fetch inicial + interval)
  useEffect(() => {
    void fetchDashboardData();
    const interval = setInterval(() => void fetchDashboardData(), 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> A carregar o seu painel...
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-6">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Painel do Professor</h1>

      {/* Estatísticas */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<Users size={24} />} title="Total de Alunos" value={stats.totalAlunos} />
        <StatCard icon={<CheckSquare size={24} />} title="A Corrigir" value={stats.totalSubmissoesPendentes} />
        <StatCard icon={<FileText size={24} />} title="Conteúdos Criados" value={stats.totalConteudos} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Submissões pendentes */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Atividades a Corrigir</h2>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {submissoesPendentes.length > 0 ? (
              <ul className="divide-y dark:divide-gray-700">
                {submissoesPendentes.map((sub) => (
                  <li key={sub.id} className="py-3">
                    <Link href={`/professor/submissoes`} className="group flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600">
                          {sub.nome_aluno} <span className="font-normal text-gray-500">enviou</span> {sub.titulo_conteudo}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {sub.nome_disciplina ?? 'Disciplina desconhecida'} • {new Date(sub.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <ArrowRight size={16} className="text-gray-400 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-gray-500">Nenhuma atividade pendente. Bom trabalho!</p>
            )}
          </div>
        </div>

        {/* Disciplinas */}
        <div className="lg:col-span-1">
          <h2 className="mb-4 text-xl font-bold">Minhas Disciplinas</h2>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {disciplinas.length > 0 ? (
              <ul className="space-y-2">
                {disciplinas.map((disc) => (
                  <li key={disc.id}>
                    <Link
                      href={`/disciplinas/${disc.id}`}
                      className="group flex items-center justify-between rounded-lg p-3 transition hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <Book size={16} className="text-gray-500" />
                        <span className="font-medium">{disc.nome}</span>
                      </div>
                      <ArrowRight size={16} className="text-gray-400 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-gray-500">Nenhuma disciplina associada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ icon, title, value }: { icon: React.ReactNode; title: string; value: number | string }) => (
  <div className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);
