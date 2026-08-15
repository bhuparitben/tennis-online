import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import FieldCompareRow from '../../components/court/FieldCompareRow'
import NewCourtDetailCard from '../../components/court/NewCourtDetailCard'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/apiClient'
import type { CourtFormData, SubmissionDetail } from '../../types'
import { submitterName } from '../../types'

// ===== Status badge =====
const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'รอตรวจสอบ', cls: 'bg-amber-100 text-amber-700' },
  verified: { label: 'ยืนยันแล้ว', cls: 'bg-success-light text-success' },
  need_update: { label: 'ต้องแก้ไข', cls: 'bg-danger-light text-danger' },
  approved: { label: 'อนุมัติแล้ว', cls: 'bg-success-light text-success font-semibold' },
  rejected: { label: 'ปฏิเสธ', cls: 'bg-danger-light text-danger' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, cls: 'bg-bg text-muted' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ===== Verification timeline =====
function Timeline({ events }: { events: SubmissionDetail['verifications'] }) {
  if (!events.length) return null
  return (
    <div className="bg-white rounded-2xl border border-border p-6">
      <h3 className="font-semibold text-ink mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
        ประวัติการตรวจสอบ
      </h3>
      <ol className="relative border-l-2 border-border ml-3 space-y-5">
        {events.map((ev) => {
          const { label, cls } = STATUS_LABELS[ev.status] ?? {
            label: ev.status,
            cls: 'bg-bg text-muted',
          }
          return (
            <li key={ev.id} className="ml-4">
              <div
                className="absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white bg-primary"
                style={{ top: 'auto' }}
              />
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                  {label}
                </span>
                <span className="text-xs text-muted">
                  {new Date(ev.verified_at).toLocaleString('th-TH', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
                {ev.verifiedBy && (
                  <span className="text-xs text-muted">· {ev.verifiedBy.full_name}</span>
                )}
              </div>
              {ev.note && <p className="text-sm text-ink">{ev.note}</p>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ===== Main Page =====

type PagePhase = 'creating' | 'loading' | 'ready' | 'error'

export default function VerifyDuplicatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ id?: string }>()

  // Router state (ambassador entry from AddCourtPage)
  const locationState = location.state as {
    matchedCourt?: { id: number; name: string }
    formData?: CourtFormData
  } | null

  const isAdmin = user?.role === 'admin'
  const urlSubmissionId = params.id ? Number(params.id) : null

  const [phase, setPhase] = useState<PagePhase>(urlSubmissionId ? 'loading' : 'creating')
  const [submissionId, setSubmissionId] = useState<number | null>(urlSubmissionId)
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [error, setError] = useState('')

  // Ambassador: verify status form
  const [verifyStatus, setVerifyStatus] = useState<'verified' | 'need_update'>('verified')
  const [verifyNote, setVerifyNote] = useState('')

  // Admin: field choices
  const [adminChoices, setAdminChoices] = useState<Record<string, 'old' | 'new'>>({})
  const [reviewNote, setReviewNote] = useState('')

  const [saving, setSaving] = useState(false)

  // React StrictMode (dev only) intentionally double-invokes effects on
  // mount to surface exactly this kind of bug — without this guard, the
  // ambassador-entry effect below would fire its POST twice and silently
  // create two identical duplicate-submission rows for one "ตรวจสอบ" click.
  const submissionCreationStarted = useRef(false)

  // Load submission helper
  async function loadSubmission(id: number) {
    setPhase('loading')
    try {
      const { data } = await api.get<SubmissionDetail>(`/submissions/${id}`)
      setSubmission(data)

      // Pre-fill admin choices with existing admin_choice values
      const choices: Record<string, 'old' | 'new'> = {}
      for (const fc of data.fieldChanges) {
        choices[fc.field_name] = (fc.admin_choice as 'old' | 'new') ?? 'old'
      }
      setAdminChoices(choices)
      setPhase('ready')
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่')
      setPhase('error')
    }
  }

  useEffect(() => {
    // Admin entry: load by URL param
    if (urlSubmissionId) {
      loadSubmission(urlSubmissionId)
      return
    }

    // Ambassador entry: create submission first
    if (!locationState?.formData || !locationState?.matchedCourt) {
      setError('ไม่พบข้อมูลสนาม กรุณากลับและลองใหม่อีกครั้ง')
      setPhase('error')
      return
    }

    if (submissionCreationStarted.current) return
    submissionCreationStarted.current = true

    api
      .post<{ id: number }>('/submissions/duplicate', {
        matched_court_id: locationState.matchedCourt.id,
        form_data: locationState.formData,
      })
      .then(({ data }) => {
        setSubmissionId(data.id)
        return loadSubmission(data.id)
      })
      .catch((err) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        setError(msg ?? 'เกิดข้อผิดพลาดในการส่งข้อมูล')
        setPhase('error')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== Ambassador: submit verification =====
  async function handleVerify() {
    if (!submissionId) return
    setSaving(true)
    setError('')
    try {
      await api.patch(`/submissions/${submissionId}/verify`, {
        status: verifyStatus,
        note: verifyNote.trim() || undefined,
      })
      navigate('/ambassador/dashboard', {
        state: { success: 'ส่งการยืนยันข้อมูลสนามเรียบร้อยแล้ว Admin จะตรวจสอบต่อไป' },
      })
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  // ===== Admin: approve submission =====
  async function handleApprove() {
    if (!submissionId || !submission) return
    setSaving(true)
    setError('')
    try {
      await api.patch(`/submissions/${submissionId}/approve`, {
        field_choices: adminChoices,
        review_note: reviewNote.trim() || undefined,
      })
      const courtName = (submission.is_duplicate ? submission.matchedCourt?.name : submission.court?.name) ?? ''
      navigate('/admin/submissions', {
        state: {
          success: submission.is_duplicate
            ? `อนุมัติการแก้ไขสนาม "${courtName}" เรียบร้อยแล้ว`
            : `อนุมัติและเผยแพร่สนาม "${courtName}" เรียบร้อยแล้ว`,
        },
      })
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  // ===== Ambassador: inline-edit a "new value" cell in the compare table =====
  async function handleSaveField(fieldName: string, value: string) {
    if (!submissionId) return
    try {
      const { data } = await api.patch<{ is_changed: boolean }>(`/submissions/${submissionId}/field`, {
        field_name: fieldName,
        new_value: value,
      })
      setSubmission((prev) =>
        prev && {
          ...prev,
          fieldChanges: prev.fieldChanges.map((fc) =>
            fc.field_name === fieldName ? { ...fc, new_value: value, is_changed: data.is_changed } : fc,
          ),
        },
      )
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'บันทึกการแก้ไขไม่สำเร็จ')
    }
  }

  // ===== Helper: select all new / all old =====
  function setAllChoices(choice: 'old' | 'new') {
    const next: Record<string, 'old' | 'new'> = {}
    submission?.fieldChanges.forEach((fc) => { next[fc.field_name] = choice })
    setAdminChoices(next)
  }

  // ===== Breadcrumbs =====
  const breadcrumbs = isAdmin
    ? [
        { label: 'Admin', to: '/admin/dashboard' },
        { label: 'รายการส่งตรวจสอบ', to: '/admin/submissions' },
        { label: 'ตรวจสอบข้อมูล' },
      ]
    : [
        { label: 'หน้าหลัก', to: '/ambassador/dashboard' },
        ...(urlSubmissionId ? [] : [{ label: 'เพิ่มสนาม', to: '/ambassador/courts/add' }]),
        { label: 'ตรวจสอบข้อมูลซ้ำ' },
      ]

  // ===== Changed field count =====
  const changedCount = submission?.fieldChanges.filter((f) => f.is_changed).length ?? 0

  // The ambassador can keep editing and re-confirming their own submission
  // right up until an admin approves it — pending, verified, and
  // need_update are all still "in play"; approved is final.
  const canAmbassadorEdit = !isAdmin && submission?.review_status !== 'approved'

  // ===== Render =====
  return (
    <AppLayout>
      <TopBar
        title="ตรวจสอบ / เปรียบเทียบข้อมูลสนาม"
        breadcrumbs={breadcrumbs}
      />

      <div className="max-w-4xl mx-auto space-y-5">

        {/* === Loading / Error states === */}
        {(phase === 'creating' || phase === 'loading') && (
          <div className="bg-white rounded-2xl border border-border p-12 flex flex-col items-center gap-4">
            <svg className="animate-spin w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-muted">
              {phase === 'creating' ? 'กำลังส่งข้อมูลและเปรียบเทียบ...' : 'กำลังโหลดข้อมูลเปรียบเทียบ...'}
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="bg-danger-light border border-danger/20 rounded-2xl p-8 text-center">
            <p className="text-danger font-medium mb-4">{error}</p>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              ← กลับ
            </Button>
          </div>
        )}

        {phase === 'ready' && submission && (
          <>
            {submission.is_duplicate ? (
              <>
                {/* === Banner (duplicate) === */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                  <span className="text-3xl shrink-0">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-ink text-lg mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                      พบข้อมูลสนามซ้ำในระบบ
                    </h2>
                    <p className="text-sm text-muted">
                      ชื่อสนาม:{' '}
                      <strong className="text-ink">{submission.matchedCourt?.name}</strong>
                      {submission.matchedCourt?.province && (
                        <> · {submission.matchedCourt.province.name_th}</>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <StatusBadge status={submission.review_status} />
                      <span className="text-xs text-muted">
                        ส่งเมื่อ{' '}
                        {new Date(submission.created_at).toLocaleDateString('th-TH', {
                          dateStyle: 'medium',
                        })}
                      </span>
                      <span className="text-xs text-muted">
                        โดย {submitterName(submission)}
                      </span>
                      {changedCount > 0 && (
                        <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          {changedCount} ฟิลด์ที่เปลี่ยนแปลง
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* === Comparison table === */}
                <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
                  {/* Table header */}
                  <div
                    className={[
                      'grid text-xs font-semibold text-muted uppercase tracking-wide bg-bg border-b border-border px-4 py-3',
                      isAdmin ? 'grid-cols-[1fr_2fr_2fr_auto]' : 'grid-cols-[1fr_2fr_2fr]',
                    ].join(' ')}
                  >
                    <div>ฟิลด์</div>
                    <div className="pl-4 border-l border-border">ข้อมูลในระบบ (เดิม)</div>
                    <div className="pl-4 border-l border-border">
                      ข้อมูลที่ส่งมา (ใหม่)
                      {canAmbassadorEdit && (
                        <span className="normal-case font-normal text-primary ml-1">(แก้ไขได้)</span>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="pl-4 border-l border-border">เลือก</div>
                    )}
                  </div>

                  {/* Admin quick-select buttons */}
                  {isAdmin && changedCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
                      <span className="text-xs text-muted mr-2">เลือกทั้งหมด:</span>
                      <button
                        type="button"
                        onClick={() => setAllChoices('old')}
                        className="text-xs px-2 py-1 rounded-lg border border-border bg-white hover:border-primary hover:text-primary transition-colors"
                      >
                        ← ข้อมูลเดิม
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllChoices('new')}
                        className="text-xs px-2 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:border-amber-500 hover:text-amber-700 transition-colors"
                      >
                        ข้อมูลใหม่ →
                      </button>
                    </div>
                  )}

                  {/* Rows */}
                  {submission.fieldChanges.map((fc) => (
                    <FieldCompareRow
                      key={fc.id}
                      change={fc}
                      isAdmin={isAdmin}
                      adminChoice={adminChoices[fc.field_name] ?? 'old'}
                      onAdminChoiceChange={(choice) =>
                        setAdminChoices((prev) => ({ ...prev, [fc.field_name]: choice }))
                      }
                      editable={canAmbassadorEdit}
                      onSaveNewValue={handleSaveField}
                    />
                  ))}

                  {submission.fieldChanges.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-muted">
                      ไม่มีข้อมูลเปรียบเทียบ
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* === Banner (new court) === */}
                <div className="bg-primary-light border border-primary/20 rounded-2xl p-5 flex items-start gap-4">
                  <span className="text-3xl shrink-0">🎾</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-ink text-lg mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                      สนามใหม่ — {submission.court?.name ?? 'ไม่พบชื่อสนาม'}
                    </h2>
                    <p className="text-sm text-muted">
                      {submission.court?.province?.name_th}
                      {submission.court?.district?.name_th && <> · {submission.court.district.name_th}</>}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <StatusBadge status={submission.review_status} />
                      <span className="text-xs text-muted">
                        ส่งเมื่อ{' '}
                        {new Date(submission.created_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                      </span>
                      <span className="text-xs text-muted">โดย {submitterName(submission)}</span>
                    </div>
                  </div>
                </div>

                {/* === Full submitted detail === */}
                {submission.court ? (
                  <NewCourtDetailCard court={submission.court} />
                ) : (
                  <div className="bg-white rounded-2xl border border-border p-8 text-center text-sm text-muted">
                    ไม่พบข้อมูลสนามที่ส่งเข้ามา
                  </div>
                )}
              </>
            )}

            {/* === Error alert === */}
            {error && (
              <div className="rounded-xl bg-danger-light border border-danger/20 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {/* === Ambassador action panel === */}
            {canAmbassadorEdit && (
              <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
                <h3 className="font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
                  การยืนยันข้อมูล
                </h3>

                <p className="text-sm text-muted">
                  เลือกสถานะการยืนยันข้อมูลสนามนี้
                </p>

                {/* Status radio */}
                <div className="space-y-3">
                  {[
                    {
                      value: 'verified' as const,
                      label: 'ยืนยันข้อมูล',
                      desc: 'ข้อมูลที่ส่งมาถูกต้อง ขอให้ Admin พิจารณาอัปเดต',
                    },
                    {
                      value: 'need_update' as const,
                      label: 'ต้องแก้ไขข้อมูล',
                      desc: 'ข้อมูลบางส่วนไม่ถูกต้อง จำเป็นต้องแก้ไขก่อน',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={[
                        'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-150',
                        verifyStatus === opt.value
                          ? 'border-primary bg-primary-light'
                          : 'border-border bg-white hover:border-primary/30',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="verifyStatus"
                        value={opt.value}
                        checked={verifyStatus === opt.value}
                        onChange={() => setVerifyStatus(opt.value)}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <p className={`text-sm font-medium ${verifyStatus === opt.value ? 'text-primary' : 'text-ink'}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-muted mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    หมายเหตุเพิ่มเติม
                    <span className="text-muted font-normal ml-1">(ถ้ามี)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={verifyNote}
                    onChange={(e) => setVerifyNote(e.target.value)}
                    placeholder="ระบุรายละเอียดเพิ่มเติม เช่น ข้อมูลที่ไม่ถูกต้อง หรือสิ่งที่ต้องแก้ไข..."
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleVerify}
                    loading={saving}
                    disabled={saving}
                  >
                    ส่งการยืนยัน
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/ambassador/dashboard')}
                    disabled={saving}
                  >
                    กลับหน้าหลัก
                  </Button>
                </div>
              </div>
            )}

            {/* === Ambassador: locked — admin already approved this === */}
            {!isAdmin && submission.review_status === 'approved' && (
              <div className="bg-white rounded-2xl border border-border p-6 text-center">
                <StatusBadge status={submission.review_status} />
                <p className="text-sm text-muted mt-3">
                  ข้อมูลสนามนี้ได้รับการอนุมัติแล้ว
                </p>
                {submission.review_note && (
                  <div className="mt-3 text-sm text-ink bg-bg rounded-xl px-4 py-3 text-left">
                    <strong>หมายเหตุ Admin:</strong> {submission.review_note}
                  </div>
                )}
                <div className="mt-4">
                  <Button variant="secondary" onClick={() => navigate('/ambassador/dashboard')}>
                    กลับหน้าหลัก
                  </Button>
                </div>
              </div>
            )}

            {/* === Admin action panel === */}
            {isAdmin && (
              <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
                <h3 className="font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
                  การตรวจสอบ (Admin)
                </h3>

                {submission.review_status === 'approved' ? (
                  <div className="rounded-xl bg-success-light border border-success/20 px-4 py-3 text-sm text-success">
                    ✓ อนุมัติแล้ว — ข้อมูลสนามถูกอัปเดตในระบบเรียบร้อยแล้ว
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted">
                      {submission.is_duplicate
                        ? 'เลือกว่าจะใช้ข้อมูลใด (เดิม/ใหม่) สำหรับฟิลด์ที่มีการเปลี่ยนแปลง แล้วกด "อนุมัติ" เพื่ออัปเดตข้อมูลสนามและเผยแพร่'
                        : 'ตรวจสอบข้อมูลสนามด้านบนให้ครบถ้วน แล้วกด "อนุมัติ" เพื่อเผยแพร่สนามนี้เข้าสู่ระบบ'}
                    </p>

                    {/* Review note */}
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">
                        หมายเหตุสำหรับ Ambassador
                        <span className="text-muted font-normal ml-1">(ถ้ามี)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="แจ้งเหตุผลหรือข้อความถึง Ambassador..."
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        onClick={handleApprove}
                        loading={saving}
                        disabled={saving}
                      >
                        ✓ อนุมัติและเผยแพร่สนาม
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => navigate('/admin/submissions')}
                        disabled={saving}
                      >
                        กลับรายการ
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* === Timeline === */}
            <Timeline events={submission.verifications} />
          </>
        )}
      </div>
    </AppLayout>
  )
}
