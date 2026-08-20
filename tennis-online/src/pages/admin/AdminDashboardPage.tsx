import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import api from '../../lib/apiClient'
import type { AmbassadorRow, AmbassadorDetail, Province } from '../../types'
import {
  IconUsers, IconCheckCircle, IconClock, IconAlert, IconSearch,
  IconClose, IconEye, IconEyeOff, IconMail, IconUserCircle, IconCourt,
} from '../../components/ui/icons'

const TENNIS_ROLES = [
  'ผู้เล่นทั่วไป (Player)',
  'โค้ช (Coach)',
  'เจ้าของสนาม/คลับ',
  'ผู้จัดการแข่งขัน',
  'สื่อมวลชน / คอนเทนต์',
  'อื่นๆ',
]

type Tab = 'ambassadors' | 'news' | 'qa'
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'blocked'

const NEWS = [
  { title: 'TOT Junior Championship 2025 เปิดรับสมัคร', date: '8 ส.ค. 2568', views: 312 },
  { title: 'แนวทางการจัดเก็บข้อมูลสนามเทนนิสมาตรฐานใหม่', date: '6 ส.ค. 2568', views: 188 },
  { title: 'Ambassador Meetup ครั้งที่ 3 สรุปผลการประชุม', date: '2 ส.ค. 2568', views: 95 },
]

const QA = [
  { q: 'วิธีลงทะเบียนสนามเทนนิสที่ยังไม่มีในระบบ?', answers: 5, asker: 'ศิริลักษณ์' },
  { q: 'ข้อมูลสนามที่ส่งไปแล้วแต่ยังไม่อนุมัติ ต้องทำอย่างไร?', answers: 3, asker: 'ธนกร' },
  { q: 'เพิ่มรูปถ่ายสนามหลังจากส่งข้อมูลไปแล้วได้ไหม?', answers: 2, asker: 'พิมพ์ชนก' },
]

const inp =
  'w-full rounded-xl border border-border px-3 py-2 text-sm text-ink placeholder-muted bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'

const STATUS_META: Record<AmbassadorRow['status'], { label: string; cls: string }> = {
  approved: { label: 'อนุมัติแล้ว',  cls: 'bg-success-light text-success' },
  pending:  { label: 'รอตรวจสอบ',   cls: 'bg-warning-light text-warning' },
  rejected: { label: 'ปฏิเสธแล้ว',  cls: 'bg-danger-light text-danger' },
  blocked:  { label: 'ถูกบล็อก',    cls: 'bg-ink/10 text-ink' },
}

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
}

function contactOf(a: AmbassadorRow) {
  return [a.phone, a.line_id && `LINE: ${a.line_id}`].filter(Boolean).join(' · ') || '—'
}

