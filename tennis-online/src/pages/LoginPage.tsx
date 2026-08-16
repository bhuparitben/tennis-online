import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', role: 'ambassador' as 'admin' | 'ambassador' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password, form.role)
      navigate(form.role === 'admin' ? '/admin/dashboard' : '/ambassador/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/tennis%20online%20thailand%20logo.PNG"
            alt="Tennis Online Thailand"
            className="w-40 h-40 mx-auto object-contain -mb-2"
          />
          <p className="text-muted text-sm mt-1">ระบบ Ambassador Portal</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-border p-8">
          <h2 className="text-lg font-semibold text-ink mb-6">เข้าสู่ระบบ</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Tabs */}
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              {(['ambassador', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: r }))}
                  className={[
                    'flex-1 py-2 font-medium transition-colors',
                    form.role === r
                      ? 'bg-primary text-white'
                      : 'bg-white text-muted hover:bg-bg',
                  ].join(' ')}
                >
                  {r === 'ambassador' ? 'Ambassador' : 'Admin'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-ink">อีเมล</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={form.role === 'admin' ? 'admin@tennis-online.th' : 'ambassador@tennis-online.th'}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-ink">รหัสผ่าน</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? (
                    /* eye-off */
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    /* eye */
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger-light px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full justify-center py-2.5">
              เข้าสู่ระบบ
            </Button>
          </form>

          <p className="text-center text-xs text-muted mt-6">
            ยังไม่เป็น Ambassador?{' '}
            <a href="/signup" className="text-primary hover:underline">สมัครที่นี่</a>
          </p>
        </div>

        {/* Dev hint */}
        {import.meta.env.DEV && (
          <div className="mt-4 p-3 bg-warning-light rounded-lg text-xs text-warning border border-warning/20">
            <p className="font-semibold mb-1">Dev accounts:</p>
            <p>Admin: admin@tennis-online.th / admin123</p>
            <p>Ambassador: ambassador@tennis-online.th / ambassador123</p>
          </div>
        )}
      </div>
    </div>
  )
}
