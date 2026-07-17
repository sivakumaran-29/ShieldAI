import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

interface AuthState {
  user: { name: string; email: string; role: string; id: string } | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email, password) => {
    // 1. Authenticate user credentials against Supabase Auth engine
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Invalid email or password.' }
    }

    // 2. Query the matching record inside the public profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Database authorization profile mismatch.' }
    }

    // 3. Update global state with user session attributes
    set({
      user: { id: authData.user.id, email, name: profile.name, role: profile.role === 'student' ? 'candidate' : profile.role },
      isAuthenticated: true,
    })
    
    return { success: true }
  },
  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false })
  }
}))