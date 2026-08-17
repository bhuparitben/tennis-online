import { useState } from 'react'
import type { CourtWithRelations, CourtAmenities, PricingRow } from '../../types'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import Lightbox from '../ui/Lightbox'
import { resolveAssetUrl } from '../../lib/apiClient'

const INDOOR_OUTDOOR_LABELS: Record<string, string> = {
  indoor: 'ในร่ม (Indoor)',
  outdoor: 'กลางแจ้ง (Outdoor)',
  both: 'ทั้งสองประเภท',
}

const AMENITY_LABELS: Record<keyof CourtAmenities, string> = {
  has_coach: 'บริการโค้ช',
  equipment_rental: 'เช่าอุปกรณ์',
  parking_sufficient: 'ที่จอดรถเพียงพอ',
  has_restroom: 'ห้องน้ำ',
  has_shower: 'ห้องอาบน้ำ',
  has_restaurant: 'ร้านอาหาร',
  has_cafe: 'คาเฟ่',
  has_stringing: 'บริการขึ้นเอ็น',
}

const RATE_TYPE_LABELS: Record<PricingRow['rate_type'], string> = {
  hour: 'รายชั่วโมง',
  day: 'รายวัน',
  month: 'รายเดือน',
}

function formatPrice(price: number | string): string {
  const n = typeof price === 'string' ? Number(price) : price
  return Number.isFinite(n) ? n.toLocaleString('th-TH') : String(price)
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm text-ink font-medium break-words">{value || '—'}</p>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-border p-6">
      <h3 className="font-semibold text-ink mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * Read-only rendering of a brand-new (non-duplicate) court submission — the
 * comparison table only exists for duplicate submissions, so a plain new
 * court needs its own view of what was actually submitted.
 */
export default function NewCourtDetailCard({ court }: { court: CourtWithRelations }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // "เปิดทุกวัน" only says which DAYS it's open, not what TIME — show both
  // together when the hours are known instead of one hiding the other.
  const hours = court.open_time && court.close_time
    ? `${court.open_time} – ${court.close_time} น.${court.open_daily ? ' (เปิดทุกวัน)' : ''}`
    : court.open_daily
      ? 'เปิดทุกวัน'
      : '—'

  const sortedImages = [...(court.images ?? [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover))

  return (
    <div className="space-y-5">
      {/* ===== Basic info ===== */}
      <SectionCard title="ข้อมูลพื้นฐาน">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <InfoItem label="ชื่อสนาม / คลับ" value={court.name} />
          <InfoItem
            label="พื้นที่"
            value={[court.province?.name_th, court.district?.name_th].filter(Boolean).join(' · ') || '—'}
          />
          <InfoItem label="ที่อยู่" value={court.address_line} />
          <InfoItem
            label="ตำบล/แขวง · รหัสไปรษณีย์"
            value={[court.subdistrict, court.postal_code].filter(Boolean).join(' · ')}
          />
          <InfoItem
            label="Google Map"
            value={
              court.google_map_link ? (
                <a
                  href={court.google_map_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  เปิดแผนที่ ↗
                </a>
              ) : null
            }
          />
          <InfoItem label="เวลาเปิด-ปิด" value={hours} />
          <InfoItem label="เบอร์โทรศัพท์" value={court.phone} />
          <InfoItem label="LINE ID" value={court.line_id} />
          <InfoItem label="Facebook" value={court.facebook_page} />
          <InfoItem label="Website" value={court.website} />
        </div>
      </SectionCard>

      {/* ===== Court details ===== */}
      <SectionCard title="รายละเอียดสนาม">
        <div className="mb-4">
          <p className="text-xs text-muted mb-2">จำนวนคอร์ตแยกตามประเภทพื้นสนาม</p>
          {!court.surfaceCounts || court.surfaceCounts.length === 0 ? (
            <p className="text-sm text-ink">—</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {court.surfaceCounts.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-light text-primary text-sm font-medium px-2.5 py-1"
                >
                  {s.surfaceType?.name ?? '—'} × {s.num_courts}
                </span>
              ))}
              <span className="text-xs text-muted">
                รวม {court.surfaceCounts.reduce((sum, s) => sum + s.num_courts, 0)} คอร์ต
              </span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <InfoItem label="ในร่ม / กลางแจ้ง" value={INDOOR_OUTDOOR_LABELS[court.indoor_outdoor] ?? court.indoor_outdoor} />
          <InfoItem label="ไฟสนาม" value={court.has_lights ? '✓ มี' : '✗ ไม่มี'} />
        </div>
      </SectionCard>

      {/* ===== Pricing ===== */}
      <SectionCard title="ราคาค่าสนาม">
        {!court.pricing || court.pricing.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่ได้ระบุราคา</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="px-2 py-2 text-left font-medium">ประเภท</th>
                  <th className="px-2 py-2 text-left font-medium">ช่วงเวลา</th>
                  <th className="px-2 py-2 text-right font-medium">ราคา</th>
                </tr>
              </thead>
              <tbody>
                {court.pricing.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-2 py-2.5 text-ink">{RATE_TYPE_LABELS[row.rate_type] ?? row.rate_type}</td>
                    <td className="px-2 py-2.5 text-muted">
                      {row.rate_type === 'hour'
                        ? `${row.period === 'night' ? 'กลางคืน' : 'กลางวัน'} · ${row.time_from}–${row.time_to}`
                        : '—'}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold text-ink">
                      {formatPrice(row.price)} ฿
                      <span className="text-muted font-normal">
                        {row.rate_type === 'hour' ? '/ชม.' : row.rate_type === 'day' ? '/วัน' : '/เดือน'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ===== Amenities ===== */}
      <SectionCard title="สิ่งอำนวยความสะดวก">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(AMENITY_LABELS) as (keyof CourtAmenities)[]).map((key) => {
            const has = !!court.amenities?.[key]
            return (
              <div
                key={key}
                className={`flex items-center gap-1.5 text-sm ${has ? 'text-ink' : 'text-muted/60'}`}
              >
                <span className={has ? 'text-success' : 'text-muted/50'}>{has ? '✓' : '✗'}</span>
                {AMENITY_LABELS[key]}
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* ===== Photos ===== */}
      <SectionCard title={`รูปภาพ (${sortedImages.length})`}>
        {sortedImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sortedImages.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="relative group cursor-zoom-in"
              >
                <img
                  src={resolveAssetUrl(img.url)}
                  alt=""
                  className={[
                    'w-full aspect-video rounded-xl object-cover bg-bg border transition-opacity group-hover:opacity-90',
                    img.is_cover ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                  ].join(' ')}
                />
                {img.is_cover && (
                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-semibold">
                    ภาพปก
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <ImagePlaceholder className="w-full h-32 rounded-xl" label="ยังไม่มีรูปภาพแนบมา" iconClassName="w-6 h-6" />
        )}
      </SectionCard>

      {lightboxIndex !== null && (
        <Lightbox
          images={sortedImages.map((img) => ({ url: resolveAssetUrl(img.url) }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  )
}
