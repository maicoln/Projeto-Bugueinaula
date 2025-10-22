'use client';

import { useState, useEffect } from 'react';
// CORREÇÃO: Importar a FUNÇÃO 'createClient' em vez do objeto 'supabase'
import { createClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Book, CheckSquare, Users, FileText, ArrowRight, Loader2, Award, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';

// --- TIPOS ---
// (Todos os tipos permanecem inalterados)
type DisciplinaInfo = { id: number; nome: string };
type TurmaInfo = { id: number; nome: string };
type StatsAluno = { pendentes: number; avaliadas: number; media: number | null };
type AtividadeAluno = {
  id: number;
  titulo: string;
  semana: number;
  disciplinas: DisciplinaInfo | null;
  atividades_submissoes: { id: number; nota: number | null }[];
};
type Stats = { totalAlunos: number; totalConteudos: number; totalSubmissoesPendentes: number };
type SubmissaoPendente = {
  id: number;
  created_at: string;
  titulo_conteudo: string | null;
  nome_aluno: string | null;
  nome_disciplina: string | null;
};
type MaybeArray<T> = T | T[] | null;
const first = <T,>(v: MaybeArray<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
type RawConteudoAluno = {
  id: number;
  titulo: string;
  semana: number;
  disciplinas: MaybeArray<DisciplinaInfo>;
  atividades_submissoes: { id: number; nota: number | null }[];
};
type SubmissaoPendenteProfQuery = {
  id: number;
  created_at: string;
  conteudos: MaybeArray<{ titulo: string | null; disciplinas: MaybeArray<{ nome: string | null }> }>;
  profiles: MaybeArray<{ nome: string | null }>;
};
type TurmaJoin = {
  disciplinas: { disciplinas_turmas: { turmas: TurmaInfo | null }[] } | null;
};
type DisciplinaTurmaRow = { disciplinas: DisciplinaInfo[] };
type ProfessorDisciplinaRow = { disciplinas: DisciplinaInfo[] };

// --- COMPONENTE GLOBAL ---
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

// --- DASHBOARD ALUNO ---
function AlunoDashboard() {
  // CORREÇÃO: Instanciar o cliente Supabase usando useState
  const [supabase] = useState(() => createClient());

  const [stats, setStats] = useState<StatsAluno>({ pendentes: 0, avaliadas: 0, media: null });
  const [atividadesPendentes, setAtividadesPendentes] = useState<AtividadeAluno[]>([]);
  const [disciplinas, setDisciplinas] = useState<DisciplinaInfo[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Agora esta chamada funciona
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, [supabase]); // Adicionado 'supabase' ao array de dependências

  const { isLoading } = useSWR(
    () => (userId ? `aluno-dashboard-${userId}` : null),
    async () => {
      if (!userId) return null;

      // Perfil
      // E esta
      const { data: profile } = await supabase
        .from('profiles')
        .select('turma_id')
        .eq('id', userId)
        .single();

      if (!profile?.turma_id) return null;

      // Disciplinas do aluno (cada linha pode retornar várias disciplinas)
      const { data: disciplinasData } = await supabase
        .from('disciplinas_turmas')
        .select('disciplinas:disciplinas(id, nome)')
        .eq('turma_id', profile.turma_id);

      const rows = (disciplinasData ?? []) as DisciplinaTurmaRow[];
      const alunoDisciplinas = rows.flatMap((d) => d.disciplinas);

      setDisciplinas(alunoDisciplinas);
      const disciplinaIds = alunoDisciplinas.map((d) => d.id);
      if (disciplinaIds.length === 0) {
        setAtividadesPendentes([]);
        setStats({ pendentes: 0, avaliadas: 0, media: null });
        return true;
      }

      // Conteúdos de exercícios com submissões do aluno
      const { data: conteudos } = await supabase
        .from('conteudos')
        .select(
          'id, titulo, semana, disciplinas:disciplinas(id, nome), atividades_submissoes!left(id, nota)'
        )
        .in('disciplina_id', disciplinaIds)
        .eq('tipo', 'EXERCICIO')
        .eq('atividades_submissoes.aluno_id', userId);

      const conteudosRaw = (conteudos ?? []) as unknown as RawConteudoAluno[];

      const conteudosTipados: AtividadeAluno[] = conteudosRaw.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        semana: c.semana,
        disciplinas: first(c.disciplinas),
        atividades_submissoes: c.atividades_submissoes,
      }));

      const pendentes = conteudosTipados.filter((c) => c.atividades_submissoes.length === 0);
      const avaliadas = conteudosTipados.filter(
        (c) => c.atividades_submissoes.length > 0 && c.atividades_submissoes[0].nota !== null
      );
      const somaNotas = avaliadas.reduce((acc, c) => acc + (c.atividades_submissoes[0].nota ?? 0), 0);

      setAtividadesPendentes(pendentes.slice(0, 5));
      setStats({
        pendentes: pendentes.length,
        avaliadas: avaliadas.length,
        media: avaliadas.length > 0 ? somaNotas / avaliadas.length : null,
      });

      return true;
    },
    { refreshInterval: 5000, revalidateOnFocus: true, revalidateOnReconnect: true }
  );

  if (isLoading)
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> A carregar o seu painel...
      </div>
    );

  return (
    // ... (O JSX do AlunoDashboard permanece inalterado) ...
    <div className="animate-fade-in p-6">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Painel do Aluno</h1>
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<CheckSquare size={24} />} title="Atividades Pendentes" value={stats.pendentes} />
        <StatCard icon={<Award size={24} />} title="Atividades Avaliadas" value={stats.avaliadas} />
        <StatCard
          icon={<TrendingUp size={24} />}
          title="Média Geral"
          value={stats.media?.toFixed(1).replace('.', ',') ?? 'N/A'}
        />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Próximas Atividades</h2>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {atividadesPendentes.length > 0 ? (
              <ul className="divide-y dark:divide-gray-700">
                {atividadesPendentes.map((ativ) => (
                  <li key={ativ.id} className="py-3">
                    <Link
                      href={`/disciplinas/${ativ.disciplinas?.id}/semana/${ativ.semana}`}
                      className="group flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600">
                          {ativ.titulo}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {ativ.disciplinas?.nome ?? ''} • Semana {ativ.semana}
                        </p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-gray-400 transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-gray-500">Você está em dia com todas as atividades!</p>
            )}
          </div>
        </div>
        <div className="lg:col-span-1">
          <h2 className="mb-4 text-xl font-bold">Minhas Disciplinas</h2>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {disciplinas.length > 0 ? (
              <ul className="space-y-2">
                {disciplinas.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/disciplinas/${d.id}`}
                      className="group flex items-center justify-between rounded-lg p-3 transition hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <Book size={16} className="text-gray-500" />
                        <span className="font-medium">{d.nome}</span>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-gray-400 transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-gray-500">Nenhuma disciplina encontrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- DASHBOARD PROFESSOR ---
function ProfessorDashboard() {
  // CORREÇÃO: Instanciar o cliente Supabase usando useState
  const [supabase] = useState(() => createClient());

  const [stats, setStats] = useState<Stats>({ totalAlunos: 0, totalConteudos: 0, totalSubmissoesPendentes: 0 });
  const [submissoesPendentes, setSubmissoesPendentes] = useState<SubmissaoPendente[]>([]);
  const [disciplinas, setDisciplinas] = useState<DisciplinaInfo[]>([]);
  const [turmas, setTurmas] = useState<TurmaInfo[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<number | 'todas'>('todas');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Agora esta chamada funciona
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Buscar turmas do professor
      const { data: disciplinasRaw } = await supabase
        .from('professores_disciplinas')
        .select('disciplinas(disciplinas_turmas(turmas(id,nome)))')
        .eq('professor_id', user.id);

      const disciplinasData = (disciplinasRaw ?? []) as unknown as TurmaJoin[];
      const turmasMap = new Map<number, string>();

      // [CORRIGIDO] O loop foi ajustado para tratar 'd.disciplinas' como um objeto.
      disciplinasData.forEach((d) => {
        const disciplinaObj = d.disciplinas;
        if (disciplinaObj && Array.isArray(disciplinaObj.disciplinas_turmas)) {
            disciplinaObj.disciplinas_turmas.forEach((dt) => {
                if (dt.turmas) {
                    turmasMap.set(dt.turmas.id, dt.turmas.nome);
                }
            });
        }
      });

      setTurmas(Array.from(turmasMap.entries()).map(([id, nome]) => ({ id, nome })));
    })();
  }, [supabase]); // Adicionado 'supabase' ao array de dependências

  const { isLoading } = useSWR(
    () => (userId ? `professor-dashboard-${userId}-${selectedTurma}` : null),
    async () => {
      if (!userId) return null;

      // Disciplinas do professor (pode vir múltiplas por linha)
      const { data: disciplinasData } = await supabase
        .from('professores_disciplinas')
        .select('disciplinas:disciplinas(id,nome)')
        .eq('professor_id', userId);

      const profRows = (disciplinasData ?? []) as ProfessorDisciplinaRow[];
      const profDisciplinas = profRows.flatMap((d) => d.disciplinas);

      setDisciplinas(profDisciplinas);

      let disciplinaIds = profDisciplinas.map((d) => d.id);

      if (selectedTurma !== 'todas') {
        const { data: idsTurma } = await supabase
          .from('disciplinas_turmas')
          .select('disciplina_id')
          .eq('turma_id', selectedTurma);
        const ids = (idsTurma ?? []).map((d) => d.disciplina_id);
        disciplinaIds = disciplinaIds.filter((id) => ids.includes(id));
      }

      if (disciplinaIds.length === 0) {
        setSubmissoesPendentes([]);
        setStats({ totalAlunos: 0, totalConteudos: 0, totalSubmissoesPendentes: 0 });
        return true;
      }

      // Conteúdos
      const { data: conteudosIdsData } = await supabase
        .from('conteudos')
        .select('id')
        .in('disciplina_id', disciplinaIds);

      const conteudosIds = (conteudosIdsData ?? []).map((c) => c.id);

      let pendentes: SubmissaoPendente[] = [];
      let totalPendentes = 0;

      if (conteudosIds.length > 0) {
        const { data: pendentesData, count } = await supabase
          .from('atividades_submissoes')
          .select(
            `id, created_at,
             conteudos:conteudos(titulo, disciplinas:disciplinas(nome)),
             profiles:profiles(nome)`,
            { count: 'exact' }
          )
          .in('conteudo_id', conteudosIds)
          .is('nota', null)
          .order('created_at', { ascending: false })
          .limit(5);

        totalPendentes = count ?? 0;

        const rawPendentes = (pendentesData ?? []) as unknown as SubmissaoPendenteProfQuery[];

        pendentes = rawPendentes.map((s) => {
          const conteudo = first(s.conteudos);
          const disciplina = first(conteudo?.disciplinas ?? null);
          const profile = first(s.profiles);

          return {
            id: s.id,
            created_at: s.created_at,
            titulo_conteudo: conteudo?.titulo ?? null,
            nome_aluno: profile?.nome ?? null,
            nome_disciplina: disciplina?.nome ?? null,
          };
        });
      }

      setSubmissoesPendentes(pendentes);

      // Estatísticas
      const { count: totalConteudos } = await supabase
        .from('conteudos')
        .select('id', { count: 'exact' })
        .in('disciplina_id', disciplinaIds);

      let totalAlunos = 0;
      if (selectedTurma !== 'todas') {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('tipo_usuario', 'ALUNO')
          .eq('turma_id', selectedTurma);
        totalAlunos = count ?? 0;
      } else {
        const { data: todasTurmas } = await supabase
          .from('disciplinas_turmas')
          .select('turma_id')
          .in('disciplina_id', disciplinaIds);
        const turmaIds = [...new Set((todasTurmas ?? []).map((t) => t.turma_id))];
        if (turmaIds.length > 0) {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('tipo_usuario', 'ALUNO')
            .in('turma_id', turmaIds);
          totalAlunos = count ?? 0;
        }
      }

      setStats({
        totalAlunos,
        totalConteudos: totalConteudos ?? 0,
        totalSubmissoesPendentes: totalPendentes,
      });

      return true;
    },
    { refreshInterval: 5000, revalidateOnFocus: true, revalidateOnReconnect: true }
  );

  if (isLoading)
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> A atualizar dados...
      </div>
    );

  return (
    // ... (O JSX do ProfessorDashboard permanece inalterado) ...
    <div className="animate-fade-in p-6">
      <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Painel do Professor</h1>
        <select
          value={selectedTurma === 'todas' ? 'todas' : String(selectedTurma)}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedTurma(v === 'todas' ? 'todas' : Number(v));
          }}
          className="w-full sm:w-auto rounded-lg border p-2 shadow-sm dark:border-gray-600 dark:bg-gray-800"
          disabled={isLoading}
        >
          <option value="todas">Visão Geral - Todas as Turmas</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<Users size={24} />} title="Total de Alunos" value={stats.totalAlunos} />
        <StatCard icon={<CheckSquare size={24} />} title="A Corrigir" value={stats.totalSubmissoesPendentes} />
        <StatCard icon={<FileText size={24} />} title="Conteúdos Criados" value={stats.totalConteudos} />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Atividades a Corrigir</h2>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {submissoesPendentes.length > 0 ? (
              <ul className="divide-y dark:divide-gray-700">
                {submissoesPendentes.map((s) => (
                  <li key={s.id} className="py-3">
                    <Link href={`/professor/submissoes`} className="group flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600">
                          {s.nome_aluno}{' '}
                          <span className="font-normal text-gray-500">enviou</span> {s.titulo_conteudo}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {s.nome_disciplina ?? 'Disciplina desconhecida'} •{' '}
                          {new Date(s.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-gray-400 transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-gray-500">Nenhuma atividade pendente para a seleção atual.</p>
            )}
          </div>
        </div>
        <div className="lg:col-span-1">
          <h2 className="mb-4 text-xl font-bold">Minhas Disciplinas</h2>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {disciplinas.length > 0 ? (
              <ul className="space-y-2">
                {disciplinas.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/disciplinas/${d.id}`}
                      className="group flex items-center justify-between rounded-lg p-3 transition hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    >
                    G <div className="flex items-center gap-3">
                        <Book size={16} className="text-gray-500" />
                        <span className="font-medium">{d.nome}</span>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-gray-400 transition-transform group-hover:translate-x-1"
                      />
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

// --- COMPONENTE PRINCIPAL ---
export default function DashboardClientPage() {
  // CORREÇÃO: Instanciar o cliente Supabase usando useState
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [userRole, setUserRole] = useState<'ALUNO' | 'PROFESSOR' | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    (async () => {
      // Agora esta chamada funciona
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      // E esta
      const { data: profile } = await supabase
        .from('profiles')
        .select('tipo_usuario')
        .eq('id', user.id)
        .single();
      setUserRole(profile?.tipo_usuario ?? null);
      setLoadingRole(false);
    })();
  }, [router, supabase]); // Adicionado 'supabase' ao array de dependências

  if (loadingRole)
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> A verificar utilizador...
      </div>
    );

  if (userRole === 'ALUNO') return <AlunoDashboard />;
  if (userRole === 'PROFESSOR') return <ProfessorDashboard />;
  return <div className="p-6">Tipo de utilizador não reconhecido.</div>;
}
