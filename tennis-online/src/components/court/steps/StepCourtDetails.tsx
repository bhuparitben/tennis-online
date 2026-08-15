import { useEffect, useState } from 'react'
import { useFieldArray } from 'react-hook-form'
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue, Control } from 'react-hook-form'
import { FormField, Input, Select, CheckboxField, RadioGroup } from '../../ui/FormField'
import Button from '../../ui/Button'
import type { CourtFormData, SurfaceType } from '../../../types'
import api from '../../../lib/apiClient'

interface Props {
  register: UseFormRegister<CourtFormData>
  control: Control<CourtFormData>
  errors: FieldErrors<CourtFormData>
  watch: UseFormWatch<CourtFormData>
  setValue: UseFormSetValue<CourtFormData>
}

const EMPTY_PRICING_ROW = {
  rate_type: 'hour' as const,
  period: 'day' as const,
  time_from: '06:00',
  time_to: '18:00',
  price: '',
}

export default function StepCourtDetails({ register, control, errors, watch, setValue }: Props) {
  const [surfaceTypes, setSurfaceTypes] = useState<SurfaceType[]>([])
  const pricingArray = useFieldArray({ control, name: 'pricing' })
  const surfaceArray = useFieldArray({ control, name: 'surface_counts' })

  const hasLights = watch('has_lights')
  const indoorOutdoor = watch('indoor_outdoor')
  const surfaceCounts = watch('surface_counts')
  const totalCourts = surfaceCounts.reduce((sum, s) => sum + (Number(s.num_courts) || 0), 0)

  useEffect(() => {
    api.get<SurfaceType[]>('/surface-types').then((r) => setSurfaceTypes(r.data))
  }, [])

  return (
    <div className="space-y-6">
      {/* ===== จำนวนคอร์ตแยกตามประเภทพื้นสนาม ===== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">จำนวนคอร์ตแยกตามประเภทพื้นสนาม</h3>
            <p className="text-xs text-muted mt-0.5">
              สนามเดียวกันมีพื้นได้หลายแบบ เช่น Hard 2 คอร์ต, Clay 3 คอร์ต — เพิ่มได้ทีละแถว
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => surfaceArray.append({ surface_type_id: 0, num_courts: 1 })}
          >
            + เพิ่มประเภทพื้นสนาม
          </Button>
        </div>

        {surfaceArray.fields.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-bg p-4 text-center text-sm text-muted">
            ยังไม่ได้ระบุจำนวนคอร์ต — กดปุ่ม "เพิ่มประเภทพื้นสนาม" เพื่อเพิ่ม
          </div>
        )}

        <div className="space-y-3">
          {surfaceArray.fields.map((field, i) => {
            const selectedId = watch(`surface_counts.${i}.surface_type_id`)
            // Each surface type can only be picked once — everywhere else it's
            // already used gets hidden from this row's dropdown.
            const usedElsewhere = new Set(
              surfaceCounts.filter((_, j) => j !== i).map((s) => s.surface_type_id),
            )
            const options = surfaceTypes.filter((s) => s.id === selectedId || !usedElsewhere.has(s.id))
            const rowError = errors.surface_counts?.[i]?.num_courts?.message

            return (
              <div
                key={field.id}
                className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white p-4"
              >
                <FormField label="ประเภทพื้นสนาม" className="flex-1 min-w-[160px]">
                  <Select
                    value={selectedId || ''}
                    onChange={(e) => setValue(`surface_counts.${i}.surface_type_id`, Number(e.target.value))}
                  >
                    <option value="">-- เลือกประเภทพื้น --</option>
                    {options.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="จำนวนคอร์ต" error={rowError} className="w-32">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    placeholder="เช่น 2"
                    {...register(`surface_counts.${i}.num_courts`, {
                      valueAsNumber: true,
                      required: 'กรอกจำนวน',
                      min: { value: 1, message: 'อย่างน้อย 1' },
                    })}
                  />
                </FormField>

                <button
                  type="button"
                  onClick={() => surfaceArray.remove(i)}
                  className="mb-0.5 p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-light transition-colors"
                  title="ลบแถวนี้"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>

        {surfaceArray.fields.length > 0 && (
          <p className="text-xs text-muted mt-2">
            รวมทั้งหมด <span className="font-semibold text-ink">{totalCourts}</span> คอร์ต
          </p>
        )}
      </div>

      {/* Indoor/Outdoor */}
      <RadioGroup
        label="ในร่ม / กลางแจ้ง"
        value={indoorOutdoor}
        onChange={(v) => setValue('indoor_outdoor', v as CourtFormData['indoor_outdoor'])}
        options={[
          { value: 'indoor', label: 'ในร่ม (Indoor)' },
          { value: 'outdoor', label: 'กลางแจ้ง (Outdoor)' },
          { value: 'both', label: 'ทั้งสองประเภท' },
        ]}
      />

      {/* ไฟสนาม */}
      <CheckboxField
        label="มีไฟสนาม (สามารถเล่นกลางคืนได้)"
        checked={hasLights}
        onChange={(v) => setValue('has_lights', v)}
      />

      {/* ===== ราคาค่าสนาม ===== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">ราคาค่าสนาม</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => pricingArray.append(EMPTY_PRICING_ROW)}
          >
            + เพิ่มช่วงราคา
          </Button>
        </div>

        {pricingArray.fields.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-bg p-4 text-center text-sm text-muted">
            ยังไม่มีข้อมูลราคา — กดปุ่ม "เพิ่มช่วงราคา" เพื่อเพิ่ม
          </div>
        )}

        <div className="space-y-3">
          {pricingArray.fields.map((field, i) => {
            const rateType = watch(`pricing.${i}.rate_type`) ?? 'hour'
            const isHourly = rateType === 'hour'
            const priceLabel =
              rateType === 'hour' ? 'ราคา (บาท/ชม.)' : rateType === 'day' ? 'ราคา (บาท/วัน)' : 'ราคา (บาท/เดือน)'
            const pricePlaceholder = rateType === 'hour' ? '200' : rateType === 'day' ? '800' : '3000'

            return (
              <div
                key={field.id}
                className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white p-4 relative"
              >
                {/* ประเภทค่าบริการ */}
                <FormField label="ประเภทค่าบริการ" className="w-32">
                  <Select
                    value={rateType}
                    onChange={(e) => {
                      const next = e.target.value as 'hour' | 'day' | 'month'
                      setValue(`pricing.${i}.rate_type`, next)
                      if (next === 'hour') {
                        // Switching back to hourly — restore sensible defaults.
                        setValue(`pricing.${i}.period`, 'day')
                        setValue(`pricing.${i}.time_from`, '06:00')
                        setValue(`pricing.${i}.time_to`, '18:00')
                      } else {
                        // Flat daily/monthly rates have no time-of-day window.
                        setValue(`pricing.${i}.period`, undefined)
                        setValue(`pricing.${i}.time_from`, undefined)
                        setValue(`pricing.${i}.time_to`, undefined)
                      }
                    }}
                  >
                    <option value="hour">รายชั่วโมง</option>
                    <option value="day">รายวัน</option>
                    <option value="month">รายเดือน</option>
                  </Select>
                </FormField>

                {isHourly && (
                  <>
                    {/* ช่วง */}
                    <FormField label="ช่วงเวลา" className="w-28">
                      <Select {...register(`pricing.${i}.period`)}>
                        <option value="day">กลางวัน</option>
                        <option value="night">กลางคืน</option>
                      </Select>
                    </FormField>

                    {/* เวลาเริ่ม */}
                    <FormField label="ตั้งแต่" className="w-28">
                      <Input type="time" {...register(`pricing.${i}.time_from`)} />
                    </FormField>

                    {/* เวลาสิ้นสุด */}
                    <FormField label="ถึง" className="w-28">
                      <Input type="time" {...register(`pricing.${i}.time_to`)} />
                    </FormField>
                  </>
                )}

                {/* ราคา */}
                <FormField
                  label={priceLabel}
                  error={errors.pricing?.[i]?.price?.message}
                  className="w-36"
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      placeholder={pricePlaceholder}
                      {...register(`pricing.${i}.price`, {
                        // Without this the API always rejects the row — an
                        // <input type="number"> still gives RHF a string.
                        valueAsNumber: true,
                        required: 'กรุณากรอกราคา',
                        min: { value: 0, message: 'ราคาต้องมากกว่า 0' },
                      })}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">฿</span>
                  </div>
                </FormField>

                {/* ลบแถว */}
                <button
                  type="button"
                  onClick={() => pricingArray.remove(i)}
                  className="mb-0.5 p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-light transition-colors"
                  title="ลบช่วงราคานี้"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
