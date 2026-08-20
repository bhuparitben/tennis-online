import axios from 'axios'

// In dev, frontend and backend are same-origin via Vite's proxy, so the
// relative '/api' path works as-is. In production, frontend (Vercel) and
// backend (Render) are on different domains, so this must be set to the
// backend's full URL, e.g. VITE_API_URL=https://tennis-api.onrender.com/api
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// The session lives in an HttpOnly cookie the server sets on login — it's
// invisible to JS by design (mitigates XSS token theft), so there's no
// Authorization header to attach. `withCredentials` makes the browser send
// that cookie on every request and accept new ones from Set-Cookie.
const api = axios.create({ baseURL: API_BASE, withCredentials: true })

export default api

// Uploaded photo URLs come back from the API as relative paths like
// "/uploads/xxx.jpg" (the server has no way to know its own public URL).
// That's fine when frontend and backend share an origin, but once they're
// on different domains a relative path resolves against the *frontend's*
// domain instead — resolve it against the API's own origin here so photos
// keep loading wherever the frontend is deployed.
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '')
export function resolveAssetUrl(url: string): string {
  if (!url || !url.startsWith('/')) return url // already absolute, or a blob:/data: URL
  return `${API_ORIGIN}${url}`
}

// Thai names for the top-level field paths a Zod validation error can point
// at — good enough to read at a glance without a full nested-path dictionary
// for every array/object field the schema has.
const FIELD_PATH_LABELS: Record<string, string> = {
  name: 'ชื่อสนาม / คลับ',
  province_id: 'จังหวัด',
  district_id: 'อำเภอ/เขต',
  address_line: 'ที่อยู่',
  subdistrict: 'ตำบล/แขวง',
  postal_code: 'รหัสไปรษณีย์',
  google_map_link: 'Google Map Link',
  phone: 'เบอร์โทรศัพท์',
  line_id: 'LINE ID',
  facebook_page: 'Facebook Page',
  website: 'Website',
  open_time: 'เวลาเปิด',
  close_time: 'เวลาปิด',
  surface_counts: 'จำนวนคอร์ตแยกตามพื้นสนาม',
  pricing: 'ราคาค่าสนาม',
  amenities: 'บริการเสริม',
  images: 'รูปภาพ',
}

interface ApiErrorIssue { path: string; message: string }
interface ApiErrorBody { error?: string; issues?: ApiErrorIssue[] }

/**
 * Turns the API's `{ error, issues }` validation response into one readable
 * Thai string — "Invalid input" alone doesn't say which field, `issues`
 * (added alongside Zod's raw `flatten()`) carries the exact path + message
 * needed to point at it.
 */
export function formatApiError(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: ApiErrorBody } })?.response?.data
  if (!body) return fallback

  if (body.issues && body.issues.length > 0) {
    const lines = body.issues.map((issue) => {
      const topLevel = issue.path.split('.')[0]
      const label = FIELD_PATH_LABELS[topLevel] ?? issue.path
      return `• ${label}: ${issue.message}`
    })
    return `กรอกข้อมูลไม่ถูกต้อง:\n${lines.join('\n')}`
  }

  return body.error ?? fallback
}
