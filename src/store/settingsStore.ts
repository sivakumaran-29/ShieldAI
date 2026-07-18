import { create } from 'zustand'

export interface PlatformSettings {
  workspaceIdentifier: string
  integrityThreshold: number
  requireCamera: boolean
  requireTabFocus: boolean
  allowedLangs: string[]
  maxExecutionTime: number
  maxMemoryLimit: number
}

interface SettingsStore extends PlatformSettings {
  updateSettings: (settings: Partial<PlatformSettings>) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  workspaceIdentifier: 'AMRITA_BATCH_2026',
  integrityThreshold: 75,
  requireCamera: true,
  requireTabFocus: true,
  allowedLangs: ['python', 'javascript'],
  maxExecutionTime: 2500,
  maxMemoryLimit: 256,
  
  updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings }))
}))
