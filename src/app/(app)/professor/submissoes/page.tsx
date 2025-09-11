// Ficheiro: src/app/(app)/professor/submissoes/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { School, Book, FileText, Download, FileSpreadsheet } from 'lucide-react';

// Tipos de dados
type Escola = { id: number; nome: string };
type Disciplina = { id: number; nome: string };
type Conteudo = { id: number; titulo: string };
type ProfileRef = { id: string; nome: string };

// Em alguns esquemas o Supabase retorna a relação como objeto único,
// em outros como array (quando há ambiguidade de FK). Suportamos ambos.
type ProfileRelation = ProfileRef | ProfileRef[] | null;

type Submissao = {
  id: number;
  aluno_id: string;
  resposta_texto: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  created_at: string;
  profiles: ProfileRelation;
  nota: number | null;
  feedback_texto: string | null;
};

type ProfessoresEscolasJoin = {
  escolas: Escola[] | null;
};

// Helper para extrair o nome do aluno de forma segura (objeto ou array)
function getAlunoNome(rel: ProfileRelation): string {
  if (!rel) return 'Aluno desconhecido';
  if (Array.isArray(rel)) return rel[0]?.nome ?? 'Aluno desconhecido';
  return rel.nome ?? 'Aluno desconhecido';
}

export default function VerSubmissoesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isProfessor, setIsProfessor] = useState(false);

  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [selectedEscola, setSelectedEscola] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [selectedConteudo, setSelectedConteudo] = useState('');

  const [submissoes, setSubmissoes] = useState<Submissao[]>([]);
  const [submissoesLoading, setSubmissoesLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [pageMessage, setPageMessage] = useState({ type: '', text: '' });

  // Estado para edição por linha: nota como string (para preservar input parcial) e feedback
  const [edits, setEdits] = useState<Record<number, { nota: string; feedback: string; saving: boolean }>>({});

  // Busca inicial (professor e escolas)
  const fetchInitialData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('tipo_usuario').eq('id', user.id).single();
    if (profile?.tipo_usuario !== 'PROFESSOR') { router.push('/'); return; }
    setIsProfessor(true);

    const { data: escolasData } = await supabase
      .from('professores_escolas')
      .select(`escolas!inner(id, nome)`)
      .eq('professor_id', user.id);

    if (escolasData) {
      const escolasDoProfessor = escolasData
        .flatMap((item: ProfessoresEscolasJoin) => item.escolas || [])
        .filter((escola): escola is Escola => escola !== null);
      setEscolas(escolasDoProfessor);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // Disciplinas por escola e professor
  useEffect(() => {
    async function fetchDisciplinas() {
      if (!selectedEscola) {
        setDisciplinas([]); setConteudos([]); setSelectedDisciplina(''); setSelectedConteudo(''); return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: disciplinasData } = await supabase
        .from('disciplinas')
        .select(`id, nome, professores_disciplinas!inner(professor_id)`)
        .eq('escola_id', selectedEscola)
        .eq('professores_disciplinas.professor_id', user.id);

      if (disciplinasData) setDisciplinas(disciplinasData);
    }
    fetchDisciplinas();
  }, [selectedEscola]);

  // Conteúdos de exercício por disciplina
  useEffect(() => {
    async function fetchConteudosDeExercicio() {
      if (!selectedDisciplina) { setConteudos([]); setSelectedConteudo(''); return; }
      const { data } = await supabase
        .from('conteudos')
        .select('id, titulo')
        .eq('disciplina_id', selectedDisciplina)
        .eq('tipo', 'EXERCICIO');
      setConteudos(data || []);
    }
    fetchConteudosDeExercicio();
  }, [selectedDisciplina]);

  // Submissões por conteúdo
  useEffect(() => {
    async function fetchSubmissoes() {
      if (!selectedConteudo) { setSubmissoes([]); return; }
      setSubmissoesLoading(true);

      const { data, error } = await supabase
        .from('atividades_submissoes')
        .select(`
          id,
          aluno_id,
          resposta_texto,
          arquivo_url,
          arquivo_nome,
          created_at,
          nota,
          feedback_texto,
          profiles ( id, nome )
        `)
        .eq('conteudo_id', selectedConteudo)
        .order('created_at', { ascending: false })
        .returns<Submissao[]>(); // garante tipagem

      if (error) {
        console.error("Erro ao buscar submissões:", error);
        setPageMessage({ type: 'error', text: 'Não foi possível carregar as submissões.' });
      } else if (data) {
        setSubmissoes(data);
      }
      setSubmissoesLoading(false);
    }
    fetchSubmissoes();
  }, [selectedConteudo]);

  // Sempre que submissoes mudar, inicializamos o estado de edição (edits)
  useEffect(() => {
    const initial: Record<number, { nota: string; feedback: string; saving: boolean }> = {};
    submissoes.forEach(s => {
      initial[s.id] = {
        nota: s.nota !== null && s.nota !== undefined ? String(s.nota) : '',
        feedback: s.feedback_texto ?? '',
        saving: false
      };
    });
    setEdits(initial);
  }, [submissoes]);

  // Download de arquivo submetido
  const handleDownload = async (submissao: Submissao) => {
    if (!submissao.arquivo_url || !submissao.arquivo_nome) return;
    setDownloadingId(submissao.id);
    setPageMessage({ type: '', text: '' });
    try {
      const { data, error } = await supabase.storage.from('submissoes_atividades').createSignedUrl(submissao.arquivo_url, 60);
      if (error) throw error;
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.setAttribute('download', submissao.arquivo_nome);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const error = err as Error;
      console.error("Erro no download:", error);
      setPageMessage({ type: 'error', text: `Erro ao gerar link: ${error.message}` });
      setTimeout(() => setPageMessage({ type: '', text: '' }), 5000);
    } finally {
      setDownloadingId(null);
    }
  };

  // Salvar nota e feedback por linha (botão Salvar)
  const handleSalvarLinha = async (id: number) => {
    const edit = edits[id];
    if (!edit) return;

    // marca como salvando
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], saving: true } }));
    setPageMessage({ type: '', text: '' });

    // converte nota string -> number | null (aceita vírgula como separador)
    const notaTrim = edit.nota.trim();
    let notaValue: number | null = null;
    if (notaTrim !== '') {
      // substituir vírgula por ponto para parseFloat
      const parsed = parseFloat(notaTrim.replace(',', '.'));
      if (!Number.isNaN(parsed)) notaValue = parsed;
      else {
        setPageMessage({ type: 'error', text: 'Formato de nota inválido.' });
        setEdits(prev => ({ ...prev, [id]: { ...prev[id], saving: false } }));
        setTimeout(() => setPageMessage({ type: '', text: '' }), 4000);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('atividades_submissoes')
        .update({ nota: notaValue, feedback_texto: edit.feedback || null })
        .eq('id', id);

      if (error) throw error;

      // atualiza o estado local de submissões para refletir o que foi salvo
      setSubmissoes(prev => prev.map(s => s.id === id ? { ...s, nota: notaValue, feedback_texto: edit.feedback || null } : s));

      setPageMessage({ type: 'success', text: 'Nota e feedback salvos com sucesso.' });
      setEdits(prev => ({ ...prev, [id]: { ...prev[id], saving: false } }));
      setTimeout(() => setPageMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      const error = err as Error;
      console.error("Erro ao salvar nota/feedback:", error);
      setPageMessage({ type: 'error', text: `Erro ao salvar: ${error.message}` });
      setEdits(prev => ({ ...prev, [id]: { ...prev[id], saving: false } }));
      setTimeout(() => setPageMessage({ type: '', text: '' }), 6000);
    }
  };

  // Relatório CSV (quem enviou / não enviou) com Nota e Feedback incluídos
  const handleGerarRelatorio = async () => {
    if (!selectedDisciplina || !selectedConteudo) return;
    setIsGeneratingReport(true);
    setPageMessage({ type: '', text: '' });

    try {
      // Turmas ligadas à disciplina
      const { data: turmasDaDisciplina, error: turmasError } = await supabase
        .from('disciplinas_turmas')
        .select('turma_id')
        .eq('disciplina_id', selectedDisciplina);
      if (turmasError) throw turmasError;

      const turmaIds = (turmasDaDisciplina || []).map(t => t.turma_id);
      if (turmaIds.length === 0) throw new Error('Nenhuma turma encontrada para a disciplina.');

      // Alunos das turmas
      const { data: todosAlunos, error: alunosError } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('turma_id', turmaIds)
        .eq('tipo_usuario', 'ALUNO')
        .order('nome', { ascending: true });
      if (alunosError) throw alunosError;
      if (!todosAlunos) throw new Error('Nenhum aluno encontrado para as turmas da disciplina.');

      // Mapa de quem enviou
      const alunosQueEnviaram = new Map(submissoes.map(s => [s.aluno_id, s]));

      const linhas = todosAlunos.map(aluno => {
        const submissao = alunosQueEnviaram.get(aluno.id);
        const status = submissao ? 'Enviou' : 'Não Enviou';
        const dataEnvio = submissao ? new Date(submissao.created_at).toLocaleString('pt-BR') : '';
        const nota = submissao?.nota ?? '';
        const feedback = submissao?.feedback_texto ?? '';
        return { nome: aluno.nome, status, dataEnvio, nota, feedback };
      });

      // CSV
      const headers = ['Aluno', 'Status da Entrega', 'Data de Envio', 'Nota', 'Feedback'];
      const csvContent = [
        headers.join(','),
        ...linhas.map(row =>
          `"${row.nome}","${row.status}","${row.dataEnvio}","${row.nota}","${row.feedback.replace(/"/g, '""')}"`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const nomeExercicio = conteudos.find(c => String(c.id) === String(selectedConteudo))?.titulo || 'Exercicio';
      link.setAttribute('download', `Relatorio_${nomeExercicio.replace(/ /g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const error = err as Error;
      console.error("Erro ao gerar relatório:", error);
      setPageMessage({ type: 'error', text: `Erro ao gerar relatório: ${error.message}` });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (loading) return <div className="text-center">A verificar permissões...</div>;
  if (!isProfessor) return null;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Ver Submissões</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Filtre por escola, disciplina e exercício para ver as respostas dos alunos.</p>
      </div>

      {pageMessage.text && (
        <div className={`mb-4 rounded-md p-4 text-sm ${pageMessage.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {pageMessage.text}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative">
          <School className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select value={selectedEscola} onChange={e => setSelectedEscola(e.target.value)} className="w-full appearance-none rounded-lg border p-3 pl-10 dark:border-gray-600 dark:bg-gray-800">
            <option value="">Selecione a escola</option>
            {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div className="relative">
          <Book className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select value={selectedDisciplina} onChange={e => setSelectedDisciplina(e.target.value)} disabled={!selectedEscola} className="w-full appearance-none rounded-lg border p-3 pl-10 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
            <option value="">Selecione a disciplina</option>
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select value={selectedConteudo} onChange={e => setSelectedConteudo(e.target.value)} disabled={!selectedDisciplina} className="w-full appearance-none rounded-lg border p-3 pl-10 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
            <option value="">Selecione o exercício</option>
            {conteudos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
        </div>
      </div>

      {/* Botão Relatório */}
      <div className="mb-8 flex justify-end">
        <button
          onClick={handleGerarRelatorio}
          disabled={!selectedConteudo || isGeneratingReport}
          className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileSpreadsheet size={16} />
          {isGeneratingReport ? 'A gerar...' : 'Gerar Relatório (CSV)'}
        </button>
      </div>

      {/* Tabela de submissões */}
      <div className="overflow-hidden rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-900">
        {submissoesLoading ? (
          <p className="p-6 text-center">A carregar submissões...</p>
        ) : !selectedConteudo ? (
          <p className="p-6 text-center text-gray-500">Selecione um exercício para ver as submissões.</p>
        ) : submissoes.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Nenhuma submissão encontrada para este exercício.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Aluno</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Data de Envio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Resposta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Arquivo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nota</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Feedback</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                {submissoes.map(submissao => (
                  <tr key={submissao.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {getAlunoNome(submissao.profiles)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(submissao.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {submissao.resposta_texto ? (
                        <details>
                          <summary className="cursor-pointer">Ver resposta</summary>
                          <p className="mt-2 whitespace-pre-wrap rounded bg-gray-100 p-2 dark:bg-gray-700">
                            {submissao.resposta_texto}
                          </p>
                        </details>
                      ) : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {submissao.arquivo_url ? (
                        <button
                          onClick={() => handleDownload(submissao)}
                          disabled={downloadingId === submissao.id}
                          className="flex items-center gap-2 font-medium text-blue-600 hover:underline disabled:cursor-wait disabled:text-gray-400"
                        >
                          <Download size={16} />
                          {downloadingId === submissao.id ? 'A gerar...' : (submissao.arquivo_nome || 'Descarregar')}
                        </button>
                      ) : 'Nenhum'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={edits[submissao.id]?.nota ?? ''}
                        onChange={(e) => setEdits(prev => ({ ...prev, [submissao.id]: { ...(prev[submissao.id] ?? { nota: '', feedback: '', saving: false }), nota: e.target.value } }))}
                        className="w-20 rounded border p-1 dark:border-gray-600 dark:bg-gray-800"
                        placeholder="e.g. 8.5"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <textarea
                        value={edits[submissao.id]?.feedback ?? ''}
                        onChange={(e) => setEdits(prev => ({ ...prev, [submissao.id]: { ...(prev[submissao.id] ?? { nota: '', feedback: '', saving: false }), feedback: e.target.value } }))}
                        className="w-56 rounded border p-1 dark:border-gray-600 dark:bg-gray-800"
                        rows={2}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleSalvarLinha(submissao.id)}
                        disabled={edits[submissao.id]?.saving}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {edits[submissao.id]?.saving ? 'A guardar...' : 'Salvar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
