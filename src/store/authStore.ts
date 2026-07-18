import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

interface AuthState {
  user: { name: string; email: string; role: string; id: string; batch: string } | null
  isAuthenticated: boolean
  initialized: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  initialized: false,
  login: async (email, password) => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Invalid email or password.' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Database authorization profile mismatch.' }
    }

    set({
      user: { 
        id: authData.user.id, 
        email, 
        name: profile.name, 
        role: profile.role === 'student' ? 'candidate' : profile.role,
        batch: authData.user.user_metadata?.batch || 'CSE_C'
      },
      isAuthenticated: true
    })
    
    return { success: true }
  },
  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false })
  },
  restoreSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', session.user.id)
          .single()
          
        if (profile) {
          set({
            user: { 
              id: session.user.id, 
              email: session.user.email || '', 
              name: profile.name, 
              role: profile.role === 'student' ? 'candidate' : profile.role,
              batch: session.user.user_metadata?.batch || 'CSE_C'
            },
            isAuthenticated: true,
            initialized: true
          })
          return
        }
      }
    } catch (err) {
      console.error('Session restore failed:', err)
    }
    set({ user: null, isAuthenticated: false, initialized: true })
  }
}))