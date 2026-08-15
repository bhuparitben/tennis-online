import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/ui/Button'
import api from '../../lib/apiClient'
import type { District, Province } from '../../types'
import {
  IconSearch, IconPlusCircle, IconMapPin, IconEdit,
  IconCheckCircle, IconAlert, IconClose, IconChevronRight,
} from '../../components/ui/icons'

const REGIONS = [
  'ภาคเหนือ', 'ภาคกลาง', 'ภาคตะวันออก', 'ภาคตะวันตก',
  'ภาคตะวันออกเฉียงเหนือ', 'ภาคใต้',
]

const inp =
  'w-full rounded-xl border border-border px-3 py-2 text-sm text-ink placeholder-muted bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
const inpSm =
  'w-full rounded-lg border border-border px-2.5 py-1.5 text-sm text-ink placeholder-muted bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
}

function Banner({ tone, children, onDismiss }: { tone: 'ok' | 'err'; children: React.ReactNode; onDismiss?: () => void }) {
  const ok = tone === 'ok'
  return (
    <div
      className={[
        'mb-4 rounded-xl border px-3 py-2 text-xs flex items-start gap-2',
        ok ? 'bg-success-light text-success border-success/20' : 'bg-danger-light text-danger border-danger/20',
      ].join(' ')}
    >
      {ok ? <IconCheckCircle className="w-4 h-4 shrink-0 mt-px" /> : <IconAlert className="w-4 h-4 shrink-0 mt-px" />}
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="ปิด" className="shrink-0">
          <IconClose className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

/** Two-click confirm so a stray click never deletes something. */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
  title,
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  disabled?: boolean
  title?: string
}) {
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(t)
  }, [confirming])

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={() => (confirming ? onConfirm() : setConfirming(true))}
      className={[
        'rounded-lg text-xs px-2.5 py-1.5 font-semibold transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed',
        confirming ? 'bg-danger text-white' : 'border border-border text-danger hover:bg-danger-light',
      ].join(' ')}
    >
      {confirming ? confirmLabel : label}
    </button>
  )
}

