'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { uploadImage } from '@/lib/admin-api'

interface Props {
  content: string
  onChange: (html: string) => void
  slug?: string
}

export default function RichTextEditor({ content, onChange, slug }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  if (!editor) return null

  async function handleImageUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const base64 = await fileToBase64(file)
      const timestamp = Date.now()
      const ext = file.name.split('.').pop()
      const filename = `${slug || 'page'}-inline-${timestamp}.${ext}`
      try {
        const path = await uploadImage(filename, base64.split(',')[1])
        editor.chain().focus().setImage({ src: path }).run()
      } catch (e) {
        alert('Image upload failed: ' + (e as Error).message)
      }
    }
    input.click()
  }

  function setLink() {
    const url = window.prompt('URL:', editor.getAttributes('link').href)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const btn = (label: string, action: () => void, active = false) => (
    <button
      type="button"
      onClick={action}
      className={`px-2 py-1 text-xs font-sans border ${active ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="border border-gray-300 focus-within:border-black">
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
        {btn('B', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
        {btn('I', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
        {btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
        {btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
        {btn('¶', () => editor.chain().focus().setParagraph().run(), editor.isActive('paragraph'))}
        {btn('" "', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
        {btn('Link', setLink, editor.isActive('link'))}
        {btn('Image', handleImageUpload)}
        {btn('Clear', () => editor.chain().focus().clearNodes().unsetAllMarks().run())}
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]"
      />
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
