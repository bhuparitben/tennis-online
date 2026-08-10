export interface Province {
  id: number
  name_th: string
  name_en: string
  region: string
}

export interface District {
  id: number
  name_th: string
  province_id: number
}

export interface SurfaceType {
  id: number
  name: string
}

export interface PricingRow {
  period: 'day' | 'night'
  time_from: string
  time_to: string
  price: number | string
}

export interface CourtAmenities {
  has_coach: boolean
  equipment_rental: boolean
  parking_sufficient: boolean
  has_restroom: boolean
  has_shower: boolean
  has_restaurant: boolean
  has_cafe: boolean
  has_stringing: boolean
}

export interface CourtFormData {
  // Step 1 — ข้อมูลพื้นฐาน
  name: string
  province_id: number | null
  district_id: number | null
  address_line: string
  subdistrict: string
  postal_code: string
  google_map_link: string
  phone: string
  line_id: string
  facebook_page: string
  website: string
  open_time: string
  close_time: string
  open_daily: boolean
  // Step 2 — ข้อมูลสนาม
  num_courts: number | null
  surface_type_id: number | null
  indoor_outdoor: 'indoor' | 'outdoor' | 'both'
  has_lights: boolean
  pricing: PricingRow[]
  // Step 3 — บริการเสริม
  amenities: CourtAmenities
  // Step 4 — รูปภาพ
  image_urls: string[]
}

export interface AmbassadorRow {
  id: number
  full_name: string
  email: string | null
  phone: string | null
  line_id: string | null
  province_id: number
  district_zone: string | null
  tennis_role: string | null
  status: 'pending' | 'approved' | 'rejected'
  note: string | null
  created_at: string
  approved_at: string | null
  /** False until the account has both an email and a password set. */
  can_login: boolean
  province: { id: number; name_th: string } | null
  approvedBy: { id: number; name: string } | null
}

export interface UserProfile {
  id: number
  role: 'admin' | 'ambassador'
  full_name: string
  email: string | null
  created_at: string
  // Ambassador-only fields
  phone?: string | null
  line_id?: string | null
  province_id?: number
  province_name?: string | null
  district_zone?: string | null
  tennis_role?: string | null
  status?: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
  role: 'admin' | 'ambassador'
  province_id?: number
  province_name?: string
}

export interface Court {
  id: number
  name: string
  province: Province
  // Optional relations come back as null from Prisma, not undefined.
  district?: District | null
  address_line?: string
  phone?: string
  line_id?: string
  google_map_link?: string
  open_time?: string
  close_time?: string
  open_daily: boolean
  num_courts?: number
  indoor_outdoor: string
  has_lights: boolean
  surface_type_id?: number
  pricing: PricingRow[]
  amenities?: CourtAmenities | null
  status: string
  is_published: boolean
}

export interface Submission {
  id: number
  is_duplicate: boolean
  review_status: string
  court_id?: number
  matched_court_id?: number
  ambassador: { id: number; full_name: string }
  created_at: string
}

// ===== Phase 4 types =====

export interface FieldChange {
  id: number
  field_name: string
  old_value: string
  new_value: string
  is_changed: boolean
  admin_choice?: 'old' | 'new' | null
}

export interface VerificationEvent {
  id: number
  status: string
  note?: string | null
  verified_at: string
  verifiedBy?: { id: number; full_name: string } | null
}

export interface CourtWithRelations extends Court {
  province: Province
  district?: District | null
  pricing: PricingRow[]
  amenities?: CourtAmenities | null
  images?: { id: number; url: string }[]
}

export interface SubmissionDetail {
  id: number
  is_duplicate: boolean
  submit_status: string
  review_status: string
  review_note?: string | null
  created_at: string
  ambassador: { id: number; full_name: string; province?: { name_th: string } }
  court?: CourtWithRelations | null
  matchedCourt?: CourtWithRelations | null
  fieldChanges: FieldChange[]
  verifications: VerificationEvent[]
}
