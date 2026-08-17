import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import ImagePlaceholder from '../../components/ui/ImagePlaceholder'
import CourtStepper from '../../components/court/CourtStepper'
import StepBasicInfo from '../../components/court/steps/StepBasicInfo'
import StepCourtDetails from '../../components/court/steps/StepCourtDetails'
import StepAmenities from '../../components/court/steps/StepAmenities'
import StepPhotos from '../../components/court/steps/StepPhotos'
import { EMPTY_COURT_FORM, courtToFormData } from '../../lib/courtFormData'
import type { CourtFormData, CourtWithRelations, Province } from '../../types'
import api, { resolveAssetUrl } from '../../lib/apiClient'

type CourtSearchRow = CourtWithRelations & { images?: { url: string }[] }

const STEPS = [
  { label: 'ข้อมูลพื้นฐาน' },
  { label: 'ข้อมูลสนาม' },
  { label: 'บริการเสริม' },
  { label: 'รูปภาพ' },
]

// ===== Search phase =====
function SearchPanel({ onPick }: { onPick: (court: CourtSearchRow) => void }) {
  const [q, setQ] = useState('')
  const [provinceId, setProvinceId] = useState('')
  const [provinces, setProvinces] = useState<Province[]>([])
  const [results, setResults] = useState<CourtSearchRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    api.get<Province[]>('/provinces').then((r) => setProvinces(r.data))
  }, [])

  // Debounced search — fires on every q/province change once either is set.
  useEffect(() => {
    if (!q.trim() && !provinceId) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    const t = setTimeout(() => {
      api
        .get<CourtSearchRow[]>('/courts', {
          params: { q: q.trim() || undefined, province_id: provinceId || undefined },
        })
        .then((r) => setResults(r.data))
        .finally(() => {
          setLoading(false)
          setSearched(true)
        })
    }, 350)
    return () => clearTimeout(t)
  }, [q, provinceId])

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-ink mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
        ค้นหาสนามที่ต้องการตรวจสอบ
      </h2>
      <p className="text-sm text-muted mb-5">
        พิมพ์ชื่อสนาม หรือเลือกจังหวัด เพื่อค้นหาสนามที่มีอยู่แล้วในระบบ
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อสนาม..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-white text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        <select
          value={provinceId}
          onChange={(e) => setProvinceId(e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors sm:w-56"
        >
          <option value="">-- ทุกจังหวัด --</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>{p.name_th}</option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="text-sm text-muted py-6 text-center">กำลังค้นหา...</p>
      )}

      {!loading && searched && results.length === 0 && (
        <p className="text-sm text-muted py-6 text-center">ไม่พบสนามที่ตรงกับคำค้นหา</p>
      )}

      {!loading && !searched && (
        <p className="text-sm text-muted py-6 text-center">พิมพ์ชื่อสนามหรือเลือกจังหวัดเพื่อเริ่มค้นหา</p>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:border-primary/40 hover:bg-primary-light/20 transition-colors text-left"
            >
              {c.images?.[0]?.url ? (
                <img src={resolveAssetUrl(c.images[0].url)} alt="" className="w-14 h-10 rounded-lg object-cover bg-bg shrink-0" />
              ) : (
                <ImagePlaceholder className="w-14 h-10 rounded-lg shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">{c.name}</p>
                <p className="text-xs text-muted">
                  {c.province.name_th}
                  {c.district?.name_th && <> · {c.district.name_th}</>}
                </p>
              </div>
              <svg className="w-4 h-4 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== Main Page =====
export default function VerifyCourtPage() {
  const navigate = useNavigate()
  const [picked, setPicked] = useState<CourtSearchRow | null>(null)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const form = useForm<CourtFormData>({ defaultValues: EMPTY_COURT_FORM })
  const { register, control, handleSubmit, watch, setValue, getValues, trigger, reset, formState: { errors } } = form
  const stepProps = { register, control, errors, watch, setValue }

  const navLockRef = useRef(false)

  function pickCourt(court: CourtSearchRow) {
    setPicked(court)
    setStep(0)
    reset(courtToFormData(court))
  }

  function backToSearch() {
    setPicked(null)
    setStep(0)
    reset(EMPTY_COURT_FORM)
  }

  async function handleNext() {
    if (navLockRef.current) return
    navLockRef.current = true
    try {
      if (step === 0) {
        const ok = await trigger(['name', 'province_id'])
        if (!ok) return
      }
      setStep((s) => s + 1)
    } finally {
      setTimeout(() => {
        navLockRef.current = false
      }, 400)
    }
  }

  async function onSubmit(data: CourtFormData) {
    if (!picked || navLockRef.current) return
    navLockRef.current = true
    setSubmitting(true)
    setSubmitError('')
    try {
      // Reuses the exact same duplicate-comparison flow as the "add court"
      // path — the compare page re-fetches the court fresh at submit time,
      // so this always diffs against the current data, not whatever was
      // loaded when this wizard opened.
      navigate('/ambassador/courts/verify', {
        state: { matchedCourt: { id: picked.id, name: picked.name }, formData: data },
      })
    } finally {
      setSubmitting(false)
      navLockRef.current = false
    }
  }

  const pageTitle = 'ตรวจสอบ / อัปเดตข้อมูลสนาม'

  return (
    <AppLayout>
      <TopBar
        title={pageTitle}
        breadcrumbs={[
          { label: 'หน้าหลัก', to: '/ambassador/dashboard' },
          { label: 'สนามเทนนิส', to: '/ambassador/dashboard' },
          { label: pageTitle },
        ]}
      />

      <div className="max-w-3xl mx-auto space-y-5">
        {!picked ? (
          <SearchPanel onPick={pickCourt} />
        ) : (
          <>
            {/* Selected-court banner */}
            <div className="bg-primary-light border border-primary/20 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted">กำลังตรวจสอบข้อมูลสนาม</p>
                <p className="text-sm font-semibold text-ink truncate">
                  {picked.name} · {picked.province.name_th}
                  {picked.district?.name_th && <> · {picked.district.name_th}</>}
                </p>
              </div>
              <button
                type="button"
                onClick={backToSearch}
                className="text-xs font-medium text-primary hover:underline shrink-0"
              >
                ← เปลี่ยนสนาม
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8">
                <CourtStepper labels={STEPS.map((s) => s.label)} current={step} />

                <h2 className="text-lg font-semibold text-ink mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  ขั้นตอนที่ {step + 1}: {STEPS[step].label}
                </h2>
                <p className="text-xs text-muted mb-6">
                  ตรวจสอบข้อมูลด้านล่าง แก้ไขส่วนที่ไม่ถูกต้องหรือล้าสมัย แล้วกด "ตรวจสอบ" ที่ขั้นตอนสุดท้าย
                  เพื่อเปรียบเทียบกับข้อมูลปัจจุบันในระบบก่อนส่ง
                </p>

                <div className="min-h-[320px]">
                  {step === 0 && <StepBasicInfo {...stepProps} />}
                  {step === 1 && <StepCourtDetails {...stepProps} />}
                  {step === 2 && <StepAmenities watch={watch} setValue={setValue} />}
                  {step === 3 && <StepPhotos watch={watch} setValue={setValue} getValues={getValues} />}
                </div>

                {submitError && (
                  <div className="mt-4 rounded-xl bg-danger-light border border-danger/20 px-4 py-3 text-sm text-danger">
                    {submitError}
                  </div>
                )}

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => (step === 0 ? backToSearch() : setStep((s) => s - 1))}
                  >
                    {step === 0 ? '← เปลี่ยนสนาม' : '← ย้อนกลับ'}
                  </Button>

                  {step < STEPS.length - 1 ? (
                    <Button type="button" onClick={handleNext}>
                      ถัดไป →
                    </Button>
                  ) : (
                    <Button type="submit" loading={submitting} size="lg">
                      ตรวจสอบ / เปรียบเทียบข้อมูล →
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-muted mt-3">
                ขั้นตอน {step + 1} จาก {STEPS.length}
              </p>
            </form>
          </>
        )}
      </div>
    </AppLayout>
  )
}
