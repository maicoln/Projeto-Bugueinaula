'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import AdvancedEditor from '@/components/AdvancedEditor';

// --- Tipos ---
type DisciplinaInfo = { id: number; nome: string; };

// <<< CORREÇÃO 1: 'disciplinas' agora é um array para corresponder aos dados do Supabase >>>
type DisciplinaJoinResult = {
    disciplinas: DisciplinaInfo[] | null;
};

// --- Fetcher para o SWR ---
const fetcherDisciplinasDoAluno = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');

    const { data: profile } = await supabase.from('profiles').select('turma_id').eq('id', user.id).single();
    if (!profile?.turma_id) throw new Error('Turma do aluno não encontrada');

    const { data: disciplinasData } = await supabase
        .from('disciplinas_turmas')
        .select('disciplinas(id, nome)')
        .eq('turma_id', profile.turma_id);

    // <<< CORREÇÃO 2: Usar 'flatMap' para achatar o array de arrays >>>
    const disciplinas = (disciplinasData as DisciplinaJoinResult[])
        ?.flatMap(d => d.disciplinas || [])
        .filter(Boolean) as DisciplinaInfo[] || [];
    
    return {
        disciplinas,
        turma_id: profile.turma_id
    };
};

export default function NovaDuvidaPage() {
    const router = useRouter();

    const [titulo, setTitulo] = useState('');
    const [corpo, setCorpo] = useState('');
    const [disciplinaId, setDisciplinaId] = useState<string | null>(null);
    const [semana, setSemana] = useState('');
    const [isGeral, setIsGeral] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const { data, error, isLoading } = useSWR('disciplinasDoAluno', fetcherDisciplinasDoAluno);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!corpo.trim() || !titulo.trim()) {
            setMessage({ type: 'error', text: 'O título e o corpo da dúvida são obrigatórios.' });
            return;
        }
        setIsSubmitting(true);
        setMessage({ type: '', text: '' });

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !data?.turma_id) {
            setMessage({ type: 'error', text: 'Erro de autenticação. Por favor, faça login novamente.' });
            setIsSubmitting(false);
            return;
        }

        try {
            const { data: novaDuvida, error: insertError } = await supabase
                .from('duvidas')
                .insert({
                    titulo,
                    corpo,
                    aluno_id: user.id,
                    turma_id: data.turma_id,
                    disciplina_id: isGeral || !disciplinaId ? null : Number(disciplinaId),
                    semana: isGeral || !semana ? null : Number(semana),
                })
                .select()
                .single();

            if (insertError) throw insertError;
            
            setMessage({ type: 'success', text: 'Dúvida enviada com sucesso!' });
            router.push(`/duvidas/${novaDuvida.id}`);
        } catch (err) {
            const error = err as Error;
            setMessage({ type: 'error', text: `Erro ao enviar a dúvida: ${error.message}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 animate-fade-in">
            <div className="mb-8">
                <Link href="/duvidas" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    <ArrowLeft size={16} />
                    Voltar para a Central de Dúvidas
                </Link>
                <h1 className="mt-2 text-4xl font-bold tracking-tight">Faça uma Pergunta</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Descreva a sua dúvida para que o professor ou os seus colegas possam ajudar.</p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
                <div className="space-y-2">
                    <label htmlFor="titulo" className="font-medium">Título da Dúvida</label>
                    <input id="titulo" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required placeholder="Ex: Como funciona o loop 'for' em JavaScript?" className="w-full rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800" />
                </div>

                <div className="space-y-2">
                    <label className="font-medium">Sua Dúvida</label>
                    <AdvancedEditor content={corpo} onChange={setCorpo} placeholder="Detalhe aqui a sua pergunta. Se for sobre um código, pode usar a formatação de código!" />
                </div>

                <div className="rounded-lg border p-4 dark:border-gray-700">
                    <div className="flex items-center">
                        <input id="isGeral" type="checkbox" checked={isGeral} onChange={(e) => setIsGeral(e.target.checked)} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" />
                        <label htmlFor="isGeral" className="ml-3 block text-sm font-medium">Marcar como Dúvida Geral</label>
                    </div>
                </div>

                {!isGeral && (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="disciplinaId" className="font-medium">Disciplina (Opcional)</label>
                            <select id="disciplinaId" value={disciplinaId ?? ''} onChange={(e) => setDisciplinaId(e.target.value)} disabled={isLoading || error} className="w-full appearance-none rounded-lg border p-3 shadow-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
                                <option value="">{isLoading ? 'A carregar...' : 'Selecione uma disciplina'}</option>
                                {data?.disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="semana" className="font-medium">Semana (Opcional)</label>
                            <input id="semana" type="number" value={semana} onChange={(e) => setSemana(e.target.value)} min="1" placeholder="Ex: 5" className="w-full rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800" />
                        </div>
                    </div>
                )}
                
                {message.text && (
                    <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</div>
                )}

                <div className="flex justify-end">
                    <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                        {isSubmitting ? 'A Enviar...' : 'Enviar Dúvida'}
                    </button>
                </div>
            </form>
        </div>
    );
}