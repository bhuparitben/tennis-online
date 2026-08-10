import type { UseFormWatch, UseFormSetValue } from 'react-hook-form'
import type { CourtFormData, CourtAmenities } from '../../../types'

interface Props {
  watch: UseFormWatch<CourtFormData>
  setValue: UseFormSetValue<CourtFormData>
}

const AMENITY_CONFIG: { key: keyof CourtAmenities; label: string; icon: string; desc: string }[] = [
  { key: 'has_coach',          label: 'โค้ช',                   icon: '🎓', desc: 'มีโค้ชสอนเทนนิส' },
  { key: 'equipment_rental',   label: 'เช่าอุปกรณ์',            icon: '🎾', desc: 'บริการเช่าไม้และอุปกรณ์' },
  { key: 'parking_sufficient', label: 'ที่จอดรถเพียงพอ',        icon: '🅿️', desc: 'ที่จอดรถรองรับได้' },
  { key: 'has_restroom',       label: 'ห้องน้ำ',                icon: '🚻', desc: 'มีห้องน้ำสะอาด' },
  { key: 'has_shower',         label: 'ห้องอาบน้ำ',             icon: '🚿', desc: 'มีห้องอาบน้ำ' },
  { key: 'has_restaurant',     label: 'ห้องอาหาร',              icon: '🍽️', desc: 'มีร้านอาหารในสนาม' },
  { key: 'has_cafe',           label: 'คาเฟ่',                  icon: '☕', desc: 'มีคาเฟ่หรือร้านกาแฟ' },
  { key: 'has_stringing',      label: 'บริการขึ้นเอ็น',         icon: '🔧', desc: 'บริการขึ้นเอ็นไม้เทนนิส' },
]

export default function StepAmenities({ watch, setValue }: Props) {
  const amenities = watch('amenities')

  function toggle(key: keyof CourtAmenities) {
    setValue('amenities', { ...amenities, [key]: !amenities[key] })
  }

  const selected = AMENITY_CONFIG.filter((a) => amenities[a.key]).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">เลือกบริการเสริมที่มีในสนาม</p>
        <span className="text-xs font-medium text-primary bg-primary-light px-2 py-0.5 rounded-full">
          เลือกแล้ว {selected} รายการ
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AMENITY_CONFIG.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => toggle(a.key)}
            className={[
              'flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150',
              amenities[a.key]
                ? 'border-primary bg-primary-light shadow-sm'
                : 'border-border bg-white hover:border-primary/30 hover:bg-bg',
            ].join(' ')}
          >
            {/* Checkbox indicator */}
            <div
              className={[
                'mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                amenities[a.key] ? 'border-primary bg-primary' : 'border-border bg-white',
              ].join(' ')}
            >
              {amenities[a.key] && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <div>
              <p className={`text-sm font-medium ${amenities[a.key] ? 'text-primary' : 'text-ink'}`}>
                {a.icon} {a.label}
              </p>
              <p className="text-xs text-muted mt-0.5">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
