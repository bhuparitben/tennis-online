import { useEffect, useState } from 'react'
import type { FieldChange } from '../../types'

// ===== Label map =====
export const FIELD_LABELS: Record<string, string> = {
  name: 'ชื่อสนาม / คลับ',
  phone: 'เบอร์โทรศัพท์',
  line_id: 'LINE ID',
  facebook_page: 'Facebook Page',
  website: 'Website',
  address_line: 'ที่อยู่',
  subdistrict: 'ตำบล / แขวง',
  postal_code: 'รหัสไปรษณีย์',
  google_map_link: 'Google Map',
  open_time: 'เวลาเปิด',
  close_time: 'เวลาปิด',
  open_daily: 'เปิดทุกวัน',
  surface_counts: 'จำนวนคอร์ตแยกตามพื้นสนาม',
  indoor_outdoor: 'ในร่ม / กลางแจ้ง',
  has_lights: 'มีไฟสนาม',
  amenity_has_coach: 'บริการโค้ช',
  amenity_equipment_rental: 'เช่าอุปกรณ์',
  amenity_parking_sufficient: 'ที่จอดรถ',
  amenity_has_restroom: 'ห้องน้ำ',
  amenity_has_shower: 'ห้องอาบน้ำ',
  amenity_has_restaurant: 'ห้องอาหาร',
  amenity_has_cafe: 'คาเฟ่',
  amenity_has_stringing: 'บริการขึ้นเอ็น',
}

const BOOLEAN_FIELDS = new Set(['open_daily', 'has_lights'])
const ENUM_FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  indoor_outdoor: [
    { value: 'indoor', label: 'ในร่ม (Indoor)' },
    { value: 'outdoor', label: 'กลางแจ้ง (Outdoor)' },
    { value: 'both', label: 'ทั้งสองประเภท' },
  ],
}
// Derived/structured summary — not a value that round-trips through a
// single text box, so the compare table leaves it read-only.
const NON_EDITABLE_FIELDS = new Set(['surface_counts'])

function isBoolField(fieldName: string) {
  return BOOLEAN_FIELDS.has(fieldName) || fieldName.startsWith('amenity_')
}

// ===== Value display helper =====
export function displayValue(fieldName: string, value: string): string {
  if (value === '' || value === null || value === undefined) return '—'

  if (isBoolField(fieldName)) {
    return value === 'true' ? '✓ มี' : '✗ ไม่มี'
  }

  const enumOptions = ENUM_FIELD_OPTIONS[fieldName]
  if (enumOptions) {
    return enumOptions.find((o) => o.value === value)?.label ?? value
  }

  return value
}

// ===== Component =====

interface Props {
  change: FieldChange
  /** If true, show radio buttons for admin to choose old/new */
  isAdmin?: boolean
  adminChoice?: 'old' | 'new'
  onAdminChoiceChange?: (choice: 'old' | 'new') => void
  /** If true, the "new value" cell becomes an editable control (ambassador, own pending submission). */
  editable?: boolean
  onSaveNewValue?: (fieldName: string, value: string) => void | Promise<void>
}

export default function FieldCompareRow({
  change, isAdmin, adminChoice, onAdminChoiceChange, editable, onSaveNewValue,
}: Props) {
  const { field_name, old_value, new_value, is_changed } = change
  const label = FIELD_LABELS[field_name] ?? field_name
  const canEdit = !!editable && !NON_EDITABLE_FIELDS.has(field_name)

  const [localValue, setLocalValue] = useState(new_value)
  const [saving, setSaving] = useState(false)

  // The saved value can change out from under this row (e.g. after a
  // successful commit re-syncs fieldChanges from the server) — follow it.
  useEffect(() => {
    setLocalValue(new_value)
  }, [new_value])

  async function commit(value: string) {
    if (value === new_value) return
    setSaving(true)
    try {
      await onSaveNewValue?.(field_name, value)
    } finally {
      setSaving(false)
    }
  }

  const rowCls = [
    'grid gap-0 border-b border-border last:border-0 transition-colors',
    isAdmin ? 'grid-cols-[1fr_2fr_2fr_auto]' : 'grid-cols-[1fr_2fr_2fr]',
    is_changed ? 'bg-amber-50' : '',
  ].join(' ')

  const cellCls = 'px-4 py-3 text-sm'
  const inputCls = 'w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'

  return (
    <div className={rowCls}>
      {/* Field label */}
      <div className={`${cellCls} font-medium text-ink flex items-center gap-2`}>
        {is_changed && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
            title="มีการเปลี่ยนแปลง"
          />
        )}
        {label}
      </div>

      {/* Old value */}
      <div className={`${cellCls} text-muted border-l border-border`}>
        <span className={is_changed ? 'line-through opacity-60' : ''}>
          {displayValue(field_name, old_value)}
        </span>
      </div>

      {/* New value — editable when this is the ambassador's own pending submission */}
      <div
        className={[
          cellCls,
          'border-l border-border',
          !canEdit && (is_changed ? 'text-amber-800 font-medium' : 'text-muted'),
        ].filter(Boolean).join(' ')}
      >
        {!canEdit ? (
          displayValue(field_name, new_value)
        ) : isBoolField(field_name) ? (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localValue === 'true'}
              onChange={(e) => {
                const v = e.target.checked ? 'true' : 'false'
                setLocalValue(v)
                commit(v)
              }}
              className="accent-primary"
            />
            <span className="text-ink">{localValue === 'true' ? 'มี' : 'ไม่มี'}</span>
          </label>
        ) : ENUM_FIELD_OPTIONS[field_name] ? (
          <select
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value)
              commit(e.target.value)
            }}
            className={inputCls}
          >
            {ENUM_FIELD_OPTIONS[field_name].map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => commit(localValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            className={inputCls}
          />
        )}
        {saving && <span className="text-[10px] text-muted mt-1 block">กำลังบันทึก...</span>}
      </div>

      {/* Admin choice radio (only for changed fields) */}
      {isAdmin && (
        <div className={`${cellCls} border-l border-border flex items-center gap-3`}>
          {is_changed ? (
            <>
              <label className="flex items-center gap-1 cursor-pointer text-xs text-muted hover:text-ink">
                <input
                  type="radio"
                  name={`choice_${change.id}`}
                  value="old"
                  checked={adminChoice === 'old'}
                  onChange={() => onAdminChoiceChange?.('old')}
                  className="accent-primary"
                />
                เดิม
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-xs text-amber-700 hover:text-amber-900">
                <input
                  type="radio"
                  name={`choice_${change.id}`}
                  value="new"
                  checked={adminChoice === 'new'}
                  onChange={() => onAdminChoiceChange?.('new')}
                  className="accent-amber-600"
                />
                ใหม่
              </label>
            </>
          ) : (
            <span className="text-xs text-muted">—</span>
          )}
        </div>
      )}
    </div>
  )
}
