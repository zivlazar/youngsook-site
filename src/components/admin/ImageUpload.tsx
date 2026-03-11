'use client'

import { useState, useRef } from 'react'
import { uploadImage } from '@/lib/admin-api'

interface Props {
  currentSrc: string
  slug: string
  onUpload: (path: string) => void
}

export default function ImageUpload({ currentSrc, slug, onUpload }: Props) {
  const [preview, setPreview] = useState(currentSrc)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    try {
      const base64 = await fileToBase64(file)
      const ext = file.name.split('.').pop()
      const filename = `${slug}-hero.${ext}`
      const path = await uploadImage(filename, base64.split(',')[1])
      onUpload(path)
      setPreview(path)
    } catch (e) {
      setError('Upload failed: ' + (e as Error).message)
      setPreview(currentSrc)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {preview && (
        <div className="relative bg-gray-100 aspect-video w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-sans">
              Uploading…
            </div>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs font-sans uppercase tracking-[0.0625em] border border-gray-300 px-4 py-2 hover:border-black disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Replace image'}
      </button>
      {error && <p className="text-red-600 text-xs font-sans">{error}</p>}
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
