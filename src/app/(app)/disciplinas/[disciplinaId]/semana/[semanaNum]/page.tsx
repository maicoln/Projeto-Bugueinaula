// Ficheiro: src/app/(app)/disciplinas/[disciplinaId]/semana/[semanaNum]/page.tsx
'use client';

// <<< CORREÇÃO 1: 'Fragment' removido da importação >>>
import { useState, useEffect, use, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FileText, Lightbulb, ClipboardCheck, ArrowLeft, Send, Upload, Paperclip, X, PenTool } from 'lucide-react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import DOMPurify from 'dompurify';

// --- Tipos e Componentes ---
type Conteudo = { 
  id: number; 
  tipo: 'MATERIAL_AULA' | 'EXEMPLO' | 'EXERCICIO' | 'REGISTRO'; 
  titulo: string; 
  descricao: string | null 
};
type Submissao = { 
  id: number; 
  aluno_id: string;
  conteudo_id: number;
  resposta_texto: string | null; 
  arquivo_url: string | null; 
  arquivo_nome: string | null; 
  updated_at?: string;
  nota?: number | null;
  feedback_texto?: string | null;
};

function ConteudoIcon({ tipo }: { tipo: Conteudo['tipo'] }) {
  const iconMap = {
    MATERIAL_AULA: <FileText className="h-5 w-5 flex-shrink-0 text-blue-500" />,
    EXEMPLO: <Lightbulb className="h-5 w-5 flex-shrink-0 text-yellow-500" />,
    EXERCICIO: <ClipboardCheck className="h-5 w-5 flex-shrink-0 text-green-500" />,
    REGISTRO: <PenTool className="h-5 w-5 flex-shrink-0 text-purple-500" />,
  };
  return <span className="mt-1">{iconMap[tipo]}</span>;
}

