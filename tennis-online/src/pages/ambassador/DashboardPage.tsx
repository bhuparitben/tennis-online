import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { useLocation, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import ImagePlaceholder from '../../components/ui/ImagePlaceholder'
import Toast from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import api, { resolveAssetUrl } from '../../lib/apiClient'
import type { IconProps } from '../../components/ui/icons'
import type { SubmissionListItem } from '../../types'
import {
  IconFileText, IconClock, IconCheckCircle, IconCalendarCheck,
  IconPlusCircle, IconSearch, IconUsers, IconImage, IconList, IconInfo,
  IconMegaphone, IconEdit, IconSend, IconAlert, IconChevronRight, IconTrash,
} from '../../components/ui/icons'

type Icon = ComponentType<IconProps>

// ===== Tone palette shared by stats / actions / shortcuts =====
const TONES = {
  blue:   { solid: '#2f6bd8', soft: '#e8f0fd', text: '#2f6bd8' },
  amber:  { solid: '#f0a81b', soft: '#fef4e2', text: '#c9820a' },
  green:  { solid: '#1faa55', soft: '#e6f6ec', text: '#1faa55' },
  purple: { solid: '#8b5cf6', soft: '#f1ecfe', text: '#7c4ff0' },
  red:    { solid: '#dc2626', soft: '#fde8e8', text: '#dc2626' },
  slate:  { solid: '#475569', soft: '#eef1f5', text: '#475569' },
} as const
type Tone = keyof typeof TONES

// ===== Static content (missions / announcements / workflow are portal
// navigation and guidance copy, not data — no DB table backs these) =====
const MISSIONS: { to: string; icon: Icon; title: string; desc: string; tone: Tone; filled?: boolean }[] = [
  { to: '/ambassador/courts/add',     icon: IconPlusCircle,    title: 'เพิ่มสนามใหม่',        desc: 'เพิ่มข้อมูลสนามแห่งใหม่',        tone: 'blue',   filled: true },
  { to: '/ambassador/courts/search',  icon: IconSearch,        title: 'ตรวจสอบข้อมูลสนาม',   desc: 'ช่วยตรวจสอบและอัปเดตข้อมูล',    tone: 'blue' },
  { to: '/ambassador/events/submit',  icon: IconCalendarCheck, title: 'ส่งการแข่งขัน/กิจกรรม', desc: 'แจ้งการแข่งขันหรือกิจกรรม',     tone: 'green' },
  { to: '/ambassador/recommend',      icon: IconUsers,         title: 'แนะนำบุคคล/คลับ',      desc: 'เชิญบุคคลหรือคลับเข้าร่วมเครือข่าย', tone: 'amber' },
  { to: '/ambassador/stories/submit', icon: IconImage,         title: 'ส่งเรื่องราว',          desc: 'แบ่งปันเรื่องราวจากสนาม',        tone: 'purple' },
]

const SHORTCUTS: { to?: string; icon: Icon; label: string; tone: Tone; filled?: boolean }[] = [
  { to: '/ambassador/courts/add',     icon: IconPlusCircle,    label: 'เพิ่มสนามใหม่',        tone: 'blue', filled: true },
  { to: '/ambassador/courts/search',  icon: IconSearch,        label: 'ตรวจสอบข้อมูลสนาม',   tone: 'blue' },
  { to: '/ambassador/events/submit',  icon: IconCalendarCheck, label: 'ส่งการแข่งขัน / กิจกรรม', tone: 'green' },
  { to: '/ambassador/recommend',      icon: IconUsers,         label: 'แนะนำบุคคล / คลับ',    tone: 'amber' },
  { to: '/ambassador/stories/submit', icon: IconImage,         label: 'ส่งเรื่องราว / ภาพ',   tone: 'purple' },
  {                                   icon: IconList,          label: 'รายการของฉัน',         tone: 'blue' },
  {                                   icon: IconInfo,          label: 'คู่มือการใช้งาน',       tone: 'slate' },
]

// Mirrors the real ReviewStatus enum in prisma/schema.prisma — every value
// the API can return must be covered here or a row would render unstyled.
const STATUS_MAP: Record<SubmissionListItem['review_status'], { label: string; cls: string; icon: Icon }> = {
  pending:     { label: 'รอตรวจสอบ',    cls: 'bg-warning-light text-warning', icon: IconClock },
  verified:    { label: 'ยืนยันแล้ว',    cls: 'bg-blue-100 text-blue-700',     icon: IconCheckCircle },
  need_update: { label: 'ต้องแก้ไข',     cls: 'bg-danger-light text-danger',   icon: IconAlert },
  approved:    { label: 'อนุมัติแล้ว',   cls: 'bg-success-light text-success', icon: IconCheckCircle },
  rejected:    { label: 'ปฏิเสธ',        cls: 'bg-danger-light text-danger',   icon: IconAlert },
}

const ANNOUNCEMENTS = [
  {
    urgent: true,
    title: 'อัปเดตขั้นตอนการส่งข้อมูลสนาม',
    desc: 'ตั้งแต่ 1 มิ.ย. 2567 เป็นต้นไป กรุณาแนบรูปภาพหน้าสนามอย่างน้อย 4 ภาพ',
    date: '20 พ.ค. 2567',
  },
  {
    urgent: false,
    title: 'กิจกรรม Tennis Community Meetup #2',
    desc: 'ร่วมพบปะและแลกเปลี่ยนไอเดียพัฒนาเทนนิสไทย',
    date: '16 พ.ค. 2567',
  },
  {
    urgent: false,
    title: 'ระบบใหม่: ตรวจสอบข้อมูลได้เร็วขึ้น',
    desc: 'เพิ่มการแจ้งเตือนเมื่อมีการอัปเดตสถานะรายการ',
    date: '10 พ.ค. 2567',
  },
]

const WORKFLOW: { n: number; icon: Icon; title: string; desc: string; tone: Tone }[] = [
  { n: 1, icon: IconEdit,        title: 'กรอกข้อมูล',    desc: 'กรอกข้อมูลให้ครบถ้วนตามหมวดหมู่', tone: 'blue' },
  { n: 2, icon: IconImage,       title: 'แนบภาพ',        desc: 'อัปโหลดรูปภาพที่เกี่ยวข้อง',      tone: 'blue' },
  { n: 3, icon: IconSend,        title: 'ส่งตรวจสอบ',    desc: 'ทีมงานตรวจสอบความถูกต้อง',       tone: 'blue' },
  { n: 4, icon: IconCheckCircle, title: 'ทีม TOT อนุมัติ', desc: 'ข้อมูลถูกเผยแพร่ในระบบ',         tone: 'green' },
]

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
}

