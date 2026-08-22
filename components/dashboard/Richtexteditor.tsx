'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useRef } from 'react'
import { toast } from 'sonner'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type='button'
      title={title}
      onClick={onClick}
      className={`px-2 py-1.5 rounded-md text-[13px] font-medium border-none cursor-pointer transition-colors ${
        active
          ? 'bg-[#008060] text-white'
          : 'bg-transparent text-[#202223] hover:bg-[#F1F1F1]'
      }`}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      ImageExt.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full' },
      }),
      LinkExt.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing your post...',
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[300px] px-4 py-3 outline-none [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-[#E1E3E5] [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-[#008060] [&_a]:underline',
      },
    },
  })

  const uploadImage = useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append('files', file)
      try {
        const res = await fetch('/api/admin/uploads', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) throw new Error('Upload failed')
        const data = await res.json()
        const url: string = data.files?.[0]?.url ?? data.uploads?.[0]?.url ?? ''
        if (url && editor) {
          editor.chain().focus().setImage({ src: url }).run()
        }
      } catch {
        toast.error('Image upload failed')
      }
    },
    [editor],
  )

  if (!editor) return null

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter URL', previousUrl || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className='border border-[#E1E3E5] rounded-lg overflow-hidden focus-within:border-[#008060]'>
      <div className='flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-[#E1E3E5] bg-[#FAFBFB]'>
        <select
          className='text-[13px] border border-[#E1E3E5] rounded-md px-1.5 py-1 bg-white mr-1'
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
                ? 'h2'
                : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : 'p'
          }
          onChange={(e) => {
            const v = e.target.value
            if (v === 'p') editor.chain().focus().setParagraph().run()
            else
              editor
                .chain()
                .focus()
                .toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 })
                .run()
          }}
        >
          <option value='p'>Paragraph</option>
          <option value='h1'>Heading 1</option>
          <option value='h2'>Heading 2</option>
          <option value='h3'>Heading 3</option>
        </select>

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <ToolbarButton
          title='Bold'
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title='Italic'
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          title='Strikethrough'
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <s>S</s>
        </ToolbarButton>

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <ToolbarButton
          title='Bullet list'
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          title='Numbered list'
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          title='Quote'
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          " Quote
        </ToolbarButton>

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <ToolbarButton
          title='Link'
          active={editor.isActive('link')}
          onClick={setLink}
        >
          🔗 Link
        </ToolbarButton>
        <ToolbarButton
          title='Insert image'
          onClick={() => fileInputRef.current?.click()}
        >
          🖼 Image
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          className='hidden'
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadImage(file)
            e.target.value = ''
          }}
        />

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <ToolbarButton
          title='Undo'
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </ToolbarButton>
        <ToolbarButton
          title='Redo'
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
