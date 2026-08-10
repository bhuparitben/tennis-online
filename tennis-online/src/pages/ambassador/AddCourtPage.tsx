import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import StepBasicInfo from '../../components/court/steps/StepBasicInfo'
import StepCourtDetails from '../../components/court/steps/StepCourtDetails'
import StepAmenities from '../../components/court/steps/StepAmenities'
import StepPhotos from '../../components/court/steps/StepPhotos'
import type { CourtFormData } from '../../types'
import api from '../../lib/apiClient'

// ===== Default values =====
const DEFAULT_AMENITIES = {
  has_coach: false, equipment_rental: false, parking_sufficient: false,
  has_restroom: false, has_shower: false, has_restaurant: false,
  has_cafe: false, has_stringing: false,
}

const DEFAULTS: CourtFormData = {
  name: '', province_id: null, district_id: null,
  address_line: '', subdistrict: '', postal_code: '',
  google_map_link: '', phone: '', line_id: '', facebook_page: '', website: '',
  open_time: '', close_time: '', open_daily: false,
  num_courts: null, surface_type_id: null, indoor_outdoor: 'outdoor',
  has_lights: false, pricing: [],
  amenities: DEFAULT_AMENITIES,
  image_urls: [],
}

// ===== Step config =====
const STEPS = [
  { label: 'ข้อมูลพื้นฐาน', fields: ['name', 'province_id'] as const },
  { label: 'ข้อมูลสนาม',    fields: [] as const },
  { label: 'บริการเสริม',   fields: [] as const },
  { label: 'รูปภาพ',        fields: [] as const },
]

// ===== Stepper UI =====
function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          {/* Circle */}
          <div className="flex flex-col items-center">
            <div
              className={[
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                i < current
                  ? 'bg-success text-white'
                  : i === current
                  ? 'bg-primary text-white shadow-md scale-110'
                  : 'bg-white border-2 border-border text-muted',
              ].join(' ')}
            >
              {i < current ? (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={[
                'mt-1 text-xs font-medium whitespace-nowrap',
                i === current ? 'text-primary' : i < current ? 'text-success' : 'text-muted',
              ].join(' ')}
            >
              {STEPS[i].label}
            </span>
          </div>

          {/* Connector line */}
          {i < total - 1 && (
            <div className="flex-1 h-0.5 mx-2 mb-4 transition-colors duration-300"
              style={{ background: i < current ? 'var(--color-success)' : 'var(--color-border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ===== Main Page =====
export default function AddCourtPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const form = useForm<CourtFormData>({ defaultValues: DEFAULTS })
  const { register, control, handleSubmit, watch, setValue, trigger, formState: { errors } } = form

  const stepProps = { register, control, errors, watch, setValue }

  async function handleNext() {
    // Validate required fields for step 1
    if (step === 0) {
      const ok = await trigger(['name', 'province_id'])
      if (!ok) return
    }
    setStep((s) => s + 1)
  }

  async function onSubmit(data: CourtFormData) {
    setSubmitting(true)
    setSubmitError('')
    try {
      // 1. Check duplicate
      const { data: dupResult } = await api.post<{
        isDuplicate: boolean
        matchedCourt?: { id: number; name: string }
      }>('/courts/check-duplicate', {
        name: data.name,
        province_id: data.province_id,
        district_id: data.district_id,
      })

      if (dupResult.isDuplicate && dupResult.matchedCourt) {
        // Duplicate detected → go to verify page
        navigate('/ambassador/courts/verify', {
          state: { matchedCourt: dupResult.matchedCourt, formData: data },
        })
        return
      }

      // 2. No duplicate → create court
      await api.post('/courts', data)
      navigate('/ambassador/dashboard', {
        state: { success: 'ส่งข้อมูลสนามเรียบร้อยแล้ว รอ Admin ตรวจสอบ' },
      })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setSubmitError(msg ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <TopBar
        title="เพิ่มสนามใหม่"
        breadcrumbs={[
          { label: 'หน้าหลัก', to: '/ambassador/dashboard' },
          { label: 'สนามเทนนิส', to: '/ambassador/dashboard' },
          { label: 'เพิ่มสนามใหม่' },
        ]}
      />

      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Card */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8">
            {/* Stepper */}
            <Stepper current={step} total={STEPS.length} />

            {/* Step title */}
            <h2 className="text-lg font-semibold text-ink mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              ขั้นตอนที่ {step + 1}: {STEPS[step].label}
            </h2>

            {/* Step content */}
            <div className="min-h-[320px]">
              {step === 0 && <StepBasicInfo {...stepProps} />}
              {step === 1 && <StepCourtDetails {...stepProps} />}
              {step === 2 && <StepAmenities watch={watch} setValue={setValue} />}
              {step === 3 && <StepPhotos watch={watch} setValue={setValue} />}
            </div>

            {/* Error */}
            {submitError && (
              <div className="mt-4 rounded-xl bg-danger-light border border-danger/20 px-4 py-3 text-sm text-danger">
                {submitError}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (step === 0 ? navigate('/ambassador/dashboard') : setStep((s) => s - 1))}
              >
                {step === 0 ? 'ยกเลิก' : '← ย้อนกลับ'}
              </Button>

              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  ถัดไป →
                </Button>
              ) : (
                <Button type="submit" loading={submitting} size="lg">
                  ส่งตรวจสอบ 🎾
                </Button>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          <p className="text-center text-xs text-muted mt-3">
            ขั้นตอน {step + 1} จาก {STEPS.length}
          </p>
        </form>
      </div>
    </AppLayout>
  )
}
