import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { PinnedAnswer, ResearchResponse } from '../api/types'

export type RunDemoQueryFn = (demoKey: string, question: string) => void

interface DashboardContextValue {
  pinned: PinnedAnswer[]
  pinAnswer: (question: string, response: ResearchResponse) => void
  unpinAnswer: (id: string) => void
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  tourDone: boolean
  setTourDone: (done: boolean) => void
  runDemoQueryRef: React.MutableRefObject<RunDemoQueryFn | null>
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

function applyThemeClass(t: 'dark' | 'light') {
  document.documentElement.classList.toggle('light', t === 'light')
  document.documentElement.classList.toggle('dark', t === 'dark')
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [pinned, setPinned] = useState<PinnedAnswer[]>([])
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    const t = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
    applyThemeClass(t)
    return t
  })
  const [tourDone, setTourDone] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('tourDone') === 'true'
  })

  const setTheme = useCallback((t: 'dark' | 'light') => {
    setThemeState(t)
    localStorage.setItem('theme', t)
    applyThemeClass(t)
  }, [])

  const pinAnswer = useCallback((question: string, response: ResearchResponse) => {
    setPinned((prev) => [
      ...prev,
      {
        id: `pin-${Date.now()}`,
        question,
        response,
        pinnedAt: new Date().toISOString(),
      },
    ])
  }, [])

  const unpinAnswer = useCallback((id: string) => {
    setPinned((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const runDemoQueryRef = useRef<RunDemoQueryFn | null>(null)

  return (
    <DashboardContext.Provider
      value={{
        pinned,
        pinAnswer,
        unpinAnswer,
        theme,
        setTheme,
        tourDone,
        setTourDone,
        runDemoQueryRef,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
