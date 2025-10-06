'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { PlusCircle, Search, MessageSquare, Check, Loader2 } from 'lucide-react';

// ---------- Tipos ----------
type ProfileInfo = { id: string; nome: string; tipo_usuario: string | null };
type EscolaInfo = { id: number; nome: string };
type TurmaInfo = { id: number; nome: string };

type Duvida = {
  id: number;
  titulo: string;
  created_at: string;
  resolvida: boolean;
  is_anonymous: boolean;
  disciplina_id: number | null;
  profiles?: { nome: string }[] | null;
  respostas_duvidas?: { count: number }[] | null;
};

// Tipos auxiliares para respostas do Supabase (evitam `any`)
type ProfessorEscolaRow = { escolas?: EscolaInfo | EscolaInfo[] | null };
type DisciplinaRow = { id: number };
type TurmaIdRow = { id: number };
type TurmaRow = { id: number; nome: string };

// ---------- AlunoView (simples, válido) ----------
function AlunoView({ user }: { user: ProfileInfo }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Central de Dúvidas — Aluno</h1>
      <p className="text-gray-500 mt-2">Bem-vindo, {user.nome}!</p>
    </div>
  );
}

// ---------- ProfessorView ----------
function ProfessorView({ user }: { user: ProfileInfo }) {
  const [escolas, setEscolas] = useState<EscolaInfo[]>([]);
  const [turmas, setTurmas] = useState<TurmaInfo[]>([]);
  const [selectedEscola, setSelectedEscola] = useState<string>('');
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'todas' | 'nao_resolvidas' | 'resolvidas' | 'gerais'>('todas');

  // Buscar escolas do professor (tipado)
  const fetchEscolas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('professores_escolas')
        .select('escolas!inner(id, nome)')
        .eq('professor_id', user.id);

      if (error) throw error;

      const rows = (data ?? []) as ProfessorEscolaRow[];

      // aceita item.escolas como objeto ou array
      const flattened = rows.flatMap(row => {
        const e = row?.escolas;
        if (!e) return [];
        return Array.isArray(e) ? e : [e];
      });

      const parsed = flattened.filter((x): x is EscolaInfo => !!x && typeof x.id === 'number' && typeof x.nome === 'string');
      setEscolas(parsed);
    } catch (err) {
      console.error('Erro ao buscar escolas:', err);
    }
  }, [user.id]);

  useEffect(() => { void fetchEscolas(); }, [fetchEscolas]);

  // Buscar turmas quando escola selecionada (tipado)
  useEffect(() => {
    const fetchTurmas = async () => {
      if (!selectedEscola) {
        setTurmas([]);
        setSelectedTurma('');
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const { data: disciplinasData, error: disciplinasError } = await supabase
          .from('disciplinas')
          .select('id, professores_disciplinas!inner(professor_id)')
          .eq('escola_id', selectedEscola)
          .eq('professores_disciplinas.professor_id', userId);

        if (disciplinasError) throw disciplinasError;

        const disciplinaRows = (disciplinasData ?? []) as DisciplinaRow[];
        const disciplinaIds = disciplinaRows.map(d => d.id).filter((id): id is number => Number.isInteger(id));
        if (disciplinaIds.length === 0) {
          setTurmas([]);
          return;
        }

        const { data: turmasData, error: turmasError } = await supabase
          .from('turmas')
          .select('id, nome, disciplinas_turmas!inner(disciplina_id)')
          .in('disciplinas_turmas.disciplina_id', disciplinaIds)
          .order('nome', { ascending: true });

        if (turmasError) throw turmasError;

        const turmaRows = (turmasData ?? []) as TurmaRow[];
        setTurmas(turmaRows.map(t => ({ id: t.id, nome: t.nome })));
      } catch (err) {
        console.error('Erro ao buscar turmas:', err);
      }
    };

    void fetchTurmas();
  }, [selectedEscola]);

  // SWR para dúvidas (tipado e sem `any`)
  const { data: duvidas, error, isLoading } = useSWR(
    ['duvidas-prof', String(user.id), String(selectedEscola), String(selectedTurma), searchTerm, activeFilter],
    async ([, _userId, escola, turma, search, filter]) => {
      let query = supabase
        .from('duvidas')
        .select('id, titulo, created_at, resolvida, is_anonymous, disciplina_id, profiles ( nome ), respostas_duvidas ( count )')
        .order('created_at', { ascending: false });

      if (turma && turma !== '') {
        query = query.eq('turma_id', Number(turma));
      } else if (escola && escola !== '') {
        const { data: turmasDaEscola } = await supabase
          .from('turmas')
          .select('id')
          .eq('escola_id', Number(escola));
        const turmaRows = (turmasDaEscola ?? []) as TurmaIdRow[];
        const turmaIds = turmaRows.map(t => t.id).filter((id): id is number => Number.isInteger(id));
        if (turmaIds.length > 0) query = query.in('turma_id', turmaIds);
      }

      if (typeof search === 'string' && search.trim().length > 2) {
        query = query.ilike('titulo', `%${search.trim()}%`);
      }

      if (filter === 'nao_resolvidas') query = query.eq('resolvida', false);
      else if (filter === 'resolvidas') query = query.eq('resolvida', true);
      else if (filter === 'gerais') query = query.is('disciplina_id', null);

      const { data, error } = await query;
      if (error) throw error;
      return (data as Duvida[]) ?? [];
    }
  );

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de Dúvidas</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Filtre para ver as perguntas das suas turmas.</p>
        </div>
        <Link href="/duvidas/nova" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-700">
          <PlusCircle size={20} /> Fazer uma Pergunta
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="escola-filter" className="sr-only">Escola</label>
          <select id="escola-filter" value={selectedEscola} onChange={e => setSelectedEscola(e.target.value)} className="w-full rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800">
            <option value="">Todas as Escolas</option>
            {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="turma-filter" className="sr-only">Turma</label>
          <select id="turma-filter" value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)} disabled={!selectedEscola} className="w-full rounded-lg border p-3 shadow-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
            <option value="">Todas as Turmas</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full rounded-lg border p-3 pl-10 shadow-sm dark:border-gray-600 dark:bg-gray-800" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Filtrar por:</span>
          <button onClick={() => setActiveFilter('todas')} className={`px-3 py-1 text-sm rounded-full transition ${activeFilter === 'todas' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`}>Todas</button>
          <button onClick={() => setActiveFilter('nao_resolvidas')} className={`px-3 py-1 text-sm rounded-full transition ${activeFilter === 'nao_resolvidas' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`}>Não Resolvidas</button>
          <button onClick={() => setActiveFilter('resolvidas')} className={`px-3 py-1 text-sm rounded-full transition ${activeFilter === 'resolvidas' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`}>Resolvidas</button>
          <button onClick={() => setActiveFilter('gerais')} className={`px-3 py-1 text-sm rounded-full transition ${activeFilter === 'gerais' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`}>Gerais</button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading && <p className="text-center text-gray-500">A carregar dúvidas...</p>}
        {error && <p className="text-center text-red-500">Erro ao carregar as dúvidas.</p>}
        {!isLoading && (!duvidas || duvidas.length === 0) && (
          <div className="py-16 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Nenhuma dúvida encontrada para os filtros selecionados.</h3>
          </div>
        )}
        {duvidas?.map(d => (
          <Link key={d.id} href={`/duvidas/${d.id}`} className="block">
            <div className="rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">{d.titulo}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Perguntado por {d.profiles?.[0]?.nome ?? 'Desconhecido'} • {new Date(d.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><span>{d.respostas_duvidas?.[0]?.count ?? 0}</span><MessageSquare size={16} /></div>
                  {d.resolvida && (<span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full dark:bg-green-900/50 dark:text-green-300"><Check size={12} /> Resolvida</span>)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------- Componente principal (autenticação robusta) ----------
export default function CentralDeDuvidasPage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      console.log('Sessão atual:', session);

      const userId = session?.user?.id;
      if (!userId) { setUser(null); return; }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, tipo_usuario')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro na query profiles:', error);
        setUser(null);
        return;
      }
      if (!data) {
        console.warn('Perfil não encontrado para id', userId);
        setUser(null);
        return;
      }

      setUser({
        id: data.id,
        nome: data.nome,
        tipo_usuario: data.tipo_usuario ?? null,
      });
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> A verificar utilizador...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 font-medium">Não foi possível identificar o utilizador.</p>
        <button onClick={() => router.push('/login')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md">Ir para Login</button>
      </div>
    );
  }

  if (user.tipo_usuario === 'ALUNO') return <AlunoView user={user} />;
  if (user.tipo_usuario === 'PROFESSOR') return <ProfessorView user={user} />;

  return <div className="p-6">Tipo de utilizador não reconhecido: {String(user.tipo_usuario)}</div>;
}