// ===== New province form =====
function NewProvinceForm({ onDone, onCancel }: { onDone: (msg: string) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name_th: '', name_en: '', region: REGIONS[0] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.post('/provinces', {
        name_th: form.name_th.trim(),
        name_en: form.name_en.trim(),
        region: form.region,
      })
      onDone(`เพิ่มจังหวัด "${form.name_th.trim()}" แล้ว`)
    } catch (err) {
      setError(apiError(err, 'เพิ่มจังหวัดไม่สำเร็จ'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="p-3 border-b border-border bg-bg/60 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          className={inpSm}
          placeholder="ชื่อจังหวัด (ไทย)"
          value={form.name_th}
          onChange={(e) => setForm((f) => ({ ...f, name_th: e.target.value }))}
          required
          autoFocus
        />
        <input
          className={inpSm}
          placeholder="Name (English)"
          value={form.name_en}
          onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
          required
        />
      </div>
      <select
        className={inpSm}
        value={form.region}
        onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
      >
        {REGIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-xs text-muted hover:text-ink px-2 py-1">
          ยกเลิก
        </button>
        <Button type="submit" loading={busy} className="px-3 py-1.5 text-xs">
          เพิ่มจังหวัด
        </Button>
      </div>
    </form>
  )
}

// ===== District row (view / inline edit) =====
function DistrictRow({
  district,
  onRenamed,
  onDeleted,
  onError,
}: {
  district: District
  onRenamed: (d: District) => void
  onDeleted: (id: number) => void
  onError: (msg: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(district.name_th)
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === district.name_th) {
      setEditing(false)
      setName(district.name_th)
      return
    }
    setBusy(true)
    try {
      const { data } = await api.patch<District>(`/districts/${district.id}`, { name_th: trimmed })
      onRenamed(data)
      setEditing(false)
    } catch (err) {
      onError(apiError(err, 'บันทึกไม่สำเร็จ'))
      setName(district.name_th)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    try {
      await api.delete(`/districts/${district.id}`)
      onDeleted(district.id)
    } catch (err) {
      onError(apiError(err, 'ลบไม่สำเร็จ'))
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <input
          className={inpSm}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') { setEditing(false); setName(district.name_th) }
          }}
          autoFocus
          disabled={busy}
        />
        <button
          onClick={save}
          disabled={busy}
          className="text-xs text-white bg-primary rounded-lg px-2.5 py-1.5 font-semibold shrink-0 disabled:opacity-50"
        >
          บันทึก
        </button>
        <button
          onClick={() => { setEditing(false); setName(district.name_th) }}
          className="text-xs text-muted hover:text-ink px-1.5 shrink-0"
        >
          ยกเลิก
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-bg/50 group">
      <span className="text-sm text-ink truncate">{district.name_th}</span>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          aria-label="แก้ไข"
          className="p-1.5 text-muted hover:text-ink rounded-lg hover:bg-bg"
        >
          <IconEdit className="w-4 h-4" />
        </button>
        <ConfirmButton label="ลบ" confirmLabel="ยืนยัน" onConfirm={remove} />
      </div>
    </div>
  )
}

// ===== Province detail panel (edit + district manager) =====
function ProvincePanel({
  province,
  onUpdated,
  onDeleted,
}: {
  province: Province
  onUpdated: (p: Province) => void
  onDeleted: (id: number) => void
}) {
  const [form, setForm] = useState({ name_th: province.name_th, name_en: province.name_en, region: province.region })
  const [savingProvince, setSavingProvince] = useState(false)
  const [provinceMsg, setProvinceMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const [districts, setDistricts] = useState<District[]>([])
  const [loadingDistricts, setLoadingDistricts] = useState(true)
  const [districtError, setDistrictError] = useState('')
  const [newDistrict, setNewDistrict] = useState('')
  const [addingDistrict, setAddingDistrict] = useState(false)

  useEffect(() => {
    setForm({ name_th: province.name_th, name_en: province.name_en, region: province.region })
    setProvinceMsg(null)
  }, [province.id, province.name_th, province.name_en, province.region])

  const loadDistricts = useCallback(async () => {
    setLoadingDistricts(true)
    try {
      const { data } = await api.get<District[]>('/districts', { params: { province_id: province.id } })
      setDistricts(data)
    } catch (err) {
      setDistrictError(apiError(err, 'โหลดรายชื่ออำเภอไม่สำเร็จ'))
    } finally {
      setLoadingDistricts(false)
    }
  }, [province.id])

  useEffect(() => {
    loadDistricts()
  }, [loadDistricts])

  async function saveProvince(e: FormEvent) {
    e.preventDefault()
    setProvinceMsg(null)
    setSavingProvince(true)
    try {
      const { data } = await api.patch<Province>(`/provinces/${province.id}`, {
        name_th: form.name_th.trim(),
        name_en: form.name_en.trim(),
        region: form.region,
      })
      onUpdated({ ...data, _count: province._count })
      setProvinceMsg({ tone: 'ok', text: 'บันทึกข้อมูลจังหวัดแล้ว' })
    } catch (err) {
      setProvinceMsg({ tone: 'err', text: apiError(err, 'บันทึกไม่สำเร็จ') })
    } finally {
      setSavingProvince(false)
    }
  }

  async function deleteProvince() {
    try {
      await api.delete(`/provinces/${province.id}`)
      onDeleted(province.id)
    } catch (err) {
      setProvinceMsg({ tone: 'err', text: apiError(err, 'ลบไม่สำเร็จ') })
    }
  }

  async function addDistrict(e: FormEvent) {
    e.preventDefault()
    const name_th = newDistrict.trim()
    if (!name_th) return
    setAddingDistrict(true)
    setDistrictError('')
    try {
      const { data } = await api.post<District>('/districts', { province_id: province.id, name_th })
      setDistricts((ds) => [...ds, data].sort((a, b) => a.name_th.localeCompare(b.name_th, 'th')))
      setNewDistrict('')
    } catch (err) {
      setDistrictError(apiError(err, 'เพิ่มอำเภอไม่สำเร็จ'))
    } finally {
      setAddingDistrict(false)
    }
  }

  const canDelete = !province._count || (province._count.districts === 0)

  return (
    <div className="space-y-5">
      {/* Province fields */}
      <form onSubmit={saveProvince} className="bg-surface rounded-2xl border border-border p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
            ข้อมูลจังหวัด
          </h2>
          <ConfirmButton
            label="ลบจังหวัด"
            confirmLabel="ยืนยันลบจังหวัด"
            onConfirm={deleteProvince}
            disabled={!canDelete}
            title={canDelete ? undefined : 'ต้องลบอำเภอในจังหวัดนี้ให้หมดก่อน'}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">ชื่อจังหวัด (ไทย)</label>
            <input
              className={inp}
              value={form.name_th}
              onChange={(e) => setForm((f) => ({ ...f, name_th: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Name (English)</label>
            <input
              className={inp}
              value={form.name_en}
              onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">ภูมิภาค</label>
          <select
            className={inp}
            value={form.region}
            onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {provinceMsg && <Banner tone={provinceMsg.tone}>{provinceMsg.text}</Banner>}

        <div className="flex justify-end">
          <Button type="submit" loading={savingProvince} className="px-4 py-2 text-sm">
            บันทึกข้อมูลจังหวัด
          </Button>
        </div>
      </form>

      {/* Districts */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
            อำเภอ / เขต <span className="text-muted font-normal">({districts.length})</span>
          </h2>
        </div>

        {districtError && (
          <div className="px-4 pt-3">
            <Banner tone="err" onDismiss={() => setDistrictError('')}>{districtError}</Banner>
          </div>
        )}

        {loadingDistricts ? (
          <p className="px-4 py-8 text-center text-sm text-muted">กำลังโหลด…</p>
        ) : districts.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">ยังไม่มีอำเภอในจังหวัดนี้</p>
        ) : (
          <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {districts.map((d) => (
              <DistrictRow
                key={d.id}
                district={d}
                onRenamed={(updated) => setDistricts((ds) => ds.map((x) => (x.id === updated.id ? updated : x)))}
                onDeleted={(id) => setDistricts((ds) => ds.filter((x) => x.id !== id))}
                onError={setDistrictError}
              />
            ))}
          </div>
        )}

        <form onSubmit={addDistrict} className="flex items-center gap-2 p-3 border-t border-border bg-bg/50">
          <input
            className={inpSm}
            placeholder="+ เพิ่มอำเภอใหม่"
            value={newDistrict}
            onChange={(e) => setNewDistrict(e.target.value)}
            disabled={addingDistrict}
          />
          <button
            type="submit"
            disabled={addingDistrict || !newDistrict.trim()}
            className="rounded-lg bg-primary text-white text-xs px-3 py-1.5 font-semibold shrink-0 disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            เพิ่ม
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminLocationsPage() {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Province[]>('/provinces')
      setProvinces(data)
      setError('')
    } catch (err) {
      setError(apiError(err, 'โหลดรายชื่อจังหวัดไม่สำเร็จ'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = provinces.filter(
      (p) => !q || p.name_th.toLowerCase().includes(q) || p.name_en.toLowerCase().includes(q),
    )
    const byRegion = new Map<string, Province[]>()
    for (const p of filtered) {
      const list = byRegion.get(p.region) ?? []
      list.push(p)
      byRegion.set(p.region, list)
    }
    return REGIONS.map((r) => ({ region: r, items: byRegion.get(r) ?? [] })).filter((g) => g.items.length > 0)
  }, [provinces, search])

  const selected = provinces.find((p) => p.id === selectedId) ?? null

  return (
    <AppLayout>
      <TopBar
        title="จังหวัด / อำเภอ"
        subtitle="จัดการรายชื่อจังหวัดและอำเภอที่ใช้ทั่วทั้งระบบ"
        breadcrumbs={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'จังหวัด / อำเภอ' }]}
      />

      {flash && <Banner tone="ok" onDismiss={() => setFlash('')}>{flash}</Banner>}
      {error && <Banner tone="err" onDismiss={() => setError('')}>{error}</Banner>}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">
        {/* ===== Province list ===== */}
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className={inpSm + ' pl-9'}
                placeholder="ค้นหาจังหวัด…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {!showNewForm && (
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs text-muted hover:text-primary hover:border-primary/40 py-2 transition-colors"
              >
                <IconPlusCircle className="w-4 h-4" />
                เพิ่มจังหวัดใหม่
              </button>
            )}
          </div>

          {showNewForm && (
            <NewProvinceForm
              onCancel={() => setShowNewForm(false)}
              onDone={(msg) => {
                setShowNewForm(false)
                setFlash(msg)
                load()
              }}
            />
          )}

          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-muted">กำลังโหลด…</p>
            ) : grouped.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">ไม่พบจังหวัดที่ค้นหา</p>
            ) : (
              grouped.map((g) => (
                <div key={g.region}>
                  <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-muted uppercase tracking-wide">
                    {g.region}
                  </p>
                  {g.items.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={[
                        'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors',
                        p.id === selectedId ? 'bg-primary-light text-primary font-semibold' : 'text-ink hover:bg-bg',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <IconMapPin className="w-4 h-4 shrink-0 opacity-70" />
                        <span className="truncate">{p.name_th}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0 text-[11px] text-muted">
                        {p._count?.districts ?? '—'}
                        <IconChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ===== Detail panel ===== */}
        <div>
          {selected ? (
            <ProvincePanel
              key={selected.id}
              province={selected}
              onUpdated={(p) => {
                setProvinces((ps) => ps.map((x) => (x.id === p.id ? p : x)))
                setFlash('บันทึกข้อมูลจังหวัดแล้ว')
              }}
              onDeleted={(id) => {
                setProvinces((ps) => ps.filter((x) => x.id !== id))
                setSelectedId(null)
                setFlash('ลบจังหวัดแล้ว')
              }}
            />
          ) : (
            <div className="bg-surface rounded-2xl border border-border p-10 text-center text-sm text-muted">
              <IconMapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              เลือกจังหวัดด้านซ้ายเพื่อดูและจัดการอำเภอ
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
