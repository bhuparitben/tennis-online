import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import api from '../../lib/apiClient'

interface SubmissionRow {
  id: number
  is_duplicate: boolean
  submit_status: string
  review_status: string
  created_at: string
  ambassador: { id: number; full_name: string }
  court?: { id: number; name: string } | null
  matchedCourt?: { id: number; name: string } | null
}

const REVIEW_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'รอตรวจสอบ', cls: 'bg-amber-100 text-amber-700' },
  verified: { label: 'Ambassador ยืนยัน', cls: 'bg-blue-100 text-blue-700' },
  need_update: { label: 'ต้องแก้ไข', cls: 'bg-danger-light text-danger' },
  approved: { label: 'อนุมัติแล้ว', cls: 'bg-success-light text-success' },
  rejected: { label: 'ปฏิเสธ', cls: 'bg-danger-light text-danger' },
}

function StatusBadge({ status }: { status: string }) {
  const s = REVIEW_STATUS_MAP[status] ?? { label: status, cls: 'bg-bg text-muted' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

export default function AdminSubmissionsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const successMsg = (location.state as { success?: string } | null)?.success

  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    api
      .get<SubmissionRow[]>('/submissions')
      .then(({ data }) => setRows(data))
      .catch(() => setError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [])

  const filtered =
    filterStatus === 'all' ? rows : rows.filter((r) => r.review_status === filterStatus)

  const pending = rows.filter((r) => r.review_status === 'pending').length

  return (
    <AppLayout>
      <TopBar
        title="รายการส่งตรวจสอบ"
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'รายการส่งตรวจสอบ' },
        ]}
      />

      <div className="max-w-5xl mx-auto space-y-5">
        {/* Success banner */}
        {successMsg && (
          <div className="rounded-xl bg-success-light border border-success/20 px-4 py-3 text-sm text-success">
            ✓ {successMsg}
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'ทั้งหมด', value: rows.length, cls: 'text-ink' },
            { label: 'รอตรวจสอบ', value: pending, cls: 'text-amber-600' },
            { label: 'อนุมัติแล้ว', value: rows.filter((r) => r.review_status === 'approved').length, cls: 'text-success' },
            { label: 'ซ้ำ', value: rows.filter((r) => r.is_duplicate).length, cls: 'text-muted' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-border px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'ทั้งหมด' },
            { value: 'pending', label: 'รอตรวจสอบ' },
            { value: 'verified', label: 'Ambassador ยืนยัน' },
            { value: 'approved', label: 'อนุมัติแล้ว' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilterStatus(tab.value)}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filterStatus === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-white border border-border text-muted hover:text-ink hover:border-primary/30',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {loading && (
            <div className="p-12 flex flex-col items-center gap-3">
              <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-sm text-muted">กำลังโหลด...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-sm text-danger">{error}</div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm text-muted">ไม่มีรายการในสถานะที่เลือก</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <>
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-3 bg-bg border-b border-border text-xs font-semibold text-muted uppercase tracking-wide">
                <div className="w-12 text-center">#</div>
                <div>สนาม</div>
                <div>Ambassador</div>
                <div>ประเภท</div>
                <div>สถานะ</div>
              </div>

              {/* Rows */}
              {filtered.map((row) => {
                const courtName = row.is_duplicate
                  ? row.matchedCourt?.name ?? '—'
                  : row.court?.name ?? '—'
                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-3.5 border-b border-border last:border-0 hover:bg-bg/50 cursor-pointer transition-colors items-center"
                    onClick={() => navigate(`/admin/submissions/${row.id}`)}
                  >
                    <div className="w-12 text-center text-xs text-muted font-mono">
                      #{row.id}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink truncate">{courtName}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {new Date(row.created_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                      </p>
                    </div>
                    <div className="text-sm text-muted truncate">{row.ambassador.full_name}</div>
                    <div>
                      <span
                        className={[
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          row.is_duplicate
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-primary-light text-primary',
                        ].join(' ')}
                      >
                        {row.is_duplicate ? 'ซ้ำ' : 'ใหม่'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={row.review_status} />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/admin/submissions/${row.id}`)
                        }}
                      >
                        ตรวจสอบ
                      </Button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
