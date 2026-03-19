// This file is kept for compatibility. All API calls now use src/lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export default api
