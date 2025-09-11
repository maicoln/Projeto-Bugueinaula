// Ficheiro: src/components/RichTextEditor.tsx (VERSÃO CORRIGIDA)
'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';
import React from 'react';

// Barra de ferramentas para o editor
const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 rounded-t-lg border border-gray-300 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`rounded p-2 transition-colors ${editor.isActive('bold') ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        aria-label="Negrito"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`rounded p-2 transition-colors ${editor.isActive('italic') ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        aria-label="Itálico"
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`rounded p-2 transition-colors ${editor.isActive('bulletList') ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        aria-label="Lista com marcadores"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`rounded p-2 transition-colors ${editor.isActive('orderedList') ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        aria-label="Lista numerada"
      >
        <ListOrdered size={16} />
      </button>
    </div>
  );
};


// Componente principal do Editor
interface RichTextEditorProps {
    content: string;
    onChange: (richText: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    // <<< CORREÇÃO: Adicionada esta linha >>>
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
        attributes: {
            class: 'prose prose-sm dark:prose-invert min-h-[150px] max-w-none rounded-b-lg border border-t-0 border-gray-300 p-4 focus:outline-none dark:border-gray-600',
        },
    },
  });

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}