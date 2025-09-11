'use client';

// <<< CORREÇÃO: 'useCallback' removido pois não era utilizado >>>
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { PlusCircle, Book, Calendar, List, Type, FileText, School } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';

type Escola = {
  id: number;
  nome: string;
};

type Disciplina = {
  id: number;
  nome: string;
};

// <<< CORREÇÃO: Tipo explícito para o item retornado pela query de escolas >>>
type ProfessoresEscolasJoin = {
  escolas: Escola[] | null;
};


export default function CadastrarConteudoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isProfessor, setIsProfessor] = useState(false);
  
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [selectedEscola, setSelectedEscola] = useState('');
  
  const [formState, setFormState] = useState({
    disciplina_id: '',
    bimestre: '1',
    semana: '',
    tipo: 'MATERIAL_AULA',
    titulo: '',
    descricao: ''
  });
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase.from('profiles').select('tipo_usuario').eq('id', user.id).single();
        if (profile?.tipo_usuario !== 'PROFESSOR') {
          router.push('/');
          return;
        }
        setIsProfessor(true);

        const { data: escolasData, error: escolasError } = await supabase
          .from('professores_escolas')
          .select(`escolas (id, nome)`)
          .eq('professor_id', user.id);

        if (escolasError) throw escolasError;

        if (escolasData) {
          // <<< CORREÇÃO: Revertido para 'flatMap' para achatar o array de arrays corretamente >>>
          const escolasDoProfessor = escolasData
            .flatMap((item: ProfessoresEscolasJoin) => item.escolas || [])
            .filter((escola): escola is Escola => escola !== null);
          setEscolas(escolasDoProfessor);
        }
      } catch (error) {
        console.error("Erro ao buscar dados iniciais:", error);
        setFormMessage({ type: 'error', text: 'Não foi possível carregar os dados da página.' });
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
        setFormState(prev => ({ ...prev, disciplina_id: '' }));
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: disciplinasData, error } = await supabase
        .from('disciplinas')
        .select(`id, nome, professores_disciplinas!inner(professor_id)`)
        .eq('escola_id', selectedEscola)
        .eq('professores_disciplinas.professor_id', user.id);
      
      if (error) {
        console.error("Erro ao buscar disciplinas:", error);
        setFormMessage({ type: 'error', text: 'Não foi possível carregar as disciplinas.' });
        return;
      }
      
      if (disciplinasData) {
        setDisciplinas(disciplinasData as Disciplina[]);
      }
    }
    fetchDisciplinas();
  }, [selectedEscola]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };
  
  const handleDescriptionChange = (newContent: string) => {
    setFormState(prevState => ({ ...prevState, descricao: newContent }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage({ type: '', text: '' });

    try {
        const { error } = await supabase.from('conteudos').insert({
            ...formState,
            bimestre: parseInt(formState.bimestre),
            semana: parseInt(formState.semana),
        });

        if (error) throw error;

        setFormMessage({ type: 'success', text: 'Conteúdo cadastrado com sucesso!' });
        setFormState(prevState => ({
            ...prevState,
            semana: '',
            titulo: '',
            descricao: '',
            tipo: 'MATERIAL_AULA'
        }));
    } catch (err) {
        // <<< CORREÇÃO: Tratamento de erro sem 'any' >>>
        const error = err as Error;
        setFormMessage({ type: 'error', text: `Erro ao cadastrar: ${error.message}` });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">A verificar permissões...</div>;
  }
  if (!isProfessor) {
    return <div className="p-6 text-center text-red-500">Acesso negado.</div>;
  }

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cadastrar Novo Conteúdo</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Preencha o formulário para adicionar um novo material de aula.
        </p>
      </div>

      <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="escola" className="font-medium">Escola</label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select name="escola" id="escola" value={selectedEscola} onChange={(e) => setSelectedEscola(e.target.value)} required className="w-full appearance-none rounded-lg border p-3 pl-10 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                  <option value="">Selecione a escola</option>
                  {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="disciplina_id" className="font-medium">Disciplina</label>
              <div className="relative">
                <Book className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select name="disciplina_id" id="disciplina_id" value={formState.disciplina_id} onChange={handleChange} required disabled={!selectedEscola} className="w-full appearance-none rounded-lg border p-3 pl-10 shadow-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
                  <option value="">Selecione a disciplina</option>
                  {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
            </div>
            
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="bimestre" className="font-medium">Bimestre</label>
               <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select name="bimestre" id="bimestre" value={formState.bimestre} onChange={handleChange} required className="w-full appearance-none rounded-lg border p-3 pl-10 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                  <option value="1">1º Bimestre</option>
                  <option value="2">2º Bimestre</option>
                  <option value="3">3º Bimestre</option>
                  <option value="4">4º Bimestre</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="semana" className="font-medium">Semana</label>
              <div className="relative">
                   <List className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="number" name="semana" id="semana" value={formState.semana} onChange={handleChange} required min="1" placeholder="Ex: 1" className="w-full rounded-lg border p-3 pl-10 shadow-sm dark:border-gray-600 dark:bg-gray-800" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="tipo" className="font-medium">Tipo de Conteúdo</label>
               <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select name="tipo" id="tipo" value={formState.tipo} onChange={handleChange} required className="w-full appearance-none rounded-lg border p-3 pl-10 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                  <option value="MATERIAL_AULA">Material de Aula</option>
                  <option value="EXEMPLO">Exemplo</option>
                  <option value="EXERCICIO">Exercício</option>
                  <option value="REGISTRO">Registro</option>
                </select>
              </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="titulo" className="font-medium">Título</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" name="titulo" id="titulo" value={formState.titulo} onChange={handleChange} required placeholder="Título do material" className="w-full rounded-lg border p-3 pl-10 shadow-sm dark:border-gray-600 dark:bg-gray-800" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="font-medium">Descrição</label>
            <RichTextEditor
              content={formState.descricao}
              onChange={handleDescriptionChange}
            />
          </div>

          {formMessage.text && (
            <div className={`p-3 rounded-md text-sm ${formMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
              {formMessage.text}
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50">
              <PlusCircle size={20} />
              {isSubmitting ? 'A guardar...' : 'Guardar Conteúdo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}