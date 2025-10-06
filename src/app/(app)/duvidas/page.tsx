// src/app/(app)/professor/duvidas/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, School, Users, Search, Filter } from 'lucide-react';

// --- Tipos de Dados ---
type ProfileInfo = {
  id: string;
  nome: string;
  role: 'professor' | 'aluno' | null;
};

type Escola = { id: number; nome: string };
type Turma = { id: number; nome: string };

type Duvida = {
  id: number;
  titulo: string;
  descricao: string;
  status: 'pendente' | 'respondida';
  escola_id: number;
  turma_id: number;
  created_at: string;
  respostas_duvidas: { id: number }[];
};

// --- Tipos de respostas do Supabase ---
type ProfessorEscolaResponse = { escolas: Escola | Escola[] | null };
type DisciplinaResponse = { disciplinas: { disciplinas_turmas: { turma_id: number }[] }[] | null };

// --- Componente Principal ---
export default function CentralDuvidasPage() {
  const [user, setUser] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // --- 1. Busca perfil ---
  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Carregando...
      </div>
    );
  }

  if (!user) {
    return <div className="text-center mt-10 text-red-500">Erro ao carregar usuário.</div>;
  }

  if (user.role === 'professor') return <ProfessorView user={user} />;
  if (user.role === 'aluno') return <AlunoView user={user} />;

  return <div className="text-center mt-10 text-gray-500">Acesso restrito.</div>;
}

// --- Componente do Professor ---
function ProfessorView({ user }: { user: ProfileInfo }) {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedEscola, setSelectedEscola] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todas' | 'respondidas' | 'pendentes'>('todas');
  const [isTurmasLoading, setIsTurmasLoading] = useState(false);

  // --- 1. Busca as escolas do professor ---
  const fetchEscolas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('professores_escolas')
        .select('escolas!inner(id, nome)')
        .eq('professor_id', user.id);

      if (error) throw error;

      const professorEscolas = (data ?? [])
        .flatMap((item: ProfessorEscolaResponse) => item.escolas || [])
        .filter((escola): escola is Escola => escola !== null);

      setEscolas(professorEscolas);
    } catch (err) {
      console.error('Erro ao buscar escolas:', err);
    }
  }, [user.id]);

  useEffect(() => { fetchEscolas(); }, [fetchEscolas]);

  // --- 2. Busca as turmas da escola selecionada ---
  useEffect(() => {
    const fetchTurmas = async () => {
      if (!selectedEscola) {
        setTurmas([]);
        return;
      }
      setIsTurmasLoading(true);
      try {
        // Disciplinas do professor na escola selecionada
        const { data: disciplinasData, error: disciplinasError } = await supabase
          .from('disciplinas')
          .select('id, professores_disciplinas!inner(professor_id)')
          .eq('escola_id', selectedEscola)
          .eq('professores_disciplinas.professor_id', user.id);

        if (disciplinasError) throw disciplinasError;
        const disciplinaIds = (disciplinasData ?? []).map(d => d.id);

        if (disciplinaIds.length === 0) {
          setTurmas([]);
          return;
        }

        // Turmas dessas disciplinas
        const { data: turmasData, error: turmasError } = await supabase
          .from('turmas')
          .select('id, nome, disciplinas_turmas!inner(disciplina_id)')
          .in('disciplinas_turmas.disciplina_id', disciplinaIds)
          .order('nome', { ascending: true });

        if (turmasError) throw turmasError;
        setTurmas(turmasData ?? []);
      } catch (err) {
        console.error('Erro ao buscar turmas:', err);
      } finally {
        setIsTurmasLoading(false);
      }
    };
    fetchTurmas();
  }, [selectedEscola, user.id]);

  // --- 3. Busca as dúvidas ---
  const fetchDuvidas = async (
    [_key, userId, escolaId, turmaId, search, filter]:
    [string, string, string, string, string, string]
  ): Promise<Duvida[]> => {
    let query = supabase
      .from('duvidas')
      .select('id, titulo, descricao, status, escola_id, turma_id, created_at, respostas_duvidas(id)')
      .eq('professor_id', userId);

    if (escolaId) query = query.eq('escola_id', escolaId);
    if (turmaId) query = query.eq('turma_id', turmaId);
    if (filter === 'respondidas') query = query.eq('status', 'respondida');
    if (filter === 'pendentes') query = query.eq('status', 'pendente');
    if (search.trim().length > 2) query = query.ilike('titulo', `%${search.trim()}%`);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  };

  const { data: duvidas, isLoading, mutate } = useSWR<Duvida[]>(
    ['duvidas', user.id, selectedEscola, selectedTurma, searchTerm, activeFilter],
    fetchDuvidas
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Central de Dúvidas</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <School className="absolute left-3 top-3 text-gray-400" />
          <select
            value={selectedEscola}
            onChange={e => { setSelectedEscola(e.target.value); setSelectedTurma(''); }}
            className="w-full appearance-none rounded-lg border p-2 pl-10"
          >
            <option value="">Selecione a escola</option>
            {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div className="relative">
          <Users className="absolute left-3 top-3 text-gray-400" />
          <select
            value={selectedTurma}
            onChange={e => setSelectedTurma(e.target.value)}
            disabled={!selectedEscola || isTurmasLoading}
            className="w-full appearance-none rounded-lg border p-2 pl-10"
          >
            <option value="">
              {isTurmasLoading ? 'A carregar...' : 'Selecione a turma'}
            </option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar dúvidas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border p-2 pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-3 text-gray-400" />
          <select
            value={activeFilter}
            onChange={e => setActiveFilter(e.target.value as typeof activeFilter)}
            className="w-full appearance-none rounded-lg border p-2 pl-10"
          >
            <option value="todas">Todas</option>
            <option value="respondidas">Respondidas</option>
            <option value="pendentes">Pendentes</option>
          </select>
        </div>
      </div>

      {/* Lista de dúvidas */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <Loader2 className="animate-spin mr-2" /> A carregar dúvidas...
        </div>
      ) : duvidas && duvidas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {duvidas.map(d => (
            <div key={d.id} className="border rounded-xl p-4 shadow-sm bg-white dark:bg-gray-800">
              <h2 className="font-bold text-lg">{d.titulo}</h2>
              <p className="text-sm text-gray-500 mt-1">{d.descricao}</p>
              <p className="text-xs text-gray-400 mt-2">
                Status: {d.status === 'respondida' ? '✅ Respondida' : '🕓 Pendente'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-10">Nenhuma dúvida encontrada.</div>
      )}
    </div>
  );
}

// --- Componente do Aluno ---
function AlunoView({ user }: { user: ProfileInfo }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Central de Dúvidas do Aluno</h1>
      <p className="text-gray-500 mt-2">
        Bem-vindo, {user.nome}! (modo aluno em desenvolvimento)
      </p>
    </div>
  );
}
