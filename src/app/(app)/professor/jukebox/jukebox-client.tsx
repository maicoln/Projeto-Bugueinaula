// src/app/(app)/professor/jukebox/jukebox-client.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import { Music, SkipForward, Trash2, ListMusic, PlayCircle, Loader2, School } from 'lucide-react';

// --- Carregamento Dinâmico do Player ---
const ReactPlayer = dynamic(() => import('react-player').then(mod => mod.default), { ssr: false });

// --- Tipos de Dados ---
type Profile = { nome: string | null };
type Escola = { id: number; nome: string };
type Turma = { id: number; nome: string };
type JukeboxQueueItem = {
  id: number;
  song_title: string | null;
  youtube_url: string;
  status: 'playing' | 'queued' | 'played' | 'skipped';
  profiles: Profile | null;
};
// Tipos para as respostas do Supabase
type ProfessorEscolaResponse = { escolas: Escola | Escola[] | null };
type JukeboxQueueResponse = Omit<JukeboxQueueItem, 'profiles'> & {
  profiles: Profile | Profile[] | null;
};

// --- Componente Principal ---
export default function JukeboxPlayerClientPage() {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedEscola, setSelectedEscola] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTurmasLoading, setIsTurmasLoading] = useState(false);

  const [currentSong, setCurrentSong] = useState<JukeboxQueueItem | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- 1. Busca as escolas do professor ao carregar ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado.");

      const { data, error } = await supabase
        .from('professores_escolas')
        .select('escolas!inner(id, nome)')
        .eq('professor_id', user.id);
      
      if (error) throw error;
      if (!data) return;

      const professorEscolas = data
        .flatMap((item: ProfessorEscolaResponse) => item.escolas || [])
        .filter((escola): escola is Escola => escola !== null);
      setEscolas(professorEscolas);

    } catch (err) {
      console.error("Erro ao buscar dados iniciais:", JSON.stringify(err, null, 2));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // --- 2. Busca as turmas quando uma escola é selecionada (LÓGICA CORRIGIDA) ---
  useEffect(() => {
    const fetchTurmasDaEscola = async () => {
      if (!selectedEscola) {
        setTurmas([]);
        setSelectedTurmaId('');
        return;
      }
      setIsTurmasLoading(true);
      setSelectedTurmaId('');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // **Passo 2.1: Encontrar as disciplinas do professor nesta escola**
        const { data: disciplinasData, error: disciplinasError } = await supabase
          .from('disciplinas')
          .select('id, professores_disciplinas!inner(professor_id)')
          .eq('escola_id', selectedEscola)
          .eq('professores_disciplinas.professor_id', user.id);

        if (disciplinasError) throw disciplinasError;
        const disciplinaIds = disciplinasData.map(d => d.id);

        if (disciplinaIds.length === 0) {
          setTurmas([]);
          return;
        }

        // **Passo 2.2: Encontrar as turmas associadas a essas disciplinas**
        const { data: turmasData, error: turmasError } = await supabase
          .from('turmas')
          .select('id, nome, disciplinas_turmas!inner(disciplina_id)')
          .in('disciplinas_turmas.disciplina_id', disciplinaIds)
          .order('nome', { ascending: true });
        
        if (turmasError) throw turmasError;
        
        setTurmas(turmasData || []);

      } catch (err) {
        console.error("Erro ao buscar turmas da escola:", JSON.stringify(err, null, 2));
      } finally {
        setIsTurmasLoading(false);
      }
    };
    fetchTurmasDaEscola();
  }, [selectedEscola]);

  // --- 3. Fetcher do SWR para a fila de músicas ---
  const fetchQueue = async ([, turmaId]: [string, string]): Promise<JukeboxQueueItem[]> => {
    if (!turmaId) return [];
    const { data, error } = await supabase
      .from('jukebox_queue')
      .select(`id, song_title, youtube_url, status, profiles ( nome )`)
      .eq('turma_id', turmaId)
      .in('status', ['playing', 'queued'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    const typedData = data as JukeboxQueueResponse[];
    return (typedData ?? []).map(item => ({ 
      ...item, 
      profiles: Array.isArray(item.profiles) ? item.profiles[0] ?? null : item.profiles 
    }));
  };

  const { data: songs, mutate, isLoading: isLoadingQueue } = useSWR<JukeboxQueueItem[]>(
    ['jukebox_queue', selectedTurmaId], 
    fetchQueue, 
    { refreshInterval: 1000 }
  );

  // --- Efeitos e Handlers (sem alterações) ---
  useEffect(() => {
    if (!songs) { setCurrentSong(null); return; }
    const playingSong = songs.find(s => s.status === 'playing');
    const queuedSong = songs.find(s => s.status === 'queued');
    const nowPlaying = playingSong ?? queuedSong ?? null;
    setCurrentSong(prev => {
      if (prev?.id !== nowPlaying?.id) {
        setIsPlaying(false);
        setHasInteracted(false);
        return nowPlaying;
      }
      return prev;
    });
  }, [songs]);

  const handlePlayNext = async () => {
    if (!currentSong || !songs) return;
    const nextSong = songs.find(s => s.id !== currentSong.id && s.status === 'queued');
    try {
      if (nextSong) {
        await Promise.all([
          supabase.from('jukebox_queue').update({ status: 'played' }).eq('id', currentSong.id),
          supabase.from('jukebox_queue').update({ status: 'playing' }).eq('id', nextSong.id),
        ]);
      } else {
        await supabase.from('jukebox_queue').update({ status: 'played' }).eq('id', currentSong.id);
      }
      mutate();
    } catch (error) { console.error("Erro ao tocar a próxima música:", error); }
  };

  const handleRemoveFromQueue = async (songId: number) => {
    if (!window.confirm('Tem certeza que deseja remover esta música da fila?')) return;
    await supabase.from('jukebox_queue').delete().eq('id', songId);
    mutate();
  };

  const getUserNome = (item: JukeboxQueueItem) => item.profiles?.nome ?? 'Desconhecido';
  const queue = songs?.filter(s => s.status === 'queued') ?? [];

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Jukebox Colaborativa</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <School className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedEscola}
              onChange={(e) => setSelectedEscola(e.target.value)}
              disabled={isLoading}
              className="w-full sm:w-auto appearance-none rounded-lg border p-2 pl-10 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="">Selecione a escola</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="relative">
            <ListMusic className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedTurmaId}
              onChange={(e) => setSelectedTurmaId(e.target.value)}
              disabled={!selectedEscola || isTurmasLoading}
              className="w-full sm:w-auto appearance-none rounded-lg border p-2 pl-10 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="">
                {isTurmasLoading ? "A carregar..." : "Selecione a turma"}
              </option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
        </div>
      </div>
      
      {selectedTurmaId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ... O resto do seu JSX (Player e Fila) continua aqui, sem alterações ... */}
          <div className="lg:col-span-2">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-2xl bg-black">
              {isLoadingQueue ? (
                 <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-white" size={48} /></div>
              ) : currentSong && hasInteracted ? (
                <ReactPlayer
                  url={currentSong.youtube_url}
                  width="100%"
                  height="100%"
                  playing={isPlaying}
                  controls
                  onEnded={handlePlayNext}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                  {currentSong ? (
                    <button
                      onClick={() => { setHasInteracted(true); setIsPlaying(true); }}
                      className="flex items-center gap-3 rounded-full bg-blue-600 px-8 py-4 font-bold text-lg transition hover:scale-105"
                    >
                      <PlayCircle size={32} /> Iniciar Jukebox
                    </button>
                  ) : (
                    <div className="text-center"><Music size={48} /><p className="mt-4">A fila está vazia.</p></div>
                  )}
                </div>
              )}
            </div>
            {currentSong && (
              <div className="mt-4 p-4 rounded-lg bg-white dark:bg-gray-800">
                <p className="text-sm text-gray-500">Tocando agora:</p>
                <h2 className="text-2xl font-bold mt-1">{currentSong.song_title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Adicionado por: {getUserNome(currentSong)}</p>
                <button
                  onClick={handlePlayNext}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <SkipForward size={16} /> Próxima Música
                </button>
              </div>
            )}
          </div>
          <div className="lg:col-span-1">
            <div className="rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <ListMusic />
                <h3 className="text-xl font-bold">Próximas na Fila ({queue.length})</h3>
              </div>
              {queue.length > 0 ? (
                <ul className="space-y-3">
                  {queue.map((item, index) => (
                    <li key={item.id} className="flex items-center gap-3 p-2 rounded-md">
                      <span className="font-bold text-gray-400">{index + 1}</span>
                      <div className="flex-grow">
                        <p className="font-semibold text-sm">{item.song_title}</p>
                        <p className="text-xs text-gray-500">Por: {getUserNome(item)}</p>
                      </div>
                      <button onClick={() => handleRemoveFromQueue(item.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">A fila está vazia.</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">
          <p>Por favor, selecione uma escola e uma turma para ver a Jukebox.</p>
        </div>
      )}
    </div>
  );
}