// --- Componente do Formulário de Submissão ---
function FormularioSubmissao({ conteudoId, user }: { conteudoId: number; user: User }) {
  const [resposta, setResposta] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submissaoAnterior, setSubmissaoAnterior] = useState<Submissao | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchSubmissao() {
      const { data } = await supabase
        .from('atividades_submissoes').select('*').eq('aluno_id', user.id).eq('conteudo_id', conteudoId).single();
      if (data) {
        setSubmissaoAnterior(data);
        setResposta(data.resposta_texto || '');
      }
      setLoading(false);
    }
    fetchSubmissao();
  }, [conteudoId, user.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleEnviar = async () => {
    setSubmitting(true);
    setMessage('');
    try {
        const submissionData: Partial<Omit<Submissao, 'id'>> = {
            aluno_id: user.id,
            conteudo_id: conteudoId,
            resposta_texto: resposta,
            updated_at: new Date().toISOString(),
        };
        if (file) {
            if (submissaoAnterior?.arquivo_url) {
                await supabase.storage.from('submissoes_atividades').remove([submissaoAnterior.arquivo_url]);
            }
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${conteudoId}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('submissoes_atividades').upload(filePath, file);
            if (uploadError) throw uploadError;
            submissionData.arquivo_url = filePath;
            submissionData.arquivo_nome = file.name;
        }
        const { data: newSubmission, error } = await supabase
            .from('atividades_submissoes')
            .upsert(submissionData, { onConflict: 'aluno_id,conteudo_id' })
            .select()
            .single();
        if (error) throw error;
        setMessage('Resposta enviada com sucesso!');
        setSubmissaoAnterior(newSubmission);
        setFile(null);
    // <<< CORREÇÃO 2: Tratamento de erro sem usar 'any' >>>
    } catch(err) {
        const error = err as Error;
        setMessage(`Erro: ${error.message}`);
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">A carregar dados da sua submissão...</p>;

  return (
    <div className="mt-4 space-y-4">
      {submissaoAnterior && submissaoAnterior.nota !== null && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/30">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300">Avaliação do Professor</h4>
              <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Nota: {submissaoAnterior.nota?.toLocaleString('pt-BR')}
              </p>
              {submissaoAnterior.feedback_texto && (
                  <div className="mt-2">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Comentários:</p>
                      <p className="mt-1 whitespace-pre-wrap rounded-md bg-white/50 p-2 text-sm text-gray-700 dark:bg-black/20 dark:text-gray-300">
                          {submissaoAnterior.feedback_texto}
                      </p>
                  </div>
              )}
          </div>
      )}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <div>
            <label htmlFor={`resposta-${conteudoId}`} className="text-sm font-semibold">
                {submissaoAnterior ? 'A sua resposta (pode editá-la e reenviá-la):' : 'Digite a sua resposta:'}
            </label>
            <textarea id={`resposta-${conteudoId}`} value={resposta} onChange={(e) => setResposta(e.target.value)} rows={4} placeholder="Escreva a sua resposta aqui..." className="mt-1 w-full rounded-md border p-2 shadow-sm dark:border-gray-600 dark:bg-gray-700"/>
        </div>
        <div>
            <label className="text-sm font-semibold">Anexar ficheiro (opcional)</label>
            <div className="mt-1 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 dark:border-gray-600">
                <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4 flex text-sm leading-6 text-gray-600">
                        <label htmlFor={`file-upload-${conteudoId}`} className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                            <span>Carregue um ficheiro</span>
                            <input id={`file-upload-${conteudoId}`} name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                        </label>
                        <p className="pl-1">ou arraste e solte</p>
                    </div>
                </div>
            </div>
        </div>
        {(file || submissaoAnterior?.arquivo_nome) && (
            <div className="flex items-center justify-between rounded-md bg-gray-200 p-2 text-sm dark:bg-gray-700">
                <div className="flex items-center gap-2"><Paperclip size={16} /><span className="font-medium">{file?.name || submissaoAnterior?.arquivo_nome}</span>{file && <span className="text-xs text-blue-600">(novo)</span>}</div>
                {file && (<button onClick={() => setFile(null)} className="p-1 text-red-500 hover:text-red-700"><X size={16} /></button>)}
            </div>
        )}
        <div className="flex items-center justify-end gap-4">
            {message && <p className="text-sm text-green-500">{message}</p>}
            <button onClick={handleEnviar} disabled={submitting || (!resposta.trim() && !file)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                <Send size={16} />
                {submitting ? 'A enviar...' : (submissaoAnterior ? 'Reenviar' : 'Enviar')}
            </button>
        </div>
      </div>
    </div>
  );
}

const tabOrder: Conteudo['tipo'][] = ['MATERIAL_AULA', 'EXEMPLO', 'REGISTRO', 'EXERCICIO'];

export default function PaginaConteudoSemana({ params }: { params: Promise<{ disciplinaId: string; semanaNum: string }> }) {
  const { disciplinaId, semanaNum } = use(params);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [disciplinaNome, setDisciplinaNome] = useState('');
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Conteudo['tipo'] | ''>('');

  const fetchConteudo = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { router.push('/login'); return; }
    setUser(currentUser);
    const { data: disciplina } = await supabase.from('disciplinas').select('nome').eq('id', disciplinaId).single();
    if (disciplina) setDisciplinaNome(disciplina.nome);
    const { data: conteudosData } = await supabase.from('conteudos').select('*').eq('disciplina_id', disciplinaId).eq('semana', semanaNum).order('id');
    if (conteudosData) {
      setConteudos(conteudosData);
      const firstAvailableTab = tabOrder.find(tab => conteudosData.some(c => c.tipo === tab));
      setActiveTab(firstAvailableTab || '');
    }
    setLoading(false);
  }, [disciplinaId, semanaNum, router]);

  useEffect(() => {
    fetchConteudo();
  }, [fetchConteudo]);

  const conteudosAgrupados = useMemo(() => {
    const grupos: Record<string, Conteudo[]> = {};
    conteudos.forEach(c => {
      if (!grupos[c.tipo]) grupos[c.tipo] = [];
      grupos[c.tipo].push(c);
    });
    return grupos;
  }, [conteudos]);

  if (loading) return <div className="text-center">A carregar conteúdo da semana...</div>;

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{disciplinaNome}</h1>
          <p className="mt-1 text-lg text-gray-500 dark:text-gray-400">Semana {semanaNum}</p>
        </div>
        <Link href={`/disciplinas/${disciplinaId}`} className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
          <ArrowLeft size={18} />
          Voltar
        </Link>
      </div>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tipos de Conteúdo">
          {tabOrder.map(tipo => (
            conteudosAgrupados[tipo] && (
              <button key={tipo} onClick={() => setActiveTab(tipo)} className={`${activeTab === tipo ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'} whitespace-nowrap border-b-2 px-1 py-3 text-base font-semibold transition`}>
                {tipo.replace('_', ' ')} ({conteudosAgrupados[tipo].length})
              </button>
            )
          ))}
        </nav>
      </div>
      <div className="mt-6 space-y-6">
        {conteudos.length > 0 ? (
          activeTab && conteudosAgrupados[activeTab]?.map(conteudo => (
            <div key={conteudo.id} className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-start gap-4">
                <ConteudoIcon tipo={conteudo.tipo} />
                <div>
                  <h4 className="font-semibold">{conteudo.titulo}</h4>
                  {conteudo.descricao && (
                    <div className="prose prose-sm dark:prose-invert mt-1 max-w-none text-gray-600 dark:text-gray-400"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(conteudo.descricao) }}
                    />
                  )}
                </div>
              </div>
              {conteudo.tipo === 'EXERCICIO' && user && (
                  <div className="mt-4 border-t pt-4 dark:border-gray-600">
                     <FormularioSubmissao conteudoId={conteudo.id} user={user} />
                  </div>
              )}
            </div>
          ))
        ) : (<p>Nenhum conteúdo encontrado para esta semana.</p>)}
      </div>
    </div>
  );
}