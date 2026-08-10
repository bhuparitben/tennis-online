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

const EMPTY_ROW = { period: 'day' as const, time_from: '06:00', time_to: '18:00', price: '' }

export default function StepCourtDetails({ register, control, errors, watch, setValue }: Props) {
  const [surfaceTypes, setSurfaceTypes] = useState<SurfaceType[]>([])
  const { fields, append, remove } = useFieldArray({ control, name: 'pricing' })

  const hasLights = watch('has_lights')
  const indoorOutdoor = watch('indoor_outdoor')
  const surfaceTypeId = watch('surface_type_id')

  useEffect(() => {
    api.get<SurfaceType[]>('/surface-types').then((r) => setSurfaceTypes(r.data))
  }, [])

  return (
    <div className="space-y-6">
      {/* จำนวนคอร์ต */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormField label="จำนวนคอร์ต" error={errors.num_courts?.message}>
          <Input
            type="number"
            min={1}
            max={99}
            placeholder="เช่น 4"
            {...register('num_courts', { valueAsNumber: true })}
          />
        </FormField>

        {/* ประเภทพื้นสนาม */}
        <FormField label="ประเภทพื้นสนาม" error={errors.surface_type_id?.message as string}>
          <Select
            value={surfaceTypeId ?? ''}
            onChange={(e) => setValue('surface_type_id', e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">-- เลือกประเภทพื้น --</option>
            {surfaceTypes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </FormField>
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
            onClick={() => append(EMPTY_ROW)}
          >
            + เพิ่มช่วงราคา
          </Button>
        </div>

        {fields.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-bg p-4 text-center text-sm text-muted">
            ยังไม่มีข้อมูลราคา — กดปุ่ม "เพิ่มช่วงราคา" เพื่อเพิ่ม
          </div>
        )}

        <div className="space-y-3">
          {fields.map((field, i) => (
            <div
              key={field.id}
              className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white p-4 relative"
            >
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

              {/* ราคา */}
              <FormField label="ราคา (บาท/ชม.)" error={errors.pricing?.[i]?.price?.message} className="w-36">
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    placeholder="200"
                    {...register(`pricing.${i}.price`, {
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
                onClick={() => remove(i)}
                className="mb-0.5 p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-light transition-colors"
                title="ลบช่วงราคานี้"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
