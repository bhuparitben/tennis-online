export interface Province {
  id: number
  name_th: string
  name_en: string
  region: string
  /** Present on the admin list endpoint only. */
  _count?: { districts: number }
}

/** Minimal court info embedded in a submission list row (name + thumbnail). */
export interface SubmissionCourtCard {
  id: number
  name: string
  province: { name_th: string } | null
  images: { url: string }[]
}

/** A row from GET /api/submissions — one row per court add/update action. */
export interface SubmissionListItem {
  id: number
  is_duplicate: boolean
  submit_status: 'draft' | 'submitted'
  review_status: 'pending' | 'verified' | 'need_update' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  /** Set when the submission created a brand-new court. */
  court: SubmissionCourtCard | null
  /** Set when the submission was matched against an existing court (is_duplicate). */
  matchedCourt: SubmissionCourtCard | null
  /** Exactly one of ambassador / adminSubmitter is set. */
  ambassador: { id: number; full_name: string } | null
  adminSubmitter: { id: number; name: string } | null
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
  rate_type: 'hour' | 'day' | 'month'
  /** Only meaningful when rate_type === 'hour'. */
  period?: 'day' | 'night'
  time_from?: string
  time_to?: string
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
  // A venue can mix surfaces — e.g. 2 hard + 3 clay courts — so this is a
  // list of (surface type, count) rows rather than one type + one total.
  surface_counts: SurfaceCountInput[]
  indoor_outdoor: 'indoor' | 'outdoor' | 'both'
  has_lights: boolean
  pricing: PricingRow[]
  // Step 3 — บริการเสริม
  amenities: CourtAmenities
  // Step 4 — รูปภาพ
  images: CourtImageInput[]
}

export interface SurfaceCountInput {
  surface_type_id: number
  num_courts: number
}

export interface CourtImageInput {
  url: string
  /** The photo shown first on listings — at most one per court. */
  is_cover: boolean
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
  address_line?: string | null
  subdistrict?: string | null
  postal_code?: string | null
  phone?: string | null
  line_id?: string | null
  facebook_page?: string | null
  website?: string | null
  google_map_link?: string | null
  open_time?: string | null
  close_time?: string | null
  open_daily: boolean
  indoor_outdoor: string
  has_lights: boolean
  surfaceCounts?: {
    id: number
    surface_type_id: number
    num_courts: number
    surfaceType?: { id: number; name: string }
  }[]
  pricing: PricingRow[]
  amenities?: CourtAmenities | null
  status: string
  is_published: boolean
  created_at?: string
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
  images?: { id: number; url: string; is_cover?: boolean; is_approved?: boolean }[]
}

export interface SubmissionDetail {
  id: number
  is_duplicate: boolean
  submit_status: string
  review_status: string
  review_note?: string | null
  created_at: string
  /** Exactly one of ambassador / adminSubmitter is set. */
  ambassador: { id: number; full_name: string; province?: { name_th: string } } | null
  adminSubmitter: { id: number; name: string } | null
  court?: CourtWithRelations | null
  matchedCourt?: CourtWithRelations | null
  fieldChanges: FieldChange[]
  verifications: VerificationEvent[]
}

/** Whichever of ambassador / adminSubmitter is set, for display. */
export function submitterName(s: { ambassador: { full_name: string } | null; adminSubmitter: { name: string } | null }): string {
  return s.ambassador?.full_name ?? (s.adminSubmitter ? `${s.adminSubmitter.name} (Admin)` : 'ไม่ทราบผู้ส่ง')
}
