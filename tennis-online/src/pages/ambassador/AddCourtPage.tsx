import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import CourtStepper from '../../components/court/CourtStepper'
import StepBasicInfo from '../../components/court/steps/StepBasicInfo'
import StepCourtDetails from '../../components/court/steps/StepCourtDetails'
import StepAmenities from '../../components/court/steps/StepAmenities'
import StepPhotos from '../../components/court/steps/StepPhotos'
import { EMPTY_COURT_FORM, courtToFormData } from '../../lib/courtFormData'
import type { CourtFormData, CourtWithRelations } from '../../types'
import api, { formatApiError } from '../../lib/apiClient'
import { useAuth } from '../../contexts/AuthContext'

// ===== Step config =====
const STEPS = [
  { label: 'ข้อมูลพื้นฐาน', fields: ['name', 'province_id'] as const },
  { label: 'ข้อมูลสนาม',    fields: [] as const },
  { label: 'บริการเสริม',   fields: [] as const },
  { label: 'รูปภาพ',        fields: [] as const },
]

// ===== Main Page =====
export default function AddCourtPage() {
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  const editingId = params.id ? Number(params.id) : null
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  // An admin manages courts from the submissions list, not the ambassador
  // dashboard, and can edit any court regardless of review status.
  const homePath = isAdmin ? '/admin/submissions' : '/ambassador/dashboard'
  const verifyPath = isAdmin ? '/admin/courts/verify' : '/ambassador/courts/verify'

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [loadingExisting, setLoadingExisting] = useState(!!editingId)
  const [loadError, setLoadError] = useState('')

  // Set when check-duplicate finds a match — instead of redirecting
  // straight to the compare page, this surfaces a notice first so the
  // ambassador isn't yanked away without warning.
  const [duplicateFound, setDuplicateFound] = useState<{
    matchedCourt: { id: number; name: string }
    formData: CourtFormData
  } | null>(null)

  const form = useForm<CourtFormData>({ defaultValues: EMPTY_COURT_FORM })
  const { register, control, handleSubmit, watch, setValue, getValues, trigger, reset, formState: { errors } } = form

  const stepProps = { register, control, errors, watch, setValue }

  // Guards the nav button against a rapid double-click: the "ถัดไป" and
  // final submit buttons sit in the exact same spot in the card, so two
  // clicks landing close together can advance a step AND fire the submit
  // that just appeared underneath the cursor. Locked synchronously (a ref,
  // not state) so the second click — even one that arrives before React has
  // re-rendered — is swallowed instead of hitting whatever button is now there.
  const navLockRef = useRef(false)

  // Edit mode — load the ambassador's own pending court and prefill the form.
  useEffect(() => {
    if (!editingId) return
    let cancelled = false
    api
      .get<CourtWithRelations>(`/courts/${editingId}/manage`)
      .then(({ data }) => {
        if (cancelled) return
        // Ambassadors may only touch their own not-yet-reviewed submission —
        // an admin can fix any court's data regardless of review status.
        if (!isAdmin && data.status !== 'pending') {
          setLoadError('แก้ไขได้เฉพาะสนามที่ยังรอตรวจสอบเท่านั้น — สนามนี้ถูกตรวจสอบไปแล้ว')
          return
        }
        reset(courtToFormData(data))
      })
      .catch((err) => {
        if (cancelled) return
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        setLoadError(msg ?? 'โหลดข้อมูลสนามไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [editingId, reset])

  async function handleNext() {
    if (navLockRef.current) return
    navLockRef.current = true
    try {
      // Validate required fields for step 1
      if (step === 0) {
        const ok = await trigger(['name', 'province_id'])
        if (!ok) return
      }
      setStep((s) => s + 1)
    } finally {
      // Release after the re-render has had time to land, so a fast
      // double-click's second event — now aimed at whatever button took
      // this same spot on the new step — doesn't do anything.
      setTimeout(() => {
        navLockRef.current = false
      }, 400)
    }
  }

  async function onSubmit(data: CourtFormData) {
    if (navLockRef.current) return
    navLockRef.current = true
    setSubmitting(true)
    setSubmitError('')
    try {
      if (editingId) {
        // Editing an already-submitted court (still pending for an
        // ambassador, any status for an admin) — same record, no need to
        // re-run duplicate detection against itself.
        await api.patch(`/courts/${editingId}`, data)
        navigate(homePath, {
          state: { success: 'บันทึกการแก้ไขข้อมูลสนามเรียบร้อยแล้ว' },
        })
        return
      }

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
        // Duplicate detected — surface a notice with an explicit "ตรวจสอบ"
        // action instead of redirecting the ambassador away immediately.
        setDuplicateFound({ matchedCourt: dupResult.matchedCourt, formData: data })
        return
      }

      // 2. No duplicate → create court
      await api.post('/courts', data)
      navigate(homePath, {
        state: {
          success: isAdmin
            ? 'ส่งข้อมูลสนามเรียบร้อยแล้ว รอตรวจสอบ'
            : 'ส่งข้อมูลสนามเรียบร้อยแล้ว รอ Admin ตรวจสอบ',
        },
      })
    } catch (err: unknown) {
      setSubmitError(formatApiError(err, 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'))
    } finally {
      setSubmitting(false)
      navLockRef.current = false
    }
  }

  const pageTitle = editingId ? 'แก้ไขข้อมูลสนาม' : 'เพิ่มสนามใหม่'

  return (
    <AppLayout>
      <TopBar
        title={pageTitle}
        breadcrumbs={[
          { label: isAdmin ? 'Admin' : 'หน้าหลัก', to: homePath },
          { label: isAdmin ? 'รายการส่งตรวจสอบ' : 'สนามเทนนิส', to: homePath },
          { label: pageTitle },
        ]}
      />

      <div className="max-w-3xl mx-auto">
        {loadingExisting ? (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-12 flex flex-col items-center gap-4">
            <svg className="animate-spin w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-muted">กำลังโหลดข้อมูลสนาม...</p>
          </div>
        ) : loadError ? (
          <div className="bg-danger-light border border-danger/20 rounded-2xl p-8 text-center">
            <p className="text-danger font-medium mb-4">{loadError}</p>
            <Button variant="secondary" onClick={() => navigate(homePath)}>
              ← กลับหน้าหลัก
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Card */}
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8">
              {/* Stepper */}
              <CourtStepper labels={STEPS.map((s) => s.label)} current={step} />

              {/* Step title */}
              <h2 className="text-lg font-semibold text-ink mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
                ขั้นตอนที่ {step + 1}: {STEPS[step].label}
              </h2>

              {/* Step content */}
              <div className="min-h-[320px]">
                {step === 0 && <StepBasicInfo {...stepProps} />}
                {step === 1 && <StepCourtDetails {...stepProps} />}
                {step === 2 && <StepAmenities watch={watch} setValue={setValue} />}
                {step === 3 && <StepPhotos watch={watch} setValue={setValue} getValues={getValues} />}
              </div>

              {/* Error */}
              {submitError && (
                <div className="mt-4 rounded-xl bg-danger-light border border-danger/20 px-4 py-3 text-sm text-danger whitespace-pre-line">
                  {submitError}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => (step === 0 ? navigate(homePath) : setStep((s) => s - 1))}
                >
                  {step === 0 ? 'ยกเลิก' : '← ย้อนกลับ'}
                </Button>

                {step < STEPS.length - 1 ? (
                  <Button type="button" onClick={handleNext}>
                    ถัดไป →
                  </Button>
                ) : (
                  <Button type="submit" loading={submitting} size="lg">
                    {editingId ? 'บันทึกการแก้ไข ✓' : 'ส่งตรวจสอบ 🎾'}
                  </Button>
                )}
              </div>
            </div>

            {/* Progress indicator */}
            <p className="text-center text-xs text-muted mt-3">
              ขั้นตอน {step + 1} จาก {STEPS.length}
            </p>
          </form>
        )}
      </div>

      {/* Duplicate-found notice */}
      <Modal open={!!duplicateFound} onClose={() => setDuplicateFound(null)}>
        {duplicateFound && (
          <>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl shrink-0">⚠️</span>
              <div>
                <h3 className="font-semibold text-ink text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                  สนามนี้มีข้อมูลอยู่แล้วในระบบ
                </h3>
                <p className="text-sm text-muted mt-1">
                  พบสนามชื่อ <strong className="text-ink">{duplicateFound.matchedCourt.name}</strong> ในระบบแล้ว
                  กรุณาตรวจสอบเปรียบเทียบข้อมูลก่อนส่ง เผื่อข้อมูลที่มีอยู่ยังไม่ได้อัปเดต
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setDuplicateFound(null)}>
                กลับไปแก้ไข
              </Button>
              <Button
                onClick={() =>
                  navigate(verifyPath, {
                    state: { matchedCourt: duplicateFound.matchedCourt, formData: duplicateFound.formData },
                  })
                }
              >
                ตรวจสอบ →
              </Button>
            </div>
          </>
        )}
      </Modal>
    </AppLayout>
  )
}
