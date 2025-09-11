// Ficheiro: src/app/(app)/disciplinas/[disciplinaId]/page.tsx (NOVA VERSÃO SIMPLIFICADA)
'use client'; // <-- Transformamos a página em um Componente de Cliente

import DisciplinaClientPage from './disciplina-client';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';

export default function DisciplinaPage() {
  const params = useParams();
  const disciplinaId = params.disciplinaId as string;

  // Se o ID não for um número válido, podemos mostrar a página 404
  if (isNaN(parseInt(disciplinaId))) {
    return notFound();
  }

  // Renderiza o componente de cliente, passando o ID da disciplina
  return <DisciplinaClientPage disciplinaId={disciplinaId} />;
}