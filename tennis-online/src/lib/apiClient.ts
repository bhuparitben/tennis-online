import axios from 'axios'

// The session lives in an HttpOnly cookie the server sets on login — it's
// invisible to JS by design (mitigates XSS token theft), so there's no
// Authorization header to attach. `withCredentials` makes the browser send
// that cookie on every request and accept new ones from Set-Cookie.
const api = axios.create({ baseURL: '/api', withCredentials: true })

export default api
