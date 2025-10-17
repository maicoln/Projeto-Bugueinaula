// Ficheiro: src/components/AdvancedEditor.tsx (VERSÃO FINAL E OTIMIZADA)
'use client';
// Teste deploy
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder'; // <<< NOVO: Extensão para placeholder
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading2, Quote, Code } from 'lucide-react';
import React from 'react';

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;
  const Button = ({ onClick, children, isActive }: { onClick: () => void, children: React.ReactNode, isActive?: boolean }) => (
    <button type="button" onClick={onClick} className={`rounded p-2 transition-colors ${isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{children}</button>
  );
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-gray-300 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-800">
      <Button onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}><Bold size={16} /></Button>
      <Button onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}><Italic size={16} /></Button>
      <Button onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}><Strikethrough size={16} /></Button>
      <Button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })}><Heading2 size={16} /></Button>
      <Button onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}><List size={16} /></Button>
      <Button onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}><ListOrdered size={16} /></Button>
      <Button onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')}><Quote size={16} /></Button>
      <Button onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')}><Code size={16} /></Button>
    </div>
  );
};

interface AdvancedEditorProps {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
}

export default function AdvancedEditor({ content, onChange, placeholder }: AdvancedEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      // <<< NOVO: Configurar a extensão de placeholder >>>
      Placeholder.configure({
        placeholder: placeholder || 'Comece a escrever...',
      }),
    ],
    content: content,
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert min-h-[200px] max-w-none rounded-b-lg border border-t-0 border-gray-300 p-4 focus:outline-none dark:border-gray-600 dark:bg-gray-800',
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