const API_URL = 'https://script.google.com/macros/s/AKfycbxO5nq5rIxWjRpcPTp27fGCxhwYzYz6B-i_ySYK95vWEnmxtqDxmSOKnitTjVCEZGqqew/exec'

export function getToken()  { return localStorage.getItem('cmms_token') || '' }
export function getUser()   { try { return JSON.parse(localStorage.getItem('cmms_user')) } catch { return null } }
export function setToken(t) { localStorage.setItem('cmms_token', t) }
export function setUser(u)  { localStorage.setItem('cmms_user', JSON.stringify(u)) }
export function clearAuth()  { localStorage.removeItem('cmms_token'); localStorage.removeItem('cmms_user') }

export async function apiGet(action, params = {}) {
  const qs = new URLSearchParams({ action, token: getToken(), ...params })
  const res = await fetch(`${API_URL}?${qs}`)
  return res.json()
}

export async function apiPost(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ ...payload, token: getToken() }),
  })
  return res.json()
}
