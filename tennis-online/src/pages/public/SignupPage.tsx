import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/apiClient'
import type { Province } from '../../types'
import { IconCheckCircle, IconAlert, IconEye, IconEyeOff } from '../../components/ui/icons'

const STEPS = [
  { n: 1, label: 'สมัครแสดงความสนใจ', desc: 'กรอกข้อมูลเบื้องต้น ชื่อ จังหวัด บทบาท', active: true },
  { n: 2, label: 'ทีมงานติดต่อกลับ', desc: 'สัมภาษณ์สั้นๆ เพื่อชี้แจงเป้าหมาย', active: false },
  { n: 3, label: 'รวบรวมสำรวจข้อมูล', desc: 'เริ่มทำแผนที่สังเขปของคอร์ต คลับ', active: false },
  { n: 4, label: 'รับการแต่งตั้ง', desc: 'ประกาศขึ้นสถานะอย่างเป็นทางการ', accent: true },
]

const ZONES = [
  { zone: 'โซนเมืองทอง – แจ้งวัฒนะ', sub: 'LTAT, สตูดิโอสื่อมวลชน TOT', courts: '18 คอร์ท' },
  { zone: 'โซนสุขุมวิท – พระราม 4', sub: 'The Polo Club, Spin & Slice', courts: '24 คอร์ท' },
  { zone: 'โซนพระราม 9 – รัชดา', sub: 'สนามในร่ม Indoor Tennis', courts: '15 คอร์ท' },
]

const TENNIS_ROLES = [
  'ผู้เล่นทั่วไป (Player)',
  'โค้ช (Coach)',
  'เจ้าของสนาม/คลับ',
  'ผู้จัดการแข่งขัน',
  'สื่อมวลชน / คอนเทนต์',
  'อื่นๆ',
]

const inp =
  'w-full rounded-xl border border-border px-3 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors bg-white disabled:bg-bg disabled:text-muted'

const BANGKOK = 'กรุงเทพมหานคร'

/** Password input with a reveal toggle, matching LoginPage. */
function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  hint?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-semibold text-ink mb-1">
        {label} <span className="text-danger">*</span>
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={inp + ' pr-10'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          maxLength={72}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
        >
          {show ? <IconEyeOff className="w-[18px] h-[18px]" /> : <IconEye className="w-[18px] h-[18px]" />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  )
}

