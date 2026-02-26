import './App.css'
import { Brain, FileText, LineChart, Moon, Settings, Sparkles, Sun } from 'lucide-react'
import { DocumentUploadCard } from './components/DocumentUpload'
import { DocumentList } from './components/DocumentList'
import { QueryConsole } from './components/QueryConsole'
import { SystemStatusPanel } from './components/SystemStatus'
import { PinnedHighlights } from './components/PinnedHighlights'
import { SessionList } from './components/SessionList'
import { Tour } from './components/Tour'
import { ToastProvider } from './contexts/ToastContext'
import { DashboardProvider, useDashboard } from './contexts/DashboardContext'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'

function AppContent() {
  const { theme, setTheme } = useDashboard()

  return (
    <div
      className={
        theme === 'light'
          ? 'min-h-screen bg-slate-100 text-slate-900'
          : 'min-h-screen bg-[radial-gradient(circle_at_top,_#1e293b_0,_#020617_55%,_#000_100%)] text-slate-50'
      }
    >
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 pb-8 pt-4 md:px-6 md:pt-6">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-slate-700/70 bg-slate-950/70 px-5 py-3 shadow-lg shadow-black/40 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 shadow-md shadow-sky-500/40">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                  MRS: Medical Research Synthesizer
                </h1>
                <Badge variant="success">Alpha</Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                Ask clinical questions, review evidence, and track your research sessions in one place.
              </p>
            </div>
          </div>
          <div className="flex h-8 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" className="hidden shrink-0 sm:flex">
              <Sparkles className="mr-1.5 h-4 w-4" />
              Guided prompts
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 shrink-0 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,3fr)_minmax(360px,1.2fr)]">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            <Tour />
            <QueryConsole />
          </section>

          <aside className="flex min-w-0 flex-col space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3 text-xs text-slate-300 shadow-md shadow-black/40">
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-sky-400" />
                <span className="font-medium text-sky-100">Today&apos;s research snapshot</span>
              </div>
              <div className="hidden gap-3 text-[11px] text-slate-400 sm:flex">
                <span>12 queries / 3 sessions</span>
                <span>24 papers cited</span>
              </div>
            </div>

            <PinnedHighlights />
            <SessionList />

            <DocumentUploadCard />
            <DocumentList />
            <SystemStatusPanel />

            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-800/70 bg-slate-950/40 px-4 py-3 text-[11px] text-slate-400">
              <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span>
                Tip: try suggested questions or Templates for instant demo results. Use ⌘↵ to submit.
              </span>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <DashboardProvider>
        <AppContent />
      </DashboardProvider>
    </ToastProvider>
  )
}

export default App
