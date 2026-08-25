'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { TableKit } from '@tiptap/extension-table'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import VideoNode from '@/components/dashboard/editor-extensions/VideoNode'
import IndentExtension from '@/components/dashboard/editor-extensions/IndentExtension'
const TEXT_COLORS = [
  '#202223',
  '#E8553A',
  '#0A1F44',
  '#008060',
  '#B5482A',
  '#6D5DFB',
  '#C2185B',
  '#B8860B',
]
const HIGHLIGHT_COLORS = [
  '#FEF3C7',
  '#DCFCE7',
  '#DBEAFE',
  '#FCE7F3',
  '#FFE4E0',
  '#EDE9FE',
]
const HEADING_SIZES: Record<string, string> = {
  p: '13px',
  h1: '26px',
  h2: '22px',
  h3: '19px',
  h4: '16px',
  h5: '14px',
}
interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}
const HEADING_LEVELS = [1, 2, 3, 4, 5] as const
function Tooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), 400)
  }
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }
  return (
    <span
      className='relative inline-flex'
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          className='pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
            whitespace-nowrap rounded-md bg-[#1a1a1a] px-2 py-1 text-[11px] font-medium text-white shadow-md'
        >
          {label}
          {}
          <span className='absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1a1a1a]' />
        </span>
      )}
    </span>
  )
}
function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <Tooltip label={title}>
      <button
        type='button'
        onClick={onClick}
        disabled={disabled}
        className={`px-2 py-1.5 rounded-md text-[13px] font-medium border-none cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active ? 'bg-[#008060] text-white' : 'bg-transparent text-[#202223] hover:bg-[#F1F1F1]'}`}
      >
        {children}
      </button>
    </Tooltip>
  )
}
function BoldIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M4 2.5H8.5C10 2.5 11 3.4 11 4.7C11 6 10 6.9 8.5 6.9H4V2.5Z'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinejoin='round'
      />
      <path
        d='M4 6.9H9C10.5 6.9 11.5 7.9 11.5 9.3C11.5 10.7 10.5 11.7 9 11.7H4V6.9Z'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinejoin='round'
      />
    </svg>
  )
}
function ItalicIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M6.5 2.5H11.5M4.5 13.5H9.5M9.5 2.5L6.5 13.5'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
      />
    </svg>
  )
}
function StrikeIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M2 8H14'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
      />
      <path
        d='M4.5 4.3C4.9 3 6.2 2.2 8 2.2C10 2.2 11.3 3.1 11.3 4.5C11.3 5.7 10.5 6.4 9 6.8M5 11.8C5.4 13 6.7 13.8 8.3 13.8C10.2 13.8 11.6 12.9 11.6 11.4C11.6 10.3 10.9 9.6 9.6 9.2'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
        fill='none'
      />
    </svg>
  )
}
function TextColorIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M5.8 10L8 3.5L10.2 10M6.5 7.8H9.5'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <rect
        x='2.5'
        y='12.2'
        width='11'
        height='2'
        rx='0.5'
        fill='currentColor'
      />
    </svg>
  )
}
function HighlightIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M9.5 2.5L13.5 6.5L7.5 12.5L3 13L3.5 8.5L9.5 2.5Z'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinejoin='round'
      />
      <path d='M7.5 4.5L11.5 8.5' stroke='currentColor' strokeWidth='1.3' />
    </svg>
  )
}
function AlignLeftIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M1.5 3H14.5M1.5 6.5H10M1.5 10H14.5M1.5 13.5H10'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </svg>
  )
}
function AlignCenterIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M1.5 3H14.5M4 6.5H12M1.5 10H14.5M4 13.5H12'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </svg>
  )
}
function AlignRightIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M1.5 3H14.5M6 6.5H14.5M1.5 10H14.5M6 13.5H14.5'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </svg>
  )
}
function AlignJustifyIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M1.5 3H14.5M1.5 6.5H14.5M1.5 10H14.5M1.5 13.5H14.5'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </svg>
  )
}
function IndentDecreaseIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M6.5 3H14.5M6.5 13H14.5M6.5 6.5H14.5M6.5 9.5H14.5'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M4.2 5.5L1.5 8L4.2 10.5'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
function IndentIncreaseIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M6.5 3H14.5M6.5 13H14.5M6.5 6.5H14.5M6.5 9.5H14.5'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M1.5 5.5L4.2 8L1.5 10.5'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
function BulletListIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <circle cx='2.5' cy='4' r='1.1' fill='currentColor' />
      <circle cx='2.5' cy='8' r='1.1' fill='currentColor' />
      <circle cx='2.5' cy='12' r='1.1' fill='currentColor' />
      <path
        d='M6 4H14M6 8H14M6 12H14'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
      />
    </svg>
  )
}
function NumberedListIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <text
        x='0.5'
        y='5.4'
        fontSize='4.2'
        fill='currentColor'
        fontFamily='sans-serif'
      >
        1
      </text>
      <text
        x='0.5'
        y='9.4'
        fontSize='4.2'
        fill='currentColor'
        fontFamily='sans-serif'
      >
        2
      </text>
      <text
        x='0.5'
        y='13.4'
        fontSize='4.2'
        fill='currentColor'
        fontFamily='sans-serif'
      >
        3
      </text>
      <path
        d='M6 4H14M6 8H14M6 12H14'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
      />
    </svg>
  )
}
function QuoteIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M3 5.5C3 4.4 3.9 3.5 5 3.5V5C4.4 5 4 5.4 4 6V6.5H5.5V10H2V6.5C2 6.1 2.1 5.8 3 5.5Z'
        fill='currentColor'
      />
      <path
        d='M9.5 5.5C9.5 4.4 10.4 3.5 11.5 3.5V5C10.9 5 10.5 5.4 10.5 6V6.5H12V10H8.5V6.5C8.5 6.1 8.6 5.8 9.5 5.5Z'
        fill='currentColor'
      />
    </svg>
  )
}
function LinkIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M6.5 9.5L9.5 6.5'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
      />
      <path
        d='M7.2 4.3L8 3.5C9 2.5 10.6 2.5 11.6 3.5C12.6 4.5 12.6 6.1 11.6 7.1L10.8 7.9M8.8 11.7L8 12.5C7 13.5 5.4 13.5 4.4 12.5C3.4 11.5 3.4 9.9 4.4 8.9L5.2 8.1'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
      />
    </svg>
  )
}
function ImageIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <rect
        x='2'
        y='3'
        width='12'
        height='10'
        rx='1.2'
        stroke='currentColor'
        strokeWidth='1.3'
      />
      <circle
        cx='5.5'
        cy='6.5'
        r='1.1'
        stroke='currentColor'
        strokeWidth='1.2'
      />
      <path
        d='M2.7 11.5L6 8.5L8.2 10.3L10.5 7.7L13.3 11.5'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
function VideoIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <rect
        x='2'
        y='4'
        width='8.5'
        height='8'
        rx='1.2'
        stroke='currentColor'
        strokeWidth='1.3'
      />
      <path
        d='M10.5 6.7L14 5V11L10.5 9.3'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinejoin='round'
      />
    </svg>
  )
}
function TableIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <rect
        x='2'
        y='2.5'
        width='12'
        height='11'
        rx='1'
        stroke='currentColor'
        strokeWidth='1.3'
      />
      <path
        d='M2 6H14M2 10H14M6.5 2.5V13.5M10.5 2.5V13.5'
        stroke='currentColor'
        strokeWidth='1.1'
      />
    </svg>
  )
}
function AddColumnIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <rect
        x='1.5'
        y='3'
        width='7'
        height='10'
        rx='1'
        stroke='currentColor'
        strokeWidth='1.2'
      />
      <path d='M1.5 6.3H8.5' stroke='currentColor' strokeWidth='1' />
      <path
        d='M12.5 5.5V11.5M9.5 8.5H15.5'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
      />
    </svg>
  )
}
function AddRowIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <rect
        x='2'
        y='1.5'
        width='10'
        height='7'
        rx='1'
        stroke='currentColor'
        strokeWidth='1.2'
      />
      <path d='M5.3 1.5V8.5' stroke='currentColor' strokeWidth='1' />
      <path
        d='M8.5 12.5V15.5M6.5 14H10.5'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
      />
    </svg>
  )
}
function DeleteColumnIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <rect
        x='1.5'
        y='3'
        width='7'
        height='10'
        rx='1'
        stroke='currentColor'
        strokeWidth='1.2'
      />
      <path d='M1.5 6.3H8.5' stroke='currentColor' strokeWidth='1' />
      <path
        d='M10 6L14 10M14 6L10 10'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
      />
    </svg>
  )
}
function DeleteRowIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <rect
        x='2'
        y='1.5'
        width='10'
        height='7'
        rx='1'
        stroke='currentColor'
        strokeWidth='1.2'
      />
      <path d='M5.3 1.5V8.5' stroke='currentColor' strokeWidth='1' />
      <path
        d='M6.5 12L10.5 15M10.5 12L6.5 15'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
      />
    </svg>
  )
}
function DeleteTableIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M3 4H13M6 4V2.7C6 2.3 6.3 2 6.7 2H9.3C9.7 2 10 2.3 10 2.7V4'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M4 4L4.6 13C4.6 13.6 5.1 14 5.6 14H10.4C11 14 11.4 13.6 11.5 13L12 4'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M6.5 7V11M9.5 7V11'
        stroke='currentColor'
        strokeWidth='1.2'
        strokeLinecap='round'
      />
    </svg>
  )
}
function UndoIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M4 5H10C12 5 13.5 6.5 13.5 8.5C13.5 10.5 12 12 10 12H6'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
      />
      <path
        d='M6.5 2.5L4 5L6.5 7.5'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
function RedoIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
      <path
        d='M12 5H6C4 5 2.5 6.5 2.5 8.5C2.5 10.5 4 12 6 12H10'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
      />
      <path
        d='M9.5 2.5L12 5L9.5 7.5'
        stroke='currentColor'
        strokeWidth='1.4'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [...HEADING_LEVELS],
        },
      }),
      ImageExt.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      VideoNode,
      TableKit.configure({
        table: {
          resizable: true,
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['paragraph', 'heading'],
        defaultAlignment: 'left',
      }),
      IndentExtension,
      LinkExt.configure({
        openOnClick: false,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing your post...',
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[300px] px-4 py-3 outline-none ' +
          '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 ' +
          '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 ' +
          '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2 ' +
          '[&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1.5 ' +
          '[&_h5]:text-[13px] [&_h5]:font-semibold [&_h5]:uppercase [&_h5]:tracking-wide [&_h5]:mt-3 [&_h5]:mb-1.5 ' +
          '[&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 ' +
          '[&_blockquote]:border-l-4 [&_blockquote]:border-[#008060]/40 [&_blockquote]:pl-3 [&_blockquote]:py-0.5 [&_blockquote]:my-3 [&_blockquote]:italic [&_blockquote]:text-[#4B5563] ' +
          '[&_a]:text-[#008060] [&_a]:underline ' +
          '[&_video]:my-3 [&_video]:rounded-lg [&_video]:max-w-full ' +
          '[&_table]:border-collapse [&_table]:w-full [&_table]:my-3 ' +
          '[&_th]:border [&_th]:border-[#E1E3E5] [&_th]:bg-[#FAFBFB] [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-[12.5px] [&_th]:font-semibold ' +
          '[&_td]:border [&_td]:border-[#E1E3E5] [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-[13px] ' +
          '[&_td.selectedCell]:bg-[#008060]/10 [&_th.selectedCell]:bg-[#008060]/10',
      },
    },
  })
  const [showTextColor, setShowTextColor] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const textColorRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (textColorRef.current && !textColorRef.current.contains(target)) {
        setShowTextColor(false)
      }
      if (highlightRef.current && !highlightRef.current.contains(target)) {
        setShowHighlight(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('files', file)
    const res = await fetch('/api/admin/uploads', {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json()
    return (data.files?.[0]?.url ?? data.uploads?.[0]?.url ?? '') as string
  }, [])
  const uploadImage = useCallback(
    async (file: File) => {
      try {
        const url = await uploadFile(file)
        if (url && editor)
          editor
            .chain()
            .focus()
            .setImage({
              src: url,
            })
            .run()
      } catch {
        toast.error('Image upload failed')
      }
    },
    [editor, uploadFile],
  )
  const uploadVideo = useCallback(
    async (file: File) => {
      try {
        const url = await uploadFile(file)
        if (url && editor)
          editor
            .chain()
            .focus()
            .setVideo({
              src: url,
            })
            .run()
      } catch {
        toast.error('Video upload failed')
      }
    },
    [editor, uploadFile],
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
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href: url,
      })
      .run()
  }
  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({
        rows: 3,
        cols: 3,
        withHeaderRow: true,
      })
      .run()
  }
  const inTable = editor.isActive('table')
  return (
    <div className='border border-[#E1E3E5] rounded-lg focus-within:border-[#008060]'>
      <div className='flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-[#E1E3E5] bg-[#FAFBFB] rounded-t-lg'>
        <select
          className='text-[13px] border border-[#E1E3E5] rounded-md px-1.5 py-1.5 bg-white mr-1 min-w-[110px]'
          value={
            HEADING_LEVELS.find((level) =>
              editor.isActive('heading', {
                level,
              }),
            )
              ? `h${HEADING_LEVELS.find((level) =>
                  editor.isActive('heading', {
                    level,
                  }),
                )}`
              : 'p'
          }
          onChange={(e) => {
            const v = e.target.value
            if (v === 'p') editor.chain().focus().setParagraph().run()
            else
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level: Number(v[1]) as (typeof HEADING_LEVELS)[number],
                })
                .run()
          }}
        >
          <option
            value='p'
            style={{
              fontSize: HEADING_SIZES.p,
            }}
          >
            Paragraph
          </option>
          <option
            value='h1'
            style={{
              fontSize: HEADING_SIZES.h1,
            }}
          >
            Heading 1
          </option>
          <option
            value='h2'
            style={{
              fontSize: HEADING_SIZES.h2,
            }}
          >
            Heading 2
          </option>
          <option
            value='h3'
            style={{
              fontSize: HEADING_SIZES.h3,
            }}
          >
            Heading 3
          </option>
          <option
            value='h4'
            style={{
              fontSize: HEADING_SIZES.h4,
            }}
          >
            Heading 4
          </option>
          <option
            value='h5'
            style={{
              fontSize: HEADING_SIZES.h5,
            }}
          >
            Heading 5
          </option>
        </select>

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <div className='relative' ref={textColorRef}>
          <ToolbarButton
            title='Text color'
            active={showTextColor}
            onClick={() => {
              setShowHighlight(false)
              setShowTextColor((s) => !s)
            }}
          >
            <span
              style={{
                color: editor.getAttributes('textStyle').color || '#202223',
              }}
            >
              <TextColorIcon />
            </span>
          </ToolbarButton>
          {showTextColor && (
            <div className='absolute z-10 top-full left-0 mt-1 p-2 w-[136px] bg-white border border-[#E1E3E5] rounded-md shadow-md'>
              <div className='flex flex-wrap gap-1.5'>
                {TEXT_COLORS.map((c) => {
                  const isActive =
                    (
                      editor.getAttributes('textStyle').color || ''
                    ).toLowerCase() === c.toLowerCase()
                  return (
                    <button
                      key={c}
                      type='button'
                      title={c}
                      onClick={() => {
                        editor.chain().focus().setColor(c).run()
                        setShowTextColor(false)
                      }}
                      className='relative w-5 h-5 rounded-full border border-black/10 flex items-center justify-center'
                      style={{
                        backgroundColor: c,
                      }}
                    >
                      {isActive && (
                        <span className='text-white text-[10px] leading-none drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]'>
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
                <button
                  type='button'
                  title='Reset color'
                  onClick={() => {
                    editor.chain().focus().unsetColor().run()
                    setShowTextColor(false)
                  }}
                  className='w-5 h-5 rounded-full border border-black/10 bg-white text-[10px] leading-none'
                >
                  ✕
                </button>
              </div>
              <div className='flex items-center gap-1.5 mt-2 pt-2 border-t border-[#E1E3E5]'>
                <input
                  type='color'
                  title='Custom color'
                  defaultValue={
                    editor.getAttributes('textStyle').color || '#000000'
                  }
                  onChange={(e) => {
                    editor.chain().focus().setColor(e.target.value).run()
                  }}
                  className='w-6 h-6 p-0 border border-black/10 rounded cursor-pointer'
                />
                <input
                  type='text'
                  placeholder='#0A1F44'
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    const v = e.currentTarget.value.trim()
                    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
                      editor.chain().focus().setColor(v).run()
                      setShowTextColor(false)
                    }
                  }}
                  className='flex-1 min-w-0 text-[12px] border border-[#E1E3E5] rounded px-1.5 py-1'
                />
              </div>
            </div>
          )}
        </div>

        <div className='relative' ref={highlightRef}>
          <ToolbarButton
            title='Background color'
            active={showHighlight}
            onClick={() => {
              setShowTextColor(false)
              setShowHighlight((s) => !s)
            }}
          >
            <span
              className='px-0.5 rounded-sm'
              style={{
                backgroundColor:
                  editor.getAttributes('highlight').color || 'transparent',
              }}
            >
              <HighlightIcon />
            </span>
          </ToolbarButton>
          {showHighlight && (
            <div className='absolute z-10 top-full left-0 mt-1 p-2 w-[120px] bg-white border border-[#E1E3E5] rounded-md shadow-md'>
              <div className='flex flex-wrap gap-1.5'>
                {HIGHLIGHT_COLORS.map((c) => {
                  const isActive =
                    (
                      editor.getAttributes('highlight').color || ''
                    ).toLowerCase() === c.toLowerCase()
                  return (
                    <button
                      key={c}
                      type='button'
                      title={c}
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .setHighlight({
                            color: c,
                          })
                          .run()
                        setShowHighlight(false)
                      }}
                      className='relative w-5 h-5 rounded-full border border-black/10 flex items-center justify-center'
                      style={{
                        backgroundColor: c,
                      }}
                    >
                      {isActive && (
                        <span className='text-[#0A1F44] text-[10px] leading-none'>
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
                <button
                  type='button'
                  title='Remove highlight'
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run()
                    setShowHighlight(false)
                  }}
                  className='w-5 h-5 rounded-full border border-black/10 bg-white text-[10px] leading-none'
                >
                  ✕
                </button>
              </div>
              <div className='flex items-center gap-1.5 mt-2 pt-2 border-t border-[#E1E3E5]'>
                <input
                  type='color'
                  title='Custom color'
                  defaultValue={
                    editor.getAttributes('highlight').color || '#FEF3C7'
                  }
                  onChange={(e) => {
                    editor
                      .chain()
                      .focus()
                      .setHighlight({
                        color: e.target.value,
                      })
                      .run()
                  }}
                  className='w-6 h-6 p-0 border border-black/10 rounded cursor-pointer'
                />
                <input
                  type='text'
                  placeholder='#FEF3C7'
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    const v = e.currentTarget.value.trim()
                    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
                      editor
                        .chain()
                        .focus()
                        .setHighlight({
                          color: v,
                        })
                        .run()
                      setShowHighlight(false)
                    }
                  }}
                  className='flex-1 min-w-0 text-[12px] border border-[#E1E3E5] rounded px-1.5 py-1'
                />
              </div>
            </div>
          )}
        </div>

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <ToolbarButton
          title='Bold'
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton
          title='Italic'
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton
          title='Strikethrough'
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <StrikeIcon />
        </ToolbarButton>

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <ToolbarButton
          title='Align left'
          active={editor.isActive({
            textAlign: 'left',
          })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeftIcon />
        </ToolbarButton>
        <ToolbarButton
          title='Align center'
          active={editor.isActive({
            textAlign: 'center',
          })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenterIcon />
        </ToolbarButton>
        <ToolbarButton
          title='Align right'
          active={editor.isActive({
            textAlign: 'right',
          })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRightIcon />
        </ToolbarButton>
        <ToolbarButton
          title='Justify'
          active={editor.isActive({
            textAlign: 'justify',
          })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustifyIcon />
        </ToolbarButton>

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <ToolbarButton
          title='Decrease indent'
          onClick={() => editor.chain().focus().outdent().run()}
        >
          <IndentDecreaseIcon />
        </ToolbarButton>
        <ToolbarButton
          title='Increase indent'
          onClick={() => editor.chain().focus().indent().run()}
        >
          <IndentIncreaseIcon />
        </ToolbarButton>

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <ToolbarButton
          title='Bullet list'
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <BulletListIcon />
        </ToolbarButton>
        <ToolbarButton
          title='Numbered list'
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <NumberedListIcon />
        </ToolbarButton>
        <ToolbarButton
          title='Quote'
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <QuoteIcon />
        </ToolbarButton>

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <ToolbarButton
          title='Link'
          active={editor.isActive('link')}
          onClick={setLink}
        >
          <LinkIcon />
        </ToolbarButton>
        <ToolbarButton
          title='Insert image'
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon />
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
        <ToolbarButton
          title='Insert video'
          onClick={() => videoInputRef.current?.click()}
        >
          <VideoIcon />
        </ToolbarButton>
        <input
          ref={videoInputRef}
          type='file'
          accept='video/*'
          className='hidden'
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadVideo(file)
            e.target.value = ''
          }}
        />

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <ToolbarButton
          title='Insert table'
          active={inTable}
          onClick={insertTable}
        >
          <TableIcon />
        </ToolbarButton>
        {inTable && (
          <>
            <ToolbarButton
              title='Add column after'
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              <AddColumnIcon />
            </ToolbarButton>
            <ToolbarButton
              title='Add row after'
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              <AddRowIcon />
            </ToolbarButton>
            <ToolbarButton
              title='Delete column'
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              <DeleteColumnIcon />
            </ToolbarButton>
            <ToolbarButton
              title='Delete row'
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              <DeleteRowIcon />
            </ToolbarButton>
            <ToolbarButton
              title='Delete table'
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              <DeleteTableIcon />
            </ToolbarButton>
          </>
        )}

        <div className='w-px h-5 bg-[#E1E3E5] mx-1' />

        <ToolbarButton
          title='Undo'
          onClick={() => editor.chain().focus().undo().run()}
        >
          <UndoIcon />
        </ToolbarButton>
        <ToolbarButton
          title='Redo'
          onClick={() => editor.chain().focus().redo().run()}
        >
          <RedoIcon />
        </ToolbarButton>
      </div>

      <div className='rounded-b-lg overflow-hidden'>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
