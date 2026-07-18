import { create } from 'zustand'

interface ThemeState {
  theme: 'dark' | 'light'
  toggleTheme: () => void
  setTheme: (theme: 'dark' | 'light') => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('sys_theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('sys_theme', nextTheme)
    document.documentElement.classList.toggle('light', nextTheme === 'light')
    return { theme: nextTheme }
  }),
  setTheme: (theme) => {
    localStorage.setItem('sys_theme', theme)
    document.documentElement.classList.toggle('light', theme === 'light')
    set({ theme })
  }
}))
