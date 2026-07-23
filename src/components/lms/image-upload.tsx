'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

interface ImageUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  label?: string
}

export function ImageUpload({ value, onChange, label = 'Cover Image' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, etc.)')
      return
    }
    // Check size before uploading (4MB limit)
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image is too large. Maximum 4MB. Please use a smaller image.')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })

      // Handle empty response (Vercel body limit)
      const text = await res.text()
      if (!text) {
        throw new Error('Upload failed. The image may be too large for the server. Try a smaller image (under 3MB).')
      }

      let json
      try {
        json = JSON.parse(text)
      } catch {
        throw new Error('Server error during upload. Please try again.')
      }

      if (!res.ok) throw new Error(json.error || 'Upload failed')
      onChange(json.url)
      toast.success('Image uploaded')
    } catch (e: any) {
      toast.error(e.message || 'Upload failed. Try a smaller image.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = () => {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) upload(f)
        }}
      />
      {value ? (
        <div className="relative rounded-md overflow-hidden border group">
          <img src={value} alt="Uploaded preview" className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={remove}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            title="Remove image"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3 text-white" />
            <span className="text-[10px] text-white truncate">Image attached</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 rounded-md border-2 border-dashed border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors flex flex-col items-center justify-center gap-1.5 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs">Uploading…</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span className="text-xs font-medium">Upload Image</span>
              <span className="text-[10px]">Click to select from your device</span>
            </>
          )}
        </button>
      )}
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs h-7 px-2"
        >
          {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
          Replace
        </Button>
      )}
    </div>
  )
}
