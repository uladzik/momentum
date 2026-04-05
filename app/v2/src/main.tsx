import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { Login } from './pages/Login.tsx'
import { useAuth } from './hooks/useAuth.ts'

function Router() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-border border-t-foreground animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={session ? <App /> : <Navigate to="/login" replace />}
      />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  </StrictMode>,
)