// ===== Approve dialog =====
function ApproveDialog({
  target,
  onClose,
  onDone,
}: {
  target: AmbassadorRow
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const [email, setEmail] = useState(target.email ?? '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password && password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }
    setBusy(true)
    try {
      const { data } = await api.patch<{ message: string; can_login: boolean }>(
        `/ambassadors/${target.id}/approve`,
        { email: email.trim(), password: password || undefined, note: note.trim() || undefined },
      )
      onDone(
        data.can_login
          ? `อนุมัติ ${target.full_name} แล้ว — เข้าสู่ระบบได้ทันที`
          : `อนุมัติ ${target.full_name} แล้ว (ยังไม่ได้ตั้งรหัสผ่าน จึงยังเข้าระบบไม่ได้)`,
      )
    } catch (err) {
      setError(apiError(err, 'อนุมัติไม่สำเร็จ'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
            อนุมัติ Ambassador
          </h3>
          <button onClick={onClose} aria-label="ปิด" className="p-1 -mr-1 text-muted hover:text-ink rounded-lg hover:bg-bg">
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted mb-4">
          {target.full_name} · {target.province?.name_th ?? '—'} · {contactOf(target)}
        </p>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              อีเมลสำหรับเข้าสู่ระบบ <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              className={inp}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@tennis-online.th"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">รหัสผ่านเริ่มต้น</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className={inp + ' pr-10'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                autoComplete="new-password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                {showPw ? <IconEyeOff className="w-[18px] h-[18px]" /> : <IconEye className="w-[18px] h-[18px]" />}
              </button>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {target.can_login
                ? 'เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่านเดิม'
                : 'ถ้าเว้นว่าง ผู้สมัครจะยังเข้าสู่ระบบไม่ได้ จนกว่าจะตั้งรหัสผ่านให้'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">หมายเหตุ</label>
            <textarea
              className={inp + ' resize-none'}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="บันทึกภายใน (ถ้ามี)"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-danger/20 bg-danger-light px-3 py-2 text-xs text-danger flex items-start gap-2">
              <IconAlert className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm text-ink hover:bg-bg transition-colors"
            >
              ยกเลิก
            </button>
            <Button type="submit" loading={busy} className="px-4 py-2">
              ยืนยันอนุมัติ
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Labelled read-only value used in the detail modal's summary grid. */
function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-sm text-ink font-medium break-words">{value ?? '—'}</p>
    </div>
  )
}

/** Password input with a reveal toggle, used for the optional reset field. */
function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={inp + ' pr-10'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
      >
        {show ? <IconEyeOff className="w-[18px] h-[18px]" /> : <IconEye className="w-[18px] h-[18px]" />}
      </button>
    </div>
  )
}

// ===== Detail / edit modal =====
function DetailModal({
  target,
  provinces,
  onClose,
  onSaved,
}: {
  target: AmbassadorRow
  provinces: Province[]
  onClose: () => void
  onSaved: (updated: AmbassadorRow, msg: string) => void
}) {
  const [form, setForm] = useState({
    full_name: target.full_name,
    email: target.email ?? '',
    phone: target.phone ?? '',
    line_id: target.line_id ?? '',
    province_id: String(target.province_id ?? target.province?.id ?? ''),
    district_zone: target.district_zone ?? '',
    tennis_role: target.tennis_role ?? '',
    note: target.note ?? '',
  })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const meta = STATUS_META[target.status]

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (form.full_name.trim().length < 2) {
      setError('กรุณากรอกชื่อ-นามสกุลให้ครบถ้วน')
      return
    }
    if (!form.province_id) {
      setError('กรุณาเลือกจังหวัด')
      return
    }
    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) {
        setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('รหัสผ่านใหม่กับการยืนยันไม่ตรงกัน')
        return
      }
    }

    setBusy(true)
    try {
      const { data } = await api.patch<{ message: string; ambassador: AmbassadorRow }>(
        `/ambassadors/${target.id}`,
        {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          line_id: form.line_id.trim() || null,
          province_id: Number(form.province_id),
          district_zone: form.district_zone.trim() || null,
          tennis_role: form.tennis_role || null,
          note: form.note.trim() || null,
          password: newPassword || undefined,
        },
      )
      onSaved(
        data.ambassador,
        newPassword ? `บันทึกข้อมูลของ ${data.ambassador.full_name} และตั้งรหัสผ่านใหม่แล้ว` : `บันทึกข้อมูลของ ${data.ambassador.full_name} แล้ว`,
      )
    } catch (err) {
      setError(apiError(err, 'บันทึกข้อมูลไม่สำเร็จ'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface rounded-2xl border border-border shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0">
              <IconUserCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
                {target.full_name}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mt-0.5 ${meta.cls}`}>
                {meta.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} aria-label="ปิด" className="p-1 -mr-1 text-muted hover:text-ink rounded-lg hover:bg-bg shrink-0">
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Read-only summary — history that isn't meant to be hand-edited */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-bg rounded-xl p-3.5 mb-5">
          <InfoItem label="สมัครเมื่อ" value={new Date(target.created_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })} />
          <InfoItem
            label="อนุมัติเมื่อ"
            value={target.approved_at ? new Date(target.approved_at).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '—'}
          />
          <InfoItem label="อนุมัติโดย" value={target.approvedBy?.name} />
          <InfoItem label="สถานะการเข้าสู่ระบบ" value={target.can_login ? 'ตั้งรหัสผ่านแล้ว' : 'ยังไม่ได้ตั้งรหัสผ่าน'} />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">ชื่อ-นามสกุล <span className="text-danger">*</span></label>
              <input
                className={inp}
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">อีเมล <span className="text-danger">*</span></label>
              <input
                type="email"
                className={inp}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">เบอร์โทรศัพท์</label>
              <input
                className={inp}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="08X-XXX-XXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">LINE ID</label>
              <input
                className={inp}
                value={form.line_id}
                onChange={(e) => setForm((f) => ({ ...f, line_id: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">จังหวัด <span className="text-danger">*</span></label>
              <select
                className={inp}
                value={form.province_id}
                onChange={(e) => setForm((f) => ({ ...f, province_id: e.target.value }))}
                required
              >
                <option value="">— เลือกจังหวัด —</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name_th}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">โซน / พื้นที่ย่อย</label>
              <input
                className={inp}
                value={form.district_zone}
                onChange={(e) => setForm((f) => ({ ...f, district_zone: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">บทบาทในวงการเทนนิส</label>
            <select
              className={inp}
              value={form.tennis_role}
              onChange={(e) => setForm((f) => ({ ...f, tennis_role: e.target.value }))}
            >
              <option value="">— เลือกบทบาท —</option>
              {form.tennis_role && !TENNIS_ROLES.includes(form.tennis_role) && (
                <option value={form.tennis_role}>{form.tennis_role}</option>
              )}
              {TENNIS_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">หมายเหตุภายใน</label>
            <textarea
              className={inp + ' resize-none'}
              rows={2}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="บันทึกสำหรับทีมงาน (ถ้ามี)"
            />
          </div>

          <div className="pt-1 border-t border-border" />

          <div>
            <p className="text-xs font-semibold text-ink mb-2">เปลี่ยนรหัสผ่าน (ถ้าต้องการ)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)" />
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="ยืนยันรหัสผ่านใหม่" />
            </div>
            <p className="text-[11px] text-muted mt-1">เว้นว่างทั้งสองช่องไว้หากไม่ต้องการเปลี่ยนรหัสผ่านเดิม</p>
          </div>

          {error && (
            <div className="rounded-xl border border-danger/20 bg-danger-light px-3 py-2 text-xs text-danger flex items-start gap-2">
              <IconAlert className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm text-ink hover:bg-bg transition-colors"
            >
              ยกเลิก
            </button>
            <Button type="submit" loading={busy} className="px-4 py-2">
              บันทึกการเปลี่ยนแปลง
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Badge for a submission's own review status inside the data-preview list —
// this is CourtSubmission.review_status, not the court's own CourtStatus.
const REVIEW_STATUS_LABEL: Record<string, string> = {
  pending: 'รอตรวจสอบ',
  verified: 'ยืนยันแล้ว',
  approved: 'อนุมัติแล้ว',
  need_update: 'ต้องแก้ไข',
  rejected: 'ปฏิเสธ',
}

type ImpactAction = 'reject' | 'block' | 'reset'

const ACTION_META: Record<ImpactAction, { title: string; confirmLabel: string; endpoint: string; danger?: boolean }> = {
  reject: { title: 'ปฏิเสธใบสมัคร', confirmLabel: 'ยืนยันปฏิเสธ', endpoint: 'reject', danger: true },
  block: { title: 'ระงับการใช้งานชั่วคราว (บล็อก)', confirmLabel: 'ยืนยันบล็อก', endpoint: 'block', danger: true },
  reset: { title: 'ตั้งสถานะกลับเป็นรอตรวจสอบ', confirmLabel: 'ยืนยัน', endpoint: 'reset' },
}

/**
 * Shared confirmation for reject / block / reset-to-pending — before any of
 * these lands, the admin sees exactly what this ambassador has submitted so
 * far (not just their profile), since the decision may hinge on that (e.g.
 * "has this person been adding junk data?"). Reject additionally requires a
 * reason, which is shown back to the ambassador on their read-only banner.
 */
function ImpactDialog({
  target,
  action,
  onClose,
  onDone,
}: {
  target: AmbassadorRow
  action: ImpactAction
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const meta = ACTION_META[action]
  const [detail, setDetail] = useState<AmbassadorDetail | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get<AmbassadorDetail>(`/ambassadors/${target.id}`)
      .then(({ data }) => { if (!cancelled) setDetail(data) })
      .catch((err) => { if (!cancelled) setLoadError(apiError(err, 'โหลดข้อมูลไม่สำเร็จ')) })
    return () => { cancelled = true }
  }, [target.id])

  async function submit() {
    setError('')
    if (action === 'reject' && reason.trim().length < 5) {
      setError('กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร')
      return
    }
    setBusy(true)
    try {
      await api.patch(`/ambassadors/${target.id}/${meta.endpoint}`, action === 'reject' ? { reason: reason.trim() } : action === 'block' ? { note: reason.trim() || undefined } : undefined)
      const doneMsg =
        action === 'reject'
          ? `ปฏิเสธใบสมัครของ ${target.full_name} แล้ว`
          : action === 'block'
            ? `ระงับการใช้งานของ ${target.full_name} แล้ว`
            : `ตั้งสถานะของ ${target.full_name} กลับเป็นรอตรวจสอบแล้ว`
      onDone(doneMsg)
    } catch (err) {
      setError(apiError(err, 'ดำเนินการไม่สำเร็จ'))
    } finally {
      setBusy(false)
    }
  }

  const submissions = detail?.submissions ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface rounded-2xl border border-border shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
            {meta.title}
          </h3>
          <button onClick={onClose} aria-label="ปิด" className="p-1 -mr-1 text-muted hover:text-ink rounded-lg hover:bg-bg">
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted mb-4">
          {target.full_name} · {target.province?.name_th ?? '—'} · {contactOf(target)}
        </p>

        {/* Data preview — what this ambassador has actually submitted so far.
            Reads from CourtSubmission (both new-court and "ซ้ำ" duplicate/update
            proposals), not just courts they personally created — an ambassador
            who only ever files update proposals against other people's courts
            would otherwise show up as having submitted nothing. */}
        <div className="rounded-xl border border-border bg-bg/60 p-3.5 mb-4">
          <p className="text-xs font-semibold text-ink mb-2 flex items-center gap-1.5">
            <IconCourt className="w-4 h-4 text-primary" />
            ข้อมูลสนามที่เคยส่งเข้ามา
          </p>
          {!detail && !loadError && <p className="text-xs text-muted">กำลังโหลด…</p>}
          {loadError && <p className="text-xs text-danger">{loadError}</p>}
          {detail && submissions.length === 0 && (
            <p className="text-xs text-muted">ยังไม่เคยส่งข้อมูลสนามเข้ามา</p>
          )}
          {detail && submissions.length > 0 && (
            <>
              <p className="text-[11px] text-muted mb-2">
                ส่งมาแล้วทั้งหมด {detail._count.submissions} รายการ
              </p>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {submissions.map((s) => {
                  const c = s.court ?? s.matchedCourt
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-xs bg-white rounded-lg border border-border px-2.5 py-1.5">
                      <span className="text-ink font-medium truncate">{c?.name ?? 'ไม่พบชื่อสนาม'}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-light text-primary font-medium">
                          {s.is_duplicate ? 'ซ้ำ/อัปเดต' : 'ใหม่'}
                        </span>
                        {c?.is_published && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success-light text-success font-semibold">เผยแพร่แล้ว</span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg text-muted font-medium">
                          {REVIEW_STATUS_LABEL[s.review_status] ?? s.review_status}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {action === 'reject' && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink mb-1">
              เหตุผลที่ปฏิเสธ <span className="text-danger">*</span>
            </label>
            <textarea
              className={inp + ' resize-none'}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="อธิบายเหตุผลให้ชัดเจน — ระบบจะแสดงข้อความนี้ให้ Ambassador คนนี้เห็นเมื่อเข้าสู่ระบบ"
              required
            />
          </div>
        )}
        {action === 'block' && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink mb-1">หมายเหตุ (ถ้ามี)</label>
            <textarea
              className={inp + ' resize-none'}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="บันทึกภายใน — Ambassador จะไม่เห็นข้อความนี้"
            />
          </div>
        )}
        {action === 'reset' && (
          <p className="text-xs text-muted mb-4">
            บัญชีจะกลับไปอยู่ในสถานะ "รอตรวจสอบ" เหมือนใบสมัครใหม่ — อีเมล/รหัสผ่านเดิมยังใช้ได้เมื่ออนุมัติอีกครั้ง
          </p>
        )}

        {error && (
          <div className="rounded-xl border border-danger/20 bg-danger-light px-3 py-2 text-xs text-danger flex items-start gap-2 mb-4">
            <IconAlert className="w-4 h-4 shrink-0 mt-px" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm text-ink hover:bg-bg transition-colors"
          >
            ยกเลิก
          </button>
          <Button variant={meta.danger ? 'danger' : 'primary'} loading={busy} onClick={submit} className="px-4 py-2">
            {meta.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('ambassadors')
  const [rows, setRows] = useState<AmbassadorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [approving, setApproving] = useState<AmbassadorRow | null>(null)
  const [viewing, setViewing] = useState<AmbassadorRow | null>(null)
  const [impact, setImpact] = useState<{ target: AmbassadorRow; action: ImpactAction } | null>(null)
  const [provinces, setProvinces] = useState<Province[]>([])

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<AmbassadorRow[]>('/ambassadors')
      setRows(data)
      setError('')
    } catch (err) {
      setError(apiError(err, 'โหลดรายชื่อไม่สำเร็จ'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api.get<Province[]>('/provinces').then(({ data }) => setProvinces(data)).catch(() => {})
  }, [load])

  const stats = useMemo(
    () => ({
      total: rows.length,
      approved: rows.filter((r) => r.status === 'approved').length,
      pending: rows.filter((r) => r.status === 'pending').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
      blocked: rows.filter((r) => r.status === 'blocked').length,
    }),
    [rows],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (!q) return true
      return [r.full_name, r.province?.name_th, r.phone, r.line_id, r.email, r.tennis_role]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [rows, search, statusFilter])

  return (
    <AppLayout>
      <TopBar
        title="ระบบผู้ดูแล TOT"
        subtitle="จัดการ Ambassador ข่าวสาร และคำถามจากชุมชน"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Dashboard' }]}
        notifications={stats.pending || undefined}
        actions={
          <Link
            to="/admin/submissions"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            รายการส่งตรวจสอบ
          </Link>
        }
      />

      {/* ===== Stats ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-5">
        {[
          { label: 'ผู้สมัครทั้งหมด', value: stats.total, icon: IconUsers, color: '#2f6bd8' },
          { label: 'อนุมัติแล้ว', value: stats.approved, icon: IconCheckCircle, color: '#1faa55' },
          { label: 'รอตรวจสอบ', value: stats.pending, icon: IconClock, color: '#f0a81b' },
          { label: 'ปฏิเสธแล้ว', value: stats.rejected, icon: IconAlert, color: '#c62828' },
          { label: 'ถูกบล็อก', value: stats.blocked, icon: IconAlert, color: '#475569' },
        ].map((s) => {
          const Glyph = s.icon
          return (
            <div key={s.label} className="bg-surface rounded-2xl border border-border p-3 sm:p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ background: s.color }}
              >
                <Glyph className="w-5 h-5" strokeWidth={2.1} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted truncate">{s.label}</p>
                <p className="text-2xl font-bold text-ink leading-none mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
                  {loading ? '—' : s.value}
                </p>
                <p className="text-[10px] text-muted mt-0.5">คน</p>
              </div>
            </div>
          )
        })}
      </div>

      {flash && (
        <div className="mb-4 rounded-xl border border-success/20 bg-success-light px-3 py-2 text-xs text-success flex items-start gap-2">
          <IconCheckCircle className="w-4 h-4 shrink-0 mt-px" />
          <span className="flex-1">{flash}</span>
          <button onClick={() => setFlash('')} aria-label="ปิด" className="shrink-0">
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-danger/20 bg-danger-light px-3 py-2 text-xs text-danger flex items-start gap-2">
          <IconAlert className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {/* ===== Tabs ===== */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { id: 'ambassadors', label: `TOT Ambassador (${stats.total})` },
          { id: 'news', label: `ข่าวประจำวัน (${NEWS.length})` },
          { id: 'qa', label: `Q&A Community (${QA.length})` },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
              tab === t.id ? 'bg-primary text-white' : 'bg-surface border border-border text-muted hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {/* ===== Ambassadors ===== */}
        {tab === 'ambassadors' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 border-b border-border bg-bg/50">
              <div className="relative flex-1 max-w-sm">
                <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className={inp + ' pl-9'}
                  placeholder="ค้นหาชื่อ จังหวัด เบอร์ติดต่อ…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className={inp + ' sm:w-44'}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="pending">รอตรวจสอบ</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="rejected">ปฏิเสธแล้ว</option>
                <option value="blocked">ถูกบล็อก</option>
              </select>
            </div>

            {loading ? (
              <p className="px-4 py-10 text-center text-sm text-muted">กำลังโหลดข้อมูล…</p>
            ) : visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">
                {rows.length === 0 ? 'ยังไม่มีผู้สมัคร Ambassador' : 'ไม่พบรายการที่ตรงกับเงื่อนไข'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted bg-bg/60 border-b border-border">
                      <th className="px-4 py-2.5 text-left font-medium">ชื่อ-นามสกุล</th>
                      <th className="px-4 py-2.5 text-left font-medium">พื้นที่</th>
                      <th className="px-4 py-2.5 text-left font-medium">บทบาท</th>
                      <th className="px-4 py-2.5 text-left font-medium">ช่องทางติดต่อ</th>
                      <th className="px-4 py-2.5 text-left font-medium">สมัครเมื่อ</th>
                      <th className="px-4 py-2.5 text-left font-medium">สถานะ</th>
                      <th className="px-4 py-2.5 text-right font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a) => {
                      const meta = STATUS_META[a.status]
                      return (
                        <tr key={a.id} className="border-b border-border last:border-0 hover:bg-bg/40">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-ink">{a.full_name}</p>
                            {a.email && <p className="text-xs text-muted">{a.email}</p>}
                          </td>
                          <td className="px-4 py-3 text-muted text-xs">
                            <p>{a.province?.name_th ?? '—'}</p>
                            {a.district_zone && <p className="text-[11px]">{a.district_zone}</p>}
                          </td>
                          <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{a.tennis_role ?? '—'}</td>
                          <td className="px-4 py-3 text-muted text-xs">{contactOf(a)}</td>
                          <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                            {new Date(a.created_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${meta.cls}`}
                              title={a.status === 'rejected' ? (a.reject_reason ?? undefined) : undefined}
                            >
                              {meta.label}
                            </span>
                            {a.status === 'approved' && !a.can_login && (
                              <p className="text-[10px] text-warning mt-1 whitespace-nowrap">ยังไม่ได้ตั้งรหัสผ่าน</p>
                            )}
                            {a.status === 'rejected' && a.reject_reason && (
                              <p className="text-[10px] text-muted mt-1 max-w-[160px] truncate" title={a.reject_reason}>
                                {a.reject_reason}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <button
                                onClick={() => setViewing(a)}
                                className="rounded-lg border border-border text-xs px-3 py-1.5 text-ink hover:bg-bg transition-colors"
                              >
                                รายละเอียด
                              </button>
                              {a.status !== 'approved' && (
                                <button
                                  onClick={() => setApproving(a)}
                                  className="rounded-lg bg-success text-white text-xs px-3 py-1.5 font-semibold hover:opacity-90 transition-opacity"
                                >
                                  อนุมัติ
                                </button>
                              )}
                              {a.status !== 'rejected' && (
                                <button
                                  onClick={() => setImpact({ target: a, action: 'reject' })}
                                  className="rounded-lg border border-border text-xs px-3 py-1.5 text-danger hover:bg-danger-light transition-colors"
                                >
                                  ปฏิเสธ
                                </button>
                              )}
                              {a.status !== 'blocked' && (
                                <button
                                  onClick={() => setImpact({ target: a, action: 'block' })}
                                  title="ระงับการใช้งานชั่วคราว — ไม่ลบข้อมูล"
                                  className="rounded-lg border border-border text-xs px-3 py-1.5 text-ink hover:bg-bg transition-colors"
                                >
                                  บล็อก
                                </button>
                              )}
                              {a.status !== 'pending' && (
                                <button
                                  onClick={() => setImpact({ target: a, action: 'reset' })}
                                  title="ตั้งสถานะกลับเป็นรอตรวจสอบ"
                                  className="rounded-lg border border-border text-xs px-3 py-1.5 text-muted hover:bg-bg transition-colors"
                                >
                                  ตั้งเป็นรอตรวจสอบ
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ===== News (mockup) ===== */}
        {tab === 'news' && (
          <div className="divide-y divide-border">
            <p className="px-4 py-2 text-[11px] text-muted bg-bg/60 flex items-center gap-1.5">
              <IconAlert className="w-3.5 h-3.5" /> ส่วนนี้ยังเป็น mockup — ยังไม่เชื่อมต่อฐานข้อมูล
            </p>
            {NEWS.map((n) => (
              <div key={n.title} className="flex items-center justify-between px-4 py-4 hover:bg-bg/40">
                <div>
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  <p className="text-xs text-muted mt-0.5">{n.date}</p>
                </div>
                <span className="text-xs text-muted">{n.views} ครั้ง</span>
              </div>
            ))}
          </div>
        )}

        {/* ===== Q&A (mockup) ===== */}
        {tab === 'qa' && (
          <div className="divide-y divide-border">
            <p className="px-4 py-2 text-[11px] text-muted bg-bg/60 flex items-center gap-1.5">
              <IconAlert className="w-3.5 h-3.5" /> ส่วนนี้ยังเป็น mockup — ยังไม่เชื่อมต่อฐานข้อมูล
            </p>
            {QA.map((q) => (
              <div key={q.q} className="flex items-center justify-between px-4 py-4 hover:bg-bg/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{q.q}</p>
                  <p className="text-xs text-muted mt-0.5">โดย {q.asker} · {q.answers} คำตอบ</p>
                </div>
                <IconMail className="w-4 h-4 text-muted shrink-0 ml-4" />
              </div>
            ))}
          </div>
        )}
      </div>

      {approving && (
        <ApproveDialog
          target={approving}
          onClose={() => setApproving(null)}
          onDone={(msg) => {
            setApproving(null)
            setFlash(msg)
            load()
          }}
        />
      )}

      {viewing && (
        <DetailModal
          target={viewing}
          provinces={provinces}
          onClose={() => setViewing(null)}
          onSaved={(updated, msg) => {
            setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))
            setViewing(null)
            setFlash(msg)
          }}
        />
      )}

      {impact && (
        <ImpactDialog
          target={impact.target}
          action={impact.action}
          onClose={() => setImpact(null)}
          onDone={(msg) => {
            setImpact(null)
            setFlash(msg)
            load()
          }}
        />
      )}
    </AppLayout>
  )
}
