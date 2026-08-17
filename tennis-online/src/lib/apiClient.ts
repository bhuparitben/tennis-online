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
