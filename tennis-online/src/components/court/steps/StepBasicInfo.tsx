import { useEffect, useState } from 'react'
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { FormField, Input, Select, CheckboxField } from '../../ui/FormField'
import type { CourtFormData, Province, District } from '../../../types'
import api from '../../../lib/apiClient'

interface Props {
  register: UseFormRegister<CourtFormData>
  errors: FieldErrors<CourtFormData>
  watch: UseFormWatch<CourtFormData>
  setValue: UseFormSetValue<CourtFormData>
}

export default function StepBasicInfo({ register, errors, watch, setValue }: Props) {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)

  const provinceId = watch('province_id')
  const openDaily = watch('open_daily')

  useEffect(() => {
    api.get<Province[]>('/provinces').then((r) => setProvinces(r.data))
  }, [])

  useEffect(() => {
    if (!provinceId) { setDistricts([]); return }
    setLoadingDistricts(true)
    api
      .get<District[]>(`/districts?province_id=${provinceId}`)
      .then((r) => setDistricts(r.data))
      .finally(() => setLoadingDistricts(false))
    setValue('district_id', null)
  }, [provinceId, setValue])

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {/* ชื่อสนาม */}
      <FormField label="ชื่อสนาม / คลับ" required error={errors.name?.message} className="sm:col-span-2">
        <Input
          placeholder="เช่น สนามเทนนิส ABC, คลับ XYZ"
          error={!!errors.name}
          {...register('name', { required: 'กรุณากรอกชื่อสนาม' })}
        />
      </FormField>

      {/* จังหวัด */}
      <FormField label="จังหวัด" required error={errors.province_id?.message as string}>
        <Select
          error={!!errors.province_id}
          value={provinceId ?? ''}
          onChange={(e) => setValue('province_id', e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">-- เลือกจังหวัด --</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>{p.name_th}</option>
          ))}
        </Select>
      </FormField>

      {/* เขต/อำเภอ */}
      <FormField label="เขต / อำเภอ" error={errors.district_id?.message as string}>
        <Select
          disabled={!provinceId || loadingDistricts}
          value={watch('district_id') ?? ''}
          onChange={(e) => setValue('district_id', e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">{loadingDistricts ? 'กำลังโหลด...' : '-- เลือกอำเภอ --'}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>{d.name_th}</option>
          ))}
        </Select>
      </FormField>

      {/* ที่อยู่ */}
      <FormField label="ที่อยู่" error={errors.address_line?.message} className="sm:col-span-2">
        <Input placeholder="เลขที่ ถนน ซอย" {...register('address_line')} />
      </FormField>

      {/* ตำบล/แขวง */}
      <FormField label="ตำบล / แขวง" error={errors.subdistrict?.message}>
        <Input placeholder="ตำบล/แขวง" {...register('subdistrict')} />
      </FormField>

      {/* รหัสไปรษณีย์ */}
      <FormField label="รหัสไปรษณีย์" error={errors.postal_code?.message}>
        <Input placeholder="10200" maxLength={5} {...register('postal_code')} />
      </FormField>

      {/* Google Map */}
      <FormField label="Google Map Link" error={errors.google_map_link?.message} className="sm:col-span-2">
        <Input placeholder="https://maps.google.com/..." {...register('google_map_link')} />
      </FormField>

      {/* เบอร์โทร */}
      <FormField label="เบอร์โทรศัพท์" error={errors.phone?.message}>
        <Input placeholder="0X-XXXX-XXXX" {...register('phone')} />
      </FormField>

      {/* LINE ID */}
      <FormField label="LINE ID" error={errors.line_id?.message}>
        <Input placeholder="@lineid" {...register('line_id')} />
      </FormField>

      {/* Facebook */}
      <FormField label="Facebook Page" error={errors.facebook_page?.message}>
        <Input placeholder="https://fb.com/..." {...register('facebook_page')} />
      </FormField>

      {/* Website */}
      <FormField label="Website" error={errors.website?.message}>
        <Input placeholder="https://..." {...register('website')} />
      </FormField>

      {/* เวลาเปิด-ปิด */}
      <FormField label="เวลาเปิด" error={errors.open_time?.message}>
        <Input type="time" {...register('open_time')} />
      </FormField>

      <FormField label="เวลาปิด" error={errors.close_time?.message}>
        <Input type="time" {...register('close_time')} />
      </FormField>

      {/* เปิดทุกวัน */}
      <div className="sm:col-span-2">
        <CheckboxField
          label="เปิดให้บริการทุกวัน (ไม่หยุดวันหยุดราชการ)"
          checked={openDaily}
          onChange={(v) => setValue('open_daily', v)}
        />
      </div>
    </div>
  )
}
