import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface AuthUser {
  id: string
  name: string
  role: string
  email: string
  avatar: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  setUser: (user: AuthUser) => void
  initialize: () => Promise<void>
}

async function fetchProfile(userId: string, email: string): Promise<AuthUser | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (!data) return { id: userId, name: email.split('@')[0], role: 'technician', email, avatar: '' }
  return {
    id: userId,
    name: data.name || email.split('@')[0],
    role: data.role || 'technician',
    email: data.email || email,
    avatar: data.avatar || '',
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const user = await fetchProfile(session.user.id, session.user.email || '')
      set({ token: session.access_token, isAuthenticated: true, user, loading: false })
    } else {
      set({ loading: false })
    }
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const user = await fetchProfile(session.user.id, session.user.email || '')
        set({ token: session.access_token, isAuthenticated: true, user, loading: false })
      } else {
        set({ token: null, isAuthenticated: false, user: null, loading: false })
      }
    })
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const user = await fetchProfile(data.user.id, email)
    set({ token: data.session!.access_token, isAuthenticated: true, user })
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, token: null, isAuthenticated: false })
  },

  register: async (name, email, password) => {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (signUpError) throw signUpError
    // Sign in immediately after signup
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) throw loginError
    const user = await fetchProfile(data.user.id, email)
    set({ token: data.session!.access_token, isAuthenticated: true, user })
  },

  setUser: (user) => set({ user }),
}))
