import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../store/themeStore'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-divider bg-panel text-secondary hover:text-primary transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 focus:outline-none"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
      ) : (
        <Moon className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
      )}
    </button>
  )
}
