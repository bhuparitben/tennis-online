import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import type { UseFormWatch, UseFormSetValue, UseFormGetValues } from 'react-hook-form'
import type { CourtFormData } from '../../../types'
import api, { resolveAssetUrl } from '../../../lib/apiClient'

interface Props {
  watch: UseFormWatch<CourtFormData>
  setValue: UseFormSetValue<CourtFormData>
  getValues: UseFormGetValues<CourtFormData>
}

interface UploadItem {
  preview: string   // local object URL
  url: string       // server path after upload (or empty while uploading)
  uploading: boolean
  error?: string
  name: string
}

export default function StepPhotos({ watch, setValue, getValues }: Props) {
  // Seeded once from whatever `images` the form already holds — covers both
  // a blank new submission (empty) and editing an existing one (its photos
  // show as thumbnails immediately, not just invisibly in form state).
  const [items, setItems] = useState<UploadItem[]>(() =>
    watch('images').map((img) => ({
      preview: resolveAssetUrl(img.url),
      url: img.url,
      uploading: false,
      name: img.url,
    })),
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const images = watch('images')
  const [isDragging, setIsDragging] = useState(false)
  // Counts nested dragenter/dragleave pairs — the drop zone has child
  // elements (svg, text), so the browser fires dragleave every time the
  // pointer crosses into one of them, not just when it truly exits the
  // zone. Only turning the highlight off at count 0 stops that flicker.
  const dragCounter = useRef(0)

  function setCover(url: string) {
    setValue(
      'images',
      getValues('images').map((img) => ({ ...img, is_cover: img.url === url })),
    )
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const newItems: UploadItem[] = Array.from(files).map((f) => ({
      preview: URL.createObjectURL(f),
      url: '',
      uploading: true,
      name: f.name,
    }))
    setItems((prev) => [...prev, ...newItems])

    // Upload each file. Sequential + awaited so every setValue below reads
    // the array a *previous* iteration just wrote — using the `images`
    // closed over from render would go stale after the first await and
    // each successive photo would overwrite the last instead of appending.
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
        // The very first photo ever added becomes the cover automatically —
        // everyone gets a cover without having to think about it, and can
        // still change their mind with the button on each thumbnail.
        const current = getValues('images')
        setValue('images', [
          ...current,
          { url: data.url, is_cover: current.length === 0 },
        ])
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

  function handleDragEnter(e: DragEvent) {
    e.preventDefault()
    dragCounter.current += 1
    setIsDragging(true)
  }

  function handleDragOver(e: DragEvent) {
    // Required — without preventDefault a browser refuses to allow a drop here at all.
    e.preventDefault()
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function removeItem(preview: string, url: string) {
    URL.revokeObjectURL(preview)
    setItems((prev) => prev.filter((i) => i.preview !== preview))

    const current = getValues('images')
    const remaining = current.filter((img) => img.url !== url)
    const removedWasCover = current.find((img) => img.url === url)?.is_cover
    // Losing the cover photo shouldn't leave the court with none — hand the
    // title to whatever's left.
    if (removedWasCover && remaining.length > 0) {
      remaining[0] = { ...remaining[0], is_cover: true }
    }
    setValue('images', remaining)
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        อัปโหลดรูปถ่ายสนามที่ได้รับอนุญาตจากเจ้าของสนาม (สูงสุด 10 MB ต่อไฟล์) —
        คลิกไอคอน <span aria-hidden>★</span> บนรูปเพื่อกำหนดเป็นภาพปกที่จะแสดงก่อนเมื่อผู้ใช้งานเข้ามาดู
      </p>

      {/* Drop zone — click to browse, or drag files in from the desktop */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 transition-colors group',
          isDragging
            ? 'border-primary bg-primary-light/50'
            : 'border-border hover:border-primary/50 hover:bg-primary-light/30',
        ].join(' ')}
      >
        <svg
          className={[
            'w-10 h-10 transition-colors',
            isDragging ? 'text-primary' : 'text-muted group-hover:text-primary',
          ].join(' ')}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className={[
          'text-sm font-medium transition-colors',
          isDragging ? 'text-primary' : 'text-ink group-hover:text-primary',
        ].join(' ')}>
          {isDragging ? 'วางรูปภาพที่นี่' : 'คลิกเพื่อเลือกรูปภาพ หรือลากรูปมาวาง'}
        </p>
        <p className="text-xs text-muted">รองรับ JPG, PNG, WEBP · เลือกได้หลายรูปพร้อมกัน</p>
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
          {items.map((item) => {
            const isCover = !!item.url && images.find((img) => img.url === item.url)?.is_cover
            return (
              <div
                key={item.preview}
                className={[
                  'relative group rounded-xl overflow-hidden border aspect-[4/3] bg-bg',
                  isCover ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                ].join(' ')}
              >
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

                {/* Cover star toggle */}
                {!item.uploading && !item.error && item.url && (
                  <button
                    type="button"
                    onClick={() => setCover(item.url)}
                    title={isCover ? 'ภาพปกของสนามนี้' : 'ตั้งเป็นภาพปก'}
                    className={[
                      'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors',
                      isCover
                        ? 'bg-primary text-white'
                        : 'bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-primary',
                    ].join(' ')}
                  >
                    ★
                  </button>
                )}

                {/* Cover label */}
                {isCover && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-semibold">
                    ภาพปก
                  </span>
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
            )
          })}
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
