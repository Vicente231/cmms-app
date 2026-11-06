import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import AppRouter from '@/routes/AppRouter'
import { useAuthStore } from '@/store/authStore'

function App() {
  const initialize = useAuthStore((s) => s.initialize)
  useEffect(() => { initialize() }, [initialize])
  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  )
}

export default App
