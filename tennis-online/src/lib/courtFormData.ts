import type { CourtFormData, CourtWithRelations } from '../types'

export const DEFAULT_AMENITIES: CourtFormData['amenities'] = {
  has_coach: false, equipment_rental: false, parking_sufficient: false,
  has_restroom: false, has_shower: false, has_restaurant: false,
  has_cafe: false, has_stringing: false,
}

export const EMPTY_COURT_FORM: CourtFormData = {
  name: '', province_id: null, district_id: null,
  address_line: '', subdistrict: '', postal_code: '',
  google_map_link: '', phone: '', line_id: '', facebook_page: '', website: '',
  open_time: '', close_time: '', open_daily: false,
  surface_counts: [], indoor_outdoor: 'outdoor',
  has_lights: false, pricing: [],
  amenities: DEFAULT_AMENITIES,
  images: [],
}

/**
 * Maps the API's court shape back into the wizard's form shape — used both
 * for editing an ambassador's own pending submission and for prefilling the
 * "verify/update" wizard from a published court's current data.
 */
export function courtToFormData(court: CourtWithRelations): CourtFormData {
  return {
    name: court.name,
    province_id: court.province.id,
    district_id: court.district?.id ?? null,
    address_line: court.address_line ?? '',
    subdistrict: court.subdistrict ?? '',
    postal_code: court.postal_code ?? '',
    google_map_link: court.google_map_link ?? '',
    phone: court.phone ?? '',
    line_id: court.line_id ?? '',
    facebook_page: court.facebook_page ?? '',
    website: court.website ?? '',
    open_time: court.open_time ?? '',
    close_time: court.close_time ?? '',
    open_daily: court.open_daily,
    surface_counts: (court.surfaceCounts ?? []).map((s) => ({
      surface_type_id: s.surface_type_id,
      num_courts: s.num_courts,
    })),
    indoor_outdoor: (court.indoor_outdoor as CourtFormData['indoor_outdoor']) ?? 'outdoor',
    has_lights: court.has_lights,
    pricing: court.pricing.map((p) => ({
      rate_type: p.rate_type,
      period: p.period,
      time_from: p.time_from,
      time_to: p.time_to,
      price: Number(p.price),
    })),
    amenities: court.amenities ?? DEFAULT_AMENITIES,
    images: (court.images ?? []).map((img) => ({ url: img.url, is_cover: !!img.is_cover })),
  }
}