// ===== Pieces =====

function ToneGlyph({
  icon: Glyph,
  tone,
  filled,
  size = 'w-12 h-12',
  glyph = 'w-[22px] h-[22px]',
  shape = 'square',
}: {
  icon: Icon
  tone: Tone
  filled?: boolean
  size?: string
  glyph?: string
  /** `none` drops the tinted container and shows the bare coloured icon. */
  shape?: 'square' | 'circle' | 'none'
}) {
  const t = TONES[tone]
  const bare = shape === 'none'

  return (
    <div
      className={[
        size,
        bare ? '' : shape === 'circle' ? 'rounded-full' : 'rounded-xl',
        'flex items-center justify-center shrink-0',
      ].join(' ')}
      style={
        bare
          ? { color: t.text }
          : filled
            ? { background: t.solid, color: '#fff' }
            : { background: t.soft, color: t.text }
      }
    >
      <Glyph className={glyph} strokeWidth={filled ? 2.1 : bare ? 1.9 : 1.8} />
    </div>
  )
}

export default function DashboardPage() {
  const location = useLocation()
  // Seeded once from the redirect state (e.g. right after saving a court) —
  // held in its own state so the toast can be dismissed independently of
  // location.state, which has no "consumed" concept of its own.
  const [toastMsg, setToastMsg] = useState(
    (location.state as { success?: string } | null)?.success ?? null,
  )

  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<SubmissionListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get<SubmissionListItem[]>('/submissions')
      .then(({ data }) => {
        if (!cancelled) setSubmissions(data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err, 'โหลดรายการล่าสุดไม่สำเร็จ'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const total = submissions.length
    const pending = submissions.filter((s) => s.review_status === 'pending').length
    const reviewed = submissions.filter((s) => s.review_status === 'verified' || s.review_status === 'approved').length
    const needUpdate = submissions.filter((s) => s.review_status === 'need_update').length
    return [
      { label: 'ข้อมูลที่ส่งทั้งหมด', value: total,      unit: 'รายการ', icon: IconFileText,    tone: 'blue' as Tone },
      { label: 'รอตรวจสอบ',          value: pending,    unit: 'รายการ', icon: IconClock,       tone: 'amber' as Tone },
      { label: 'ตรวจสอบแล้ว',        value: reviewed,   unit: 'รายการ', icon: IconCheckCircle, tone: 'green' as Tone },
      { label: 'ต้องแก้ไข',          value: needUpdate, unit: 'รายการ', icon: IconAlert,       tone: 'red' as Tone },
    ]
  }, [submissions])

  const recent = submissions.slice(0, 4)

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/submissions/${deleteTarget.id}`)
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setError(apiError(err, 'ลบไม่สำเร็จ'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppLayout>
      <TopBar
        title="ยินดีต้อนรับ, TOT Founding Ambassador"
        badge={{ label: 'Approved', tone: 'success' }}
        subtitle="ขอบคุณที่ร่วมเป็นส่วนหนึ่งในการพัฒนาเทนนิสไทย"
        notifications={3}
        messages={1}
      />

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

      {/* ===== Stats ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-surface rounded-2xl border border-border p-3 sm:p-4 flex items-center gap-3"
          >
            <ToneGlyph
              icon={s.icon}
              tone={s.tone}
              filled
              shape="circle"
              size="w-10 h-10 sm:w-11 sm:h-11"
              glyph="w-5 h-5"
            />
            <div className="min-w-0">
              <p className="text-[11px] text-muted truncate">{s.label}</p>
              <p
                className="text-2xl font-bold text-ink leading-none mt-0.5"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {loading ? '—' : s.value}
              </p>
              <p className="text-[10px] text-muted mt-0.5">{s.unit}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ===== Left (2/3) ===== */}
        <div className="lg:col-span-2 space-y-5">
          {/* Missions */}
          <section className="bg-surface rounded-2xl border border-border p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-ink mb-3.5" style={{ fontFamily: 'var(--font-heading)' }}>
              ภารกิจแนะนำวันนี้
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {MISSIONS.map((m) => (
                <Link
                  key={m.title}
                  to={m.to}
                  className="rounded-2xl border border-border p-3.5 text-center hover:border-primary/40 hover:shadow-sm transition-all group flex flex-col items-center"
                >
                  {/* Only the primary action keeps a filled disc; the rest are
                      bare coloured icons. */}
                  <ToneGlyph
                    icon={m.icon}
                    tone={m.tone}
                    filled={m.filled}
                    shape={m.filled ? 'circle' : 'none'}
                    size="w-10 h-10"
                    glyph={m.filled ? 'w-5 h-5' : 'w-[30px] h-[30px]'}
                  />
                  <p className="text-xs font-semibold text-ink mt-2.5 group-hover:text-primary transition-colors">
                    {m.title}
                  </p>
                  <p className="text-[11px] text-muted mt-1 leading-snug">{m.desc}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Recent submissions */}
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5">
              <p className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
                รายการล่าสุดของฉัน
              </p>
              {/* No standalone "all submissions" page exists yet for
                  ambassadors, so this stays a plain count rather than a
                  link that would 404. */}
              {submissions.length > 4 && (
                <span className="text-xs text-muted">ทั้งหมด {submissions.length} รายการ</span>
              )}
            </div>

            {error && (
              <div className="mx-4 sm:mx-5 mb-3 rounded-xl border border-danger/20 bg-danger-light px-3 py-2 text-xs text-danger flex items-start gap-2">
                <IconAlert className="w-4 h-4 shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <p className="px-5 py-10 text-center text-sm text-muted">กำลังโหลดข้อมูล…</p>
            ) : recent.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-muted mb-3">ยังไม่มีรายการที่ส่งเข้ามา</p>
                <Link
                  to="/ambassador/courts/add"
                  className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
                >
                  <IconPlusCircle className="w-4 h-4" /> เพิ่มสนามแรกของคุณ
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted bg-bg/60 border-y border-border">
                      <th className="px-5 py-2.5 text-left font-medium">รายการ</th>
                      <th className="px-4 py-2.5 text-left font-medium">ประเภท</th>
                      <th className="px-4 py-2.5 text-left font-medium">วันที่ส่ง</th>
                      <th className="px-4 py-2.5 text-left font-medium">สถานะ</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((s) => {
                      const card = s.court ?? s.matchedCourt
                      const meta = STATUS_MAP[s.review_status]
                      const StatusIcon = meta.icon
                      const thumb = card?.images?.[0]?.url ? resolveAssetUrl(card.images[0].url) : undefined
                      return (
                        <tr key={s.id} className="border-b border-border last:border-0 hover:bg-bg/50 group">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt=""
                                  className="w-[62px] h-10 rounded-lg shrink-0 object-cover bg-bg"
                                />
                              ) : (
                                <ImagePlaceholder className="w-[62px] h-10 rounded-lg shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-ink text-sm truncate">
                                  {card?.name ?? 'ไม่พบชื่อสนาม'}
                                </p>
                                <p className="text-xs text-muted">{card?.province?.name_th ?? '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                            {s.is_duplicate ? 'อัปเดตข้อมูลสนาม' : 'สนามใหม่'}
                          </td>
                          <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                            {new Date(s.created_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${meta.cls}`}>
                              <StatusIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {(() => {
                              const canDelete = s.review_status !== 'approved'
                              const editHref = s.is_duplicate
                                ? `/ambassador/submissions/${s.id}`
                                : s.review_status === 'pending' && s.court
                                  ? `/ambassador/courts/edit/${s.court.id}`
                                  : null

                              if (!editHref && !canDelete) {
                                return (
                                  <IconChevronRight className="w-4 h-4 text-muted/60 group-hover:text-primary transition-colors inline-block" />
                                )
                              }
                              return (
                                <div className="flex items-center justify-end gap-3">
                                  {editHref && (
                                    <Link
                                      to={editHref}
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                                    >
                                      <IconEdit className="w-3.5 h-3.5" />
                                      แก้ไข
                                    </Link>
                                  )}
                                  {canDelete && (
                                    <button
                                      type="button"
                                      title="ลบ"
                                      onClick={() => setDeleteTarget(s)}
                                      className="p-1 rounded-lg text-muted hover:text-danger hover:bg-danger-light transition-colors"
                                    >
                                      <IconTrash className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )
                            })()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Shortcuts */}
          <section className="bg-surface rounded-2xl border border-border p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-ink mb-3.5" style={{ fontFamily: 'var(--font-heading)' }}>
              ทางลัด
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {SHORTCUTS.map((s) => {
                const inner = (
                  <>
                    <ToneGlyph
                      icon={s.icon}
                      tone={s.tone}
                      filled={s.filled}
                      shape={s.filled ? 'circle' : 'none'}
                      size="w-9 h-9"
                      glyph={s.filled ? 'w-[18px] h-[18px]' : 'w-7 h-7'}
                    />
                    <p className="text-[11px] font-medium text-ink mt-2 leading-snug">{s.label}</p>
                  </>
                )
                const cls =
                  'rounded-2xl border border-border p-3 text-center flex flex-col items-center transition-all'

                return s.to ? (
                  <Link key={s.label} to={s.to} className={`${cls} hover:border-primary/40 hover:shadow-sm`}>
                    {inner}
                  </Link>
                ) : (
                  <span
                    key={s.label}
                    title="อยู่ระหว่างพัฒนา"
                    className={`${cls} opacity-55 cursor-not-allowed select-none`}
                  >
                    {inner}
                  </span>
                )
              })}
            </div>
          </section>
        </div>

        {/* ===== Right (1/3) ===== */}
        <div className="space-y-5">
          {/* Announcements */}
          <div className="bg-surface rounded-2xl border border-border p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-ink flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                <IconMegaphone className="w-[18px] h-[18px] text-primary" />
                ประกาศจากทีม TOT
              </h4>
              <span className="text-xs text-primary hover:underline cursor-pointer shrink-0">ดูทั้งหมด</span>
            </div>
            <div className="space-y-4">
              {ANNOUNCEMENTS.map((a, i) => (
                <div key={a.title} className={i < ANNOUNCEMENTS.length - 1 ? 'pb-4 border-b border-border' : ''}>
                  <p className="text-sm font-semibold text-ink leading-snug">
                    {a.urgent && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-danger-light text-danger mr-1.5 align-middle">
                        สำคัญ
                      </span>
                    )}
                    {a.title}
                  </p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{a.desc}</p>
                  <p className="text-[11px] text-muted/70 mt-1.5">{a.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow timeline */}
          <div className="bg-surface rounded-2xl border border-border p-4 sm:p-5">
            <h4 className="text-sm font-semibold text-ink mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              ขั้นตอนการทำงาน
            </h4>
            <ol className="space-y-1">
              {WORKFLOW.map((step, i) => {
                const t = TONES[step.tone]
                const isLast = i === WORKFLOW.length - 1
                return (
                  <li key={step.n} className="flex gap-3">
                    {/* Rail */}
                    <div className="flex flex-col items-center shrink-0">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: t.solid }}
                      >
                        {step.n}
                      </span>
                      {!isLast && <span className="w-px flex-1 min-h-6 bg-border my-1" />}
                    </div>

                    <div className={`flex items-start gap-2.5 ${isLast ? 'pb-0' : 'pb-3'}`}>
                      <ToneGlyph icon={step.icon} tone={step.tone} size="w-8 h-8" glyph="w-4 h-4" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink leading-tight">{step.title}</p>
                        <p className="text-xs text-muted mt-0.5 leading-snug">{step.desc}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
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
                      จะลบเฉพาะคำขออัปเดตข้อมูลนี้ — สนามจริง{' '}
                      <strong className="text-ink">{deleteTarget.matchedCourt?.name}</strong> จะไม่ถูกลบ
                    </>
                  ) : (
                    <>
                      จะลบสนาม <strong className="text-ink">{deleteTarget.court?.name}</strong> ที่ส่งไปทั้งหมด
                      — ย้อนกลับไม่ได้
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
