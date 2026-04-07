import React, { useState } from 'react'
import { AppProvider } from './context/AppContext'
import Sidebar from './components/Layout/Sidebar'
import PostosList from './components/Postos/PostosList'
import FrenistasList from './components/Frentistas/FrenistasList'
import EscalaPage from './components/Escala/EscalaPage'

function AppContent() {
  const [page, setPage] = useState('escala')

  const pages = {
    postos: <PostosList />,
    frentistas: <FrenistasList />,
    escala: <EscalaPage />,
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar activePage={page} onNavigate={setPage} />
      <main className="flex-1 overflow-auto">
        {pages[page]}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
