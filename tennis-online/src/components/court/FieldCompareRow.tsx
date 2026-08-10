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
  num_courts: 'จำนวนคอร์ต',
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

// ===== Value display helper =====
export function displayValue(fieldName: string, value: string): string {
  if (value === '' || value === null || value === undefined) return '—'

  const boolFields = ['open_daily', 'has_lights']
  if (boolFields.includes(fieldName) || fieldName.startsWith('amenity_')) {
    return value === 'true' ? '✓ มี' : '✗ ไม่มี'
  }

  if (fieldName === 'indoor_outdoor') {
    const MAP: Record<string, string> = {
      indoor: 'ในร่ม (Indoor)',
      outdoor: 'กลางแจ้ง (Outdoor)',
      both: 'ทั้งสองประเภท',
    }
    return MAP[value] ?? value
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
}

export default function FieldCompareRow({ change, isAdmin, adminChoice, onAdminChoiceChange }: Props) {
  const { field_name, old_value, new_value, is_changed } = change
  const label = FIELD_LABELS[field_name] ?? field_name

  const rowCls = [
    'grid gap-0 border-b border-border last:border-0 transition-colors',
    isAdmin ? 'grid-cols-[1fr_2fr_2fr_auto]' : 'grid-cols-[1fr_2fr_2fr]',
    is_changed ? 'bg-amber-50' : '',
  ].join(' ')

  const cellCls = 'px-4 py-3 text-sm'

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

      {/* New value */}
      <div
        className={[
          cellCls,
          'border-l border-border',
          is_changed ? 'text-amber-800 font-medium' : 'text-muted',
        ].join(' ')}
      >
        {displayValue(field_name, new_value)}
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