export default function SignupPage() {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    province_id: '',
    district_zone: '',
    tennis_role: '',
    phone: '',
    line_id: '',
    consent: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get<Province[]>('/provinces')
      .then(({ data }) => {
        if (cancelled) return
        setProvinces(data)
        // Default to Bangkok so the zone picker matches the panel on the left.
        const bkk = data.find((p) => p.name_th === BANGKOK)
        if (bkk) setForm((f) => (f.province_id ? f : { ...f, province_id: String(bkk.id) }))
      })
      .catch(() => {
        if (!cancelled) setError('โหลดรายชื่อจังหวัดไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedProvince = provinces.find((p) => String(p.id) === form.province_id)
  const isBangkok = selectedProvince?.name_th === BANGKOK

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (form.full_name.trim().length < 2) {
      setError('กรุณากรอกชื่อ-นามสกุลให้ครบถ้วน')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('กรุณากรอกอีเมลให้ถูกต้อง')
      return
    }
    if (form.password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }
    if (form.password !== form.confirm_password) {
      setError('รหัสผ่านกับการยืนยันรหัสผ่านไม่ตรงกัน')
      return
    }
    if (!form.province_id) {
      setError('กรุณาเลือกจังหวัด')
      return
    }
    if (!form.phone.trim() && !form.line_id.trim()) {
      setError('กรุณากรอกเบอร์โทรศัพท์หรือ LINE ID อย่างน้อยหนึ่งช่องทาง')
      return
    }
    if (!form.consent) {
      setError('กรุณายอมรับเงื่อนไขการเก็บข้อมูลก่อนส่งแบบฟอร์ม')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/auth/register-interest', {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        province_id: Number(form.province_id),
        district_zone: form.district_zone.trim() || undefined,
        tennis_role: form.tennis_role || undefined,
        phone: form.phone.trim() || undefined,
        line_id: form.line_id.trim() || undefined,
        consent_accepted: form.consent,
      })
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'ส่งแบบฟอร์มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <div className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎾</span>
            <div>
              <p className="font-bold text-primary text-lg leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>TENNIS ONLINE</p>
              <p className="text-xs text-muted tracking-widest">THAILAND</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm text-muted">
            <span className="hover:text-ink cursor-pointer">หน้าแรก</span>
            <span className="hover:text-ink cursor-pointer">เทนนิสไทย</span>
            <span className="hover:text-ink cursor-pointer">คลิปวิดีโอ</span>
            <span className="hover:text-ink cursor-pointer">ถาม-ตอบ Q&A</span>
            <span className="text-primary font-semibold border-b-2 border-primary pb-0.5 cursor-pointer">TOT Ambassador</span>
            <span className="hover:text-ink cursor-pointer">เกี่ยวกับเรา</span>
          </nav>
          <Link to="/login" className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-success text-white px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-7">
        {/* Process steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col items-center gap-2">
              <div
                className={[
                  'w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold text-sm',
                  (s as { accent?: boolean }).accent ? 'border-danger text-danger' : s.active ? 'border-primary bg-primary text-white' : 'border-border text-muted',
                ].join(' ')}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {s.n}
              </div>
              <p className="text-sm font-semibold text-ink">{s.label}</p>
              <p className="text-xs text-muted">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regional Status */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest">Regional Status</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success-light text-success">🗄 Realtime Database</span>
            </div>
            <h2 className="text-xl font-bold text-ink mb-4" style={{ fontFamily: 'var(--font-heading)' }}>ข้อมูลเครือข่ายทุกภูมิภาค</h2>
            <div className="rounded-xl border border-primary/20 bg-primary-light/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">📍 กรุงเทพมหานคร</p>
                <span className="text-xs text-muted">6 โซน</span>
              </div>
              <p className="text-xs text-muted">ศูนย์กลางหลัก TOT Ambassador ครอบคลุม 6 โซนย่อยสำคัญ</p>
              {ZONES.map((z) => (
                <div key={z.zone} className="flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-ink">{z.zone}</p>
                    <p className="text-xs text-muted">{z.sub}</p>
                  </div>
                  <span className="bg-primary-light text-primary rounded-lg px-2 py-1 text-xs font-medium">{z.courts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Signup Form */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            {done ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-success-light text-success flex items-center justify-center mx-auto mb-4">
                  <IconCheckCircle className="w-9 h-9" strokeWidth={2} />
                </div>
                <h2 className="text-xl font-bold text-ink mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  ส่งแบบฟอร์มเรียบร้อยแล้ว
                </h2>
                <p className="text-sm text-muted leading-relaxed max-w-sm mx-auto">
                  ขอบคุณที่สนใจร่วมเป็น TOT Founding Ambassador
                  <br />
                  ทีมงานจะติดต่อกลับทางเบอร์โทรหรือ LINE ที่คุณให้ไว้ ภายใน 2–3 วันทำการ
                </p>
                <div className="mt-6 rounded-xl bg-bg border border-border p-4 text-left text-xs text-muted space-y-1.5 max-w-sm mx-auto">
                  <p className="font-semibold text-ink text-sm mb-1">ขั้นตอนถัดไป</p>
                  <p>1. ทีมงานตรวจสอบข้อมูลและติดต่อกลับ</p>
                  <p>2. สัมภาษณ์สั้นๆ เพื่อชี้แจงบทบาทและเป้าหมาย</p>
                  <p>3. เมื่อได้รับอนุมัติ เข้าสู่ระบบได้ทันทีด้วยอีเมลและรหัสผ่านที่ตั้งไว้</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDone(false)
                    setForm((f) => ({
                      ...f, full_name: '', email: '', password: '', confirm_password: '',
                      district_zone: '', tennis_role: '', phone: '', line_id: '',
                    }))
                  }}
                  className="mt-5 text-sm text-primary hover:underline font-medium"
                >
                  สมัครเพิ่มอีกคน
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-ink mb-1" style={{ fontFamily: 'var(--font-heading)' }}>✨ แบบฟอร์มแสดงความสนใจเข้าร่วมโครงการ</h2>
                <p className="text-xs text-muted mb-5">กรอกข้อมูลเพื่อร่วมสมัครเป็น Founding Ambassador ทีมงานจะติดต่อกลับภายใน 2-3 วันทำการ</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">ชื่อ-นามสกุลจริง <span className="text-danger">*</span></label>
                      <input
                        className={inp}
                        placeholder="ป้อนชื่อและนามสกุลของคุณ..."
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
                        placeholder="name@example.com"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        required
                        maxLength={150}
                      />
                      <p className="text-[11px] text-muted mt-1">ใช้เป็นชื่อผู้ใช้เมื่อได้รับอนุมัติ</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PasswordField
                      label="ตั้งรหัสผ่าน"
                      value={form.password}
                      onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                      placeholder="อย่างน้อย 8 ตัวอักษร"
                      autoComplete="new-password"
                    />
                    <PasswordField
                      label="ยืนยันรหัสผ่าน"
                      value={form.confirm_password}
                      onChange={(v) => setForm((f) => ({ ...f, confirm_password: v }))}
                      placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                      autoComplete="new-password"
                    />
                  </div>
                  <p className="text-[11px] text-muted -mt-2">
                    ใช้เข้าสู่ระบบทันทีที่ทีมงานอนุมัติ — ยังไม่ได้รับอนุมัติจะยังเข้าสู่ระบบไม่ได้
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">จังหวัดประจำพื้นที่ <span className="text-danger">*</span></label>
                      <select
                        className={inp}
                        value={form.province_id}
                        onChange={(e) => setForm((f) => ({ ...f, province_id: e.target.value, district_zone: '' }))}
                        disabled={!provinces.length}
                        required
                      >
                        <option value="">{provinces.length ? '— เลือกจังหวัด —' : 'กำลังโหลด…'}</option>
                        {provinces.map((p) => (
                          <option key={p.id} value={p.id}>{p.name_th}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      {isBangkok ? 'ระบุโซนพื้นที่ในกรุงเทพมหานคร' : 'ระบุอำเภอ / พื้นที่ที่ดูแล'}
                    </label>
                    {isBangkok ? (
                      <select
                        className={inp}
                        value={form.district_zone}
                        onChange={(e) => setForm((f) => ({ ...f, district_zone: e.target.value }))}
                      >
                        <option value="">— เลือกโซน —</option>
                        {ZONES.map((z) => (
                          <option key={z.zone} value={z.zone}>{z.zone}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={inp}
                        placeholder="เช่น อ.เมือง, เขตเทศบาล"
                        value={form.district_zone}
                        onChange={(e) => setForm((f) => ({ ...f, district_zone: e.target.value }))}
                      />
                    )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">บทบาทของคุณ</label>
                      <select
                        className={inp}
                        value={form.tennis_role}
                        onChange={(e) => setForm((f) => ({ ...f, tennis_role: e.target.value }))}
                      >
                        <option value="">— เลือกบทบาท —</option>
                        {TENNIS_ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">เบอร์โทรศัพท์ <span className="text-danger">*</span></label>
                      <input
                        className={inp}
                        placeholder="เช่น 089-1234567"
                        maxLength={20}
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">LINE ID</label>
                    <input
                      className={inp}
                      placeholder="เช่น tennis_th (กรอกอย่างน้อยหนึ่งช่องทางติดต่อ)"
                      maxLength={100}
                      value={form.line_id}
                      onChange={(e) => setForm((f) => ({ ...f, line_id: e.target.value }))}
                    />
                  </div>

                  <label className="flex items-start gap-2 text-xs text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-primary"
                      checked={form.consent}
                      onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                    />
                    <span>ข้าพเจ้ายินยอมให้ TOT เก็บและใช้ชื่อ จังหวัด และช่องทางติดต่อ เพื่อติดต่อกลับและประสานงานโครงการ TOT Ambassador</span>
                  </label>

                  {error && (
                    <div className="rounded-xl border border-danger/20 bg-danger-light px-3 py-2 text-xs text-danger flex items-start gap-2">
                      <IconAlert className="w-4 h-4 shrink-0 mt-px" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-primary text-white font-semibold py-3 text-sm hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'กำลังส่งข้อมูล…' : '🚀 ส่งรายละเอียดและลงทะเบียนสมัครความร่วมมือ'}
                  </button>
                </form>
              </>
            )}

            <p className="text-center text-xs text-muted mt-4">
              มีบัญชีแล้ว? <Link to="/login" className="text-primary hover:underline font-medium">เข้าสู่ระบบที่นี่</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
