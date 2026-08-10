import { useState, useRef } from 'react'
import type { UseFormWatch, UseFormSetValue } from 'react-hook-form'
import type { CourtFormData } from '../../../types'
import api from '../../../lib/apiClient'

interface Props {
  watch: UseFormWatch<CourtFormData>
  setValue: UseFormSetValue<CourtFormData>
}

interface UploadItem {
  preview: string   // local object URL
  url: string       // server path after upload (or empty while uploading)
  uploading: boolean
  error?: string
  name: string
}

export default function StepPhotos({ watch, setValue }: Props) {
  const [items, setItems] = useState<UploadItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const imageUrls = watch('image_urls')

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const newItems: UploadItem[] = Array.from(files).map((f) => ({
      preview: URL.createObjectURL(f),
      url: '',
      uploading: true,
      name: f.name,
    }))
    setItems((prev) => [...prev, ...newItems])

    // Upload each file
    for (let i = 0; i < newItems.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)
      try {
        const { data } = await api.post<{ url: string }>('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setItems((prev) =>
          prev.map((item) =>
            item.preview === newItems[i].preview ? { ...item, url: data.url, uploading: false } : item,
          ),
        )
        setValue('image_urls', [...imageUrls, data.url])
      } catch {
        setItems((prev) =>
          prev.map((item) =>
            item.preview === newItems[i].preview
              ? { ...item, uploading: false, error: 'อัปโหลดไม่สำเร็จ' }
              : item,
          ),
        )
      }
    }
  }

  function removeItem(preview: string, url: string) {
    URL.revokeObjectURL(preview)
    setItems((prev) => prev.filter((i) => i.preview !== preview))
    setValue(
      'image_urls',
      imageUrls.filter((u) => u !== url),
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        อัปโหลดรูปถ่ายสนามที่ได้รับอนุญาตจากเจ้าของสนาม (สูงสุด 10 MB ต่อไฟล์)
      </p>

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary-light/30 transition-colors group"
      >
        <svg className="w-10 h-10 text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm font-medium text-ink group-hover:text-primary transition-colors">
          คลิกเพื่อเลือกรูปภาพ
        </p>
        <p className="text-xs text-muted">รองรับ JPG, PNG, WEBP</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Preview grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.preview} className="relative group rounded-xl overflow-hidden border border-border aspect-[4/3] bg-bg">
              <img
                src={item.preview}
                alt={item.name}
                className="w-full h-full object-cover"
              />

              {/* Uploading overlay */}
              {item.uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <svg className="animate-spin w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}

              {/* Error overlay */}
              {item.error && (
                <div className="absolute inset-0 bg-danger/80 flex items-center justify-center">
                  <p className="text-white text-xs text-center px-2">{item.error}</p>
                </div>
              )}

              {/* Success tick */}
              {!item.uploading && !item.error && item.url && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              {/* Remove button */}
              {!item.uploading && (
                <button
                  type="button"
                  onClick={() => removeItem(item.preview, item.url)}
                  className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-danger"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submission notice */}
      <div className="rounded-xl bg-warning-light border border-warning/20 px-4 py-3 text-sm text-warning">
        <p className="font-medium">⚠️ หมายเหตุก่อนส่ง</p>
        <p className="mt-1 text-xs">
          ระบบจะตรวจสอบว่าสนามนี้มีข้อมูลซ้ำในระบบหรือไม่ หากพบข้อมูลซ้ำ
          คุณจะถูกนำไปยังหน้าเปรียบเทียบข้อมูล
        </p>
      </div>
    </div>
  )
}
