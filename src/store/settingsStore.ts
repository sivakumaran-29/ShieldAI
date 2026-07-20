import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PlatformSettings {
  workspaceIdentifier: string
  integrityThreshold: number
  requireCamera: boolean
  requireTabFocus: boolean
  allowedLangs: string[]
  maxExecutionTime: number
  maxMemoryLimit: number
  enableAdvancedAI: boolean
  enableOfflineSync: boolean
  enableBehavioralTracking: boolean
}

interface SettingsStore extends PlatformSettings {
  updateSettings: (settings: Partial<PlatformSettings>) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
  workspaceIdentifier: 'AMRITA_BATCH_2026',
  integrityThreshold: 75,
  requireCamera: true,
  requireTabFocus: true,
  enableAdvancedAI: true,
  enableOfflineSync: true,
  enableBehavioralTracking: true,
  allowedLangs: ['python', 'javascript', 'java', 'cpp', 'c'],
  maxExecutionTime: 2500,
  maxMemoryLimit: 256,
  
  updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings }))
    }),
    {
      name: 'shieldai-platform-settings', // unique name
    }
  )
)
