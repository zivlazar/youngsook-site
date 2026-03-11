'use client'

import { useRef, useState } from 'react'
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import { uploadImage } from '@/lib/admin-api'
import type { NodeViewProps } from '@tiptap/react'

interface Props {
  content: string
  onChange: (html: string) => void
  slug?: string
}

// ── Video embed node (YouTube / Vimeo) ───────────────────────────────────────
function VideoNodeView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper>
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', marginBottom: '1em' }}>
        <iframe
          src={node.attrs.src as string}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          allowFullScreen
          title="video"
        />
      </div>
    </NodeViewWrapper>
  )
}
const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  addAttributes() { return { src: { default: null } } },
  parseHTML() { return [{ tag: 'iframe[data-video]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-video': 'true', style: 'position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin-bottom:1em' },
      ['iframe', mergeAttributes({ src: HTMLAttributes.src }, {
        style: 'position:absolute;top:0;left:0;width:100%;height:100%;border:0',
        allowfullscreen: 'true',
        'data-video': 'true',
      })],
    ]
  },
  addNodeView() { return ReactNodeViewRenderer(VideoNodeView) },
})

function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com/')) return url
  return null
}


export default function RichTextEditor({ content, onChange, slug }: Props) {
  // Maps temporary data URLs → permanent /images/... paths for uploads this session
  const pendingImages = useRef<Map<string, string>>(new Map())
  const savedSelection = useRef<{ from: number; to: number } | null>(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: true }),
      VideoEmbed,
      TextStyle,
      FontSize,
    ],
    content,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      let html = editor.getHTML()
      // Substitute any in-editor data URLs with their permanent paths before saving
      pendingImages.current.forEach((path, dataUrl) => {
        html = html.split(dataUrl).join(path)
      })
      onChange(html)
    },
  })

  if (!editor) return null

  async function handleImageUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const dataUrl = await fileToBase64(file)
      // Insert the data URL immediately — image is visible right away
      editor.chain().focus().setImage({ src: dataUrl }).run()
      const timestamp = Date.now()
      const ext = file.name.split('.').pop()
      const filename = `${slug || 'page'}-inline-${timestamp}.${ext}`
      try {
        const path = await uploadImage(filename, dataUrl.split(',')[1])
        // Record mapping so onChange swaps the data URL out for the real path
        pendingImages.current.set(dataUrl, path)
      } catch (e) {
        alert('Image upload failed: ' + (e as Error).message)
      }
    }
    input.click()
  }

  function applyLink() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = (editor as any).chain().focus()
    if (savedSelection.current) {
      chain.setTextSelection(savedSelection.current)
    }
    if (linkUrl === '') {
      chain.unsetLink().run()
    } else {
      chain.setLink({ href: linkUrl }).run()
    }
    savedSelection.current = null
    setShowLinkInput(false)
    setLinkUrl('')
  }

  function insertVideo() {
    const url = window.prompt('YouTube or Vimeo URL:')
    if (!url) return
    const embedUrl = toEmbedUrl(url.trim())
    if (!embedUrl) { alert('Please enter a valid YouTube or Vimeo URL.'); return }
    editor.chain().focus().insertContent({ type: 'videoEmbed', attrs: { src: embedUrl } }).run()
  }

  // Block-level commands need .focus() so they work even before user clicks into editor.
  // onMouseDown + preventDefault prevents the editor losing focus when toolbar is clicked.
  const btn = (label: string, action: () => void, active = false) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); action() }}
      className={`px-2 py-1 text-xs font-sans border ${active ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
    >
      {label}
    </button>
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = editor as any

  // Link button: onMouseDown+preventDefault keeps editor selection intact
  const linkBtn = showLinkInput ? (
    <span className="flex items-center gap-1">
      <input
        type="url"
        value={linkUrl}
        onChange={ev => setLinkUrl(ev.target.value)}
        onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); applyLink() } if (ev.key === 'Escape') setShowLinkInput(false) }}
        placeholder="https://..."
        autoFocus
        className="text-xs font-sans border border-gray-300 px-2 py-1 focus:outline-none focus:border-black w-44"
      />
      <button type="button" onMouseDown={ev => { ev.preventDefault(); applyLink() }} className="px-2 py-1 text-xs font-sans border border-gray-300 hover:border-black">Apply</button>
      <button type="button" onMouseDown={ev => { ev.preventDefault(); setShowLinkInput(false) }} className="px-2 py-1 text-xs font-sans border border-gray-300 hover:border-black">✕</button>
    </span>
  ) : (
    <button
      type="button"
      onMouseDown={ev => {
        ev.preventDefault()
        const { from, to } = editor.state.selection
        savedSelection.current = { from, to }
        setLinkUrl((editor.getAttributes('link').href as string) || '')
        setShowLinkInput(true)
      }}
      className={`px-2 py-1 text-xs font-sans border ${editor.isActive('link') ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
    >
      Link
    </button>
  )

  return (
    <div className="border border-gray-300 focus-within:border-black">
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
        {btn('B', () => e.chain().focus().toggleBold().run(), e.isActive('bold'))}
        {btn('I', () => e.chain().focus().toggleItalic().run(), e.isActive('italic'))}
        <span className="border-l border-gray-200 mx-1" />
        {btn('Large', () => e.chain().focus().setFontSize('1.4em').run())}
        {btn('XL', () => e.chain().focus().setFontSize('1.8em').run())}
        {btn('Normal', () => e.chain().focus().unsetFontSize().run())}
        <span className="border-l border-gray-200 mx-1" />
        {linkBtn}
        {btn('Video', insertVideo)}
        {btn('Image', handleImageUpload)}
        {btn('Clear', () => e.chain().focus().clearNodes().unsetAllMarks().run())}
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
