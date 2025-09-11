'use client';

// <<< 1. REMOÇÃO: 'useCallback' removido pois não era utilizado >>>
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { School, Book, Edit, Trash2, X } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';

// Tipos de dados
type Escola = { id: number; nome: string };
type Disciplina = { id: number; nome: string };
type Conteudo = {
  id: number;
  bimestre: number;
  semana: number;
  tipo: string;
  titulo: string;
  descricao: string | null;
};
// <<< MELHORIA: Tipo explícito para o item retornado pela query de escolas >>>
type ProfessoresEscolasJoin = {
  escolas: Escola[] | null;
};

export default function GerirConteudoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isProfessor, setIsProfessor] = useState(false);
  
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [selectedEscola, setSelectedEscola] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [conteudosLoading, setConteudosLoading] = useState(false);

  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Conteudo | null>(null);

  const [pageMessage, setPageMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profile } = await supabase.from('profiles').select('tipo_usuario').eq('id', user.id).single();
        if (profile?.tipo_usuario !== 'PROFESSOR') { router.push('/'); return; }
        
        setIsProfessor(true);

        const { data: escolasData, error: escolasError } = await supabase
          .from('professores_escolas')
          .select(`escolas (id, nome)`)
          .eq('professor_id', user.id);
        if (escolasError) throw escolasError;

        if (escolasData) {
          const escolasDoProfessor = escolasData
            .flatMap((item: ProfessoresEscolasJoin) => item.escolas || [])
            .filter((escola): escola is Escola => escola !== null);
          setEscolas(escolasDoProfessor);
        }
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, [router]);

  useEffect(() => {
    async function fetchDisciplinas() {
        if (!selectedEscola) {
            setDisciplinas([]);
            setSelectedDisciplina('');
            return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: disciplinasData } = await supabase
          .from('disciplinas')
          .select(`id, nome, professores_disciplinas!inner(professor_id)`)
          .eq('escola_id', selectedEscola)
          .eq('professores_disciplinas.professor_id', user.id);
        
        if (disciplinasData) setDisciplinas(disciplinasData as Disciplina[]);
    }
    fetchDisciplinas();
    // <<< 2. MELHORIA: Adicionadas dependências para satisfazer o linter >>>
  }, [selectedEscola, setDisciplinas, setSelectedDisciplina]);

  useEffect(() => {
    async function fetchConteudos() {
        if (!selectedDisciplina) {
            setConteudos([]);
            return;
        }
        setConteudosLoading(true);
        const { data } = await supabase.from('conteudos').select('*').eq('disciplina_id', selectedDisciplina).order('bimestre').order('semana');
        setConteudos(data || []);
        setConteudosLoading(false);
    }
    fetchConteudos();
    // <<< 2. MELHORIA: Adicionadas dependências para satisfazer o linter >>>
  }, [selectedDisciplina, setConteudos, setConteudosLoading]);

  const handleEditClick = (conteudo: Conteudo) => {
    setEditingContent(conteudo);
    setIsEditPanelOpen(true);
  };

  const handleDeleteClick = async (conteudoId: number) => {
    if (window.confirm('Tem a certeza que deseja apagar este conteúdo? Esta ação não pode ser desfeita.')) {
        const { error } = await supabase.from('conteudos').delete().eq('id', conteudoId);
        if (error) {
            setPageMessage({ type: 'error', text: `Erro ao apagar: ${error.message}` });
        } else {
            setConteudos(prev => prev.filter(c => c.id !== conteudoId));
            setPageMessage({ type: 'success', text: 'Conteúdo apagado com sucesso!' });
        }
        setTimeout(() => setPageMessage({ type: '', text: '' }), 5000);
    }
  };
  
  const handleEditorChange = (newContent: string) => {
    if (editingContent) {
      setEditingContent({ ...editingContent, descricao: newContent });
    }
  };
  
  const handleSaveChanges = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingContent) return;

    try {
      const { error } = await supabase
        .from('conteudos')
        .update({ 
          titulo: editingContent.titulo,
          descricao: editingContent.descricao,
          tipo: editingContent.tipo
        })
        .eq('id', editingContent.id);
      
      if (error) throw error;
      
      setConteudos(prev => prev.map(c => c.id === editingContent.id ? editingContent : c));
      setIsEditPanelOpen(false);
      setEditingContent(null);
      setPageMessage({ type: 'success', text: 'Conteúdo atualizado com sucesso!' });
      setTimeout(() => setPageMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      // <<< 3. MELHORIA: 'alert' substituído por 'setPageMessage' para consistência >>>
      const error = err as Error;
      setPageMessage({ type: 'error', text: `Erro ao atualizar: ${error.message}` });
    }
  };

  if (loading) return <div className="text-center">A verificar permissões...</div>;
  if (!isProfessor) return null;

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gerir Conteúdo</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Selecione uma disciplina para ver, editar ou apagar o conteúdo.</p>
      </div>

      {pageMessage.text && (
        <div className={`mb-4 rounded-md p-4 text-sm ${pageMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
          {pageMessage.text}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
            <label htmlFor="escola" className="font-medium">Escola</label>
            <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select id="escola" value={selectedEscola} onChange={e => setSelectedEscola(e.target.value)} className="w-full appearance-none rounded-lg border p-3 pl-10 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <option value="">Selecione a escola</option>
                    {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
            </div>
        </div>
        <div className="flex flex-col gap-2">
            <label htmlFor="disciplina" className="font-medium">Disciplina</label>
            <div className="relative">
                <Book className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select id="disciplina" value={selectedDisciplina} onChange={e => setSelectedDisciplina(e.target.value)} disabled={!selectedEscola} className="w-full appearance-none rounded-lg border p-3 pl-10 shadow-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
                    <option value="">Selecione a disciplina</option>
                    {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
            </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        {conteudosLoading && <p>A carregar conteúdos...</p>}
        {!conteudosLoading && conteudos.length === 0 && selectedDisciplina && <p>Nenhum conteúdo encontrado para esta disciplina.</p>}
        {!conteudosLoading && !selectedDisciplina && <p>Por favor, selecione uma escola e uma disciplina para ver o conteúdo.</p>}
        <ul className="space-y-4">
            {conteudos.map(conteudo => (
                <li key={conteudo.id} className="flex items-center justify-between rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                    <div className="flex flex-col">
                        <span className="font-semibold">{conteudo.titulo}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{conteudo.bimestre}º Bimestre - Semana {conteudo.semana} ({conteudo.tipo.replace('_', ' ')})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleEditClick(conteudo)} className="p-2 text-blue-600 hover:text-blue-800"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteClick(conteudo.id)} className="p-2 text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                    </div>
                </li>
            ))}
        </ul>
      </div>

      {isEditPanelOpen && editingContent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
            <div className="flex h-full w-full max-w-lg flex-col bg-white p-6 dark:bg-gray-900 overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-4 dark:border-gray-700">
                    <h2 className="text-2xl font-bold">Editar Conteúdo</h2>
                    <button onClick={() => setIsEditPanelOpen(false)} className="p-2"><X size={24} /></button>
                </div>
                <form onSubmit={handleSaveChanges} className="mt-6 flex flex-1 flex-col justify-between">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="edit-titulo" className="font-medium">Título</label>
                            <input id="edit-titulo" type="text" value={editingContent.titulo} onChange={e => setEditingContent({...editingContent, titulo: e.target.value})} className="w-full rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="font-medium">Descrição</label>
                            <RichTextEditor
                              content={editingContent.descricao || ''}
                              onChange={handleEditorChange}
                            />
                        </div>
                         <div className="space-y-2">
                            <label htmlFor="edit-tipo" className="font-medium">Tipo</label>
                            <select id="edit-tipo" value={editingContent.tipo} onChange={e => setEditingContent({...editingContent, tipo: e.target.value})} className="w-full appearance-none rounded-lg border p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                                <option value="MATERIAL_AULA">Material de Aula</option>
                                <option value="EXEMPLO">Exemplo</option>
                                <option value="EXERCICIO">Exercício</option>
                                <option value="REGISTRO">Registro</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end mt-6">
                        <button type="submit" className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">Guardar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}