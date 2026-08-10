import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/apiClient'
import type { Province, UserProfile } from '../types'
import {
  IconUserCircle, IconCheckCircle, IconAlert, IconEye, IconEyeOff,
} from '../components/ui/icons'

const inp =
  'w-full rounded-xl border border-border px-3 py-2 text-sm text-ink placeholder-muted bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-bg disabled:text-muted'

const TENNIS_ROLES = ['ผู้เล่นทั่วไป', 'โค้ช', 'เจ้าของสนาม/คลับ', 'ผู้จัดการแข่งขัน', 'อื่นๆ']

function apiError(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
  )
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-surface rounded-2xl border border-border p-4 sm:p-5">
      <h2
        className="text-sm font-semibold text-ink mb-4 flex items-center gap-2"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink mb-1">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  )
}

/** Password input with a reveal toggle. */
function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inp + ' pr-10'}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
      >
        {show ? <IconEyeOff className="w-[18px] h-[18px]" /> : <IconEye className="w-[18px] h-[18px]" />}
      </button>
    </div>
  )
}

function Banner({ tone, children }: { tone: 'ok' | 'err'; children: React.ReactNode }) {
  const ok = tone === 'ok'
  return (
    <div
      className={[
        'rounded-xl px-3 py-2 text-xs flex items-start gap-2 border',
        ok ? 'bg-success-light text-success border-success/20' : 'bg-danger-light text-danger border-danger/20',
      ].join(' ')}
    >
      {ok ? (
        <IconCheckCircle className="w-4 h-4 shrink-0 mt-px" />
      ) : (
        <IconAlert className="w-4 h-4 shrink-0 mt-px" />
      )}
      <span>{children}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const isAmbassador = user?.role !== 'admin'

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [provinces, setProvinces] = useState<Province[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Profile form
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', line_id: '',
    province_id: '', district_zone: '', tennis_role: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  // Password form
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const requests: [Promise<{ data: UserProfile }>, Promise<{ data: Province[] }>?] = [
          api.get<UserProfile>('/auth/me'),
        ]
        if (isAmbassador) requests[1] = api.get<Province[]>('/provinces')

        const [me, provs] = await Promise.all(requests)
        if (cancelled) return

        setProfile(me.data)
        setProvinces(provs?.data ?? [])
        setForm({
          full_name: me.data.full_name ?? '',
          email: me.data.email ?? '',
          phone: me.data.phone ?? '',
          line_id: me.data.line_id ?? '',
          province_id: me.data.province_id ? String(me.data.province_id) : '',
          district_zone: me.data.district_zone ?? '',
          tennis_role: me.data.tennis_role ?? '',
        })
      } catch (err) {
        if (!cancelled) setLoadError(apiError(err, 'โหลดข้อมูลไม่สำเร็จ'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isAmbassador])

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    setSavingProfile(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        ...(isAmbassador && {
          phone: form.phone.trim() || null,
          line_id: form.line_id.trim() || null,
          district_zone: form.district_zone.trim() || null,
          tennis_role: form.tennis_role || null,
          ...(form.province_id ? { province_id: Number(form.province_id) } : {}),
        }),
      }
      const { data } = await api.patch<{ profile: UserProfile; token: string }>('/auth/me', payload)

      setProfile(data.profile)
      updateUser(
        {
          name: data.profile.full_name,
          email: data.profile.email ?? '',
          province_id: data.profile.province_id,
          province_name: data.profile.province_name ?? undefined,
        },
        data.token,
      )
      setProfileMsg({ tone: 'ok', text: 'บันทึกข้อมูลเรียบร้อยแล้ว' })
    } catch (err) {
      setProfileMsg({ tone: 'err', text: apiError(err, 'บันทึกข้อมูลไม่สำเร็จ') })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwMsg(null)

    if (pw.next.length < 8) {
      setPwMsg({ tone: 'err', text: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' })
      return
    }
    if (pw.next !== pw.confirm) {
      setPwMsg({ tone: 'err', text: 'รหัสผ่านใหม่กับการยืนยันไม่ตรงกัน' })
      return
    }

    setSavingPw(true)
    try {
      await api.post('/auth/change-password', {
        current_password: pw.current,
        new_password: pw.next,
      })
      setPw({ current: '', next: '', confirm: '' })
      setPwMsg({ tone: 'ok', text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' })
    } catch (err) {
      setPwMsg({ tone: 'err', text: apiError(err, 'เปลี่ยนรหัสผ่านไม่สำเร็จ') })
    } finally {
      setSavingPw(false)
    }
  }

  const homePath = isAmbassador ? '/ambassador/dashboard' : '/admin/dashboard'

  return (
    <AppLayout>
      <TopBar
        title="ข้อมูลส่วนตัว"
        subtitle="แก้ไขข้อมูลบัญชีและเปลี่ยนรหัสผ่าน"
        breadcrumbs={[{ label: 'หน้าหลัก', to: homePath }, { label: 'ข้อมูลส่วนตัว' }]}
      />

      <div className="max-w-3xl mx-auto space-y-5">
        {loading && (
          <div className="bg-surface rounded-2xl border border-border p-8 text-center text-sm text-muted">
            กำลังโหลดข้อมูล…
          </div>
        )}

        {!loading && loadError && <Banner tone="err">{loadError}</Banner>}

        {!loading && !loadError && profile && (
          <>
            {/* ===== Account summary ===== */}
            <div className="bg-surface rounded-2xl border border-border p-4 sm:p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0">
                <IconUserCircle className="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink truncate">{profile.full_name}</p>
                <p className="text-xs text-muted truncate">{profile.email ?? '—'}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-light text-primary">
                    {profile.role === 'admin' ? 'ผู้ดูแลระบบ' : 'TOT Ambassador'}
                  </span>
                  {profile.status && (
                    <span
                      className={[
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
                        profile.status === 'approved'
                          ? 'bg-success-light text-success'
                          : 'bg-warning-light text-warning',
                      ].join(' ')}
                    >
                      {profile.status === 'approved' ? 'อนุมัติแล้ว' : profile.status}
                    </span>
                  )}
                  <span className="text-[11px] text-muted">
                    สมาชิกตั้งแต่{' '}
                    {new Date(profile.created_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>
            </div>

            {/* ===== Profile form ===== */}
            <Card title="แก้ไขข้อมูลส่วนตัว" icon={<IconUserCircle className="w-[18px] h-[18px] text-primary" />}>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="ชื่อ-นามสกุล" required>
                    <input
                      className={inp}
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      required
                      minLength={2}
                    />
                  </Field>
                  <Field label="อีเมล" required hint="ใช้สำหรับเข้าสู่ระบบ">
                    <input
                      type="email"
                      className={inp}
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </Field>
                </div>

                {isAmbassador && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="เบอร์โทรศัพท์">
                        <input
                          className={inp}
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="08X-XXX-XXXX"
                        />
                      </Field>
                      <Field label="LINE ID">
                        <input
                          className={inp}
                          value={form.line_id}
                          onChange={(e) => setForm((f) => ({ ...f, line_id: e.target.value }))}
                          placeholder="เช่น tennis_th"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="จังหวัดที่รับผิดชอบ">
                        <select
                          className={inp}
                          value={form.province_id}
                          onChange={(e) => setForm((f) => ({ ...f, province_id: e.target.value }))}
                        >
                          <option value="">— เลือกจังหวัด —</option>
                          {provinces.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name_th}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="โซน / พื้นที่ย่อย">
                        <input
                          className={inp}
                          value={form.district_zone}
                          onChange={(e) => setForm((f) => ({ ...f, district_zone: e.target.value }))}
                          placeholder="เช่น โซนพระราม 9 – รัชดา"
                        />
                      </Field>
                    </div>

                    <Field label="บทบาทในวงการเทนนิส">
                      <select
                        className={inp}
                        value={form.tennis_role}
                        onChange={(e) => setForm((f) => ({ ...f, tennis_role: e.target.value }))}
                      >
                        <option value="">— เลือกบทบาท —</option>
                        {/* Older rows may hold a value outside this list (e.g. the
                            seeded "Player"); keep it selectable so saving the form
                            without touching this field does not wipe it. */}
                        {form.tennis_role && !TENNIS_ROLES.includes(form.tennis_role) && (
                          <option value={form.tennis_role}>{form.tennis_role}</option>
                        )}
                        {TENNIS_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}

                {profileMsg && <Banner tone={profileMsg.tone}>{profileMsg.text}</Banner>}

                <div className="flex justify-end">
                  <Button type="submit" loading={savingProfile} className="px-5 py-2.5">
                    บันทึกข้อมูล
                  </Button>
                </div>
              </form>
            </Card>

            {/* ===== Password ===== */}
            <Card title="เปลี่ยนรหัสผ่าน" icon={<IconCheckCircle className="w-[18px] h-[18px] text-primary" />}>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <Field label="รหัสผ่านปัจจุบัน" required>
                  <PasswordInput
                    value={pw.current}
                    onChange={(v) => setPw((p) => ({ ...p, current: v }))}
                    autoComplete="current-password"
                    placeholder="กรอกรหัสผ่านที่ใช้อยู่"
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="รหัสผ่านใหม่" required hint="อย่างน้อย 8 ตัวอักษร">
                    <PasswordInput
                      value={pw.next}
                      onChange={(v) => setPw((p) => ({ ...p, next: v }))}
                      autoComplete="new-password"
                      placeholder="รหัสผ่านใหม่"
                    />
                  </Field>
                  <Field label="ยืนยันรหัสผ่านใหม่" required>
                    <PasswordInput
                      value={pw.confirm}
                      onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
                      autoComplete="new-password"
                      placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                    />
                  </Field>
                </div>

                {pwMsg && <Banner tone={pwMsg.tone}>{pwMsg.text}</Banner>}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    loading={savingPw}
                    disabled={!pw.current || !pw.next || !pw.confirm}
                    className="px-5 py-2.5"
                  >
                    เปลี่ยนรหัสผ่าน
                  </Button>
                </div>
              </form>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  )
}
