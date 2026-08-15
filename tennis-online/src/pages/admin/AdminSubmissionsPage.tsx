import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import api from '../../lib/apiClient'
import { submitterName } from '../../types'

interface SubmissionRow {
  id: number
  is_duplicate: boolean
  submit_status: string
  review_status: string
  created_at: string
  ambassador: { id: number; full_name: string } | null
  adminSubmitter: { id: number; name: string } | null
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
  const [deleteTarget, setDeleteTarget] = useState<SubmissionRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    loadRows()
  }, [])

  function loadRows() {
    setLoading(true)
    api
      .get<SubmissionRow[]>('/submissions')
      .then(({ data }) => setRows(data))
      .catch(() => setError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }

  function editTargetCourtId(row: SubmissionRow): number | null {
    // A duplicate/update proposal edits the real matched court directly;
    // a brand-new-court proposal edits the court it created.
    return row.is_duplicate ? row.matchedCourt?.id ?? null : row.court?.id ?? null
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setActionError('')
    try {
      await api.delete(`/submissions/${deleteTarget.id}`)
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setActionError(msg ?? 'ลบไม่สำเร็จ')
    } finally {
      setDeleting(false)
    }
  }

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
        actions={
          <Button size="sm" onClick={() => navigate('/admin/courts/add')}>
            + เพิ่มสนามใหม่
          </Button>
        }
      />

      <div className="max-w-5xl mx-auto space-y-5">
        {/* Success banner */}
        {successMsg && (
          <div className="rounded-xl bg-success-light border border-success/20 px-4 py-3 text-sm text-success">
            ✓ {successMsg}
          </div>
        )}
        {actionError && (
          <div className="rounded-xl bg-danger-light border border-danger/20 px-4 py-3 text-sm text-danger">
            {actionError}
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
                <div>ผู้ส่ง</div>
                <div>ประเภท</div>
                <div>สถานะ</div>
              </div>

              {/* Rows */}
              {filtered.map((row) => {
                const courtName = row.is_duplicate
                  ? row.matchedCourt?.name ?? '—'
                  : row.court?.name ?? '—'
                const courtId = editTargetCourtId(row)
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
                    <div className="text-sm text-muted truncate">{submitterName(row)}</div>
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
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={row.review_status} />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/admin/submissions/${row.id}`)}
                      >
                        ตรวจสอบ
                      </Button>
                      <button
                        type="button"
                        title="แก้ไขข้อมูลสนามโดยตรง"
                        disabled={!courtId}
                        onClick={() => courtId && navigate(`/admin/courts/edit/${courtId}`)}
                        className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        title="ลบ"
                        onClick={() => setDeleteTarget(row)}
                        className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-light transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
        {deleteTarget && (
          <>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl shrink-0">🗑️</span>
              <div>
                <h3 className="font-semibold text-ink text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                  ยืนยันการลบ
                </h3>
                <p className="text-sm text-muted mt-1">
                  {deleteTarget.is_duplicate ? (
                    <>
                      จะลบเฉพาะคำขอตรวจสอบข้อมูลซ้ำนี้ (#{deleteTarget.id}) — สนามจริง{' '}
                      <strong className="text-ink">{deleteTarget.matchedCourt?.name}</strong> จะไม่ถูกลบ
                    </>
                  ) : (
                    <>
                      จะลบสนาม <strong className="text-ink">{deleteTarget.court?.name}</strong> ทั้งหมด
                      พร้อมข้อมูลราคา รูปภาพ และคำขอที่เกี่ยวข้อง — ย้อนกลับไม่ได้
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                ยกเลิก
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} loading={deleting}>
                ลบ
              </Button>
            </div>
          </>
        )}
      </Modal>
    </AppLayout>
  )
}
