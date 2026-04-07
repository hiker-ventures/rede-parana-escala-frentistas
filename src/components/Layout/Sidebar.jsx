import React from 'react'

const NAV_ITEMS = [
  { id: 'postos', label: 'Postos', icon: '⛽' },
  { id: 'frentistas', label: 'Frentistas', icon: '👷' },
  { id: 'escala', label: 'Escala', icon: '📅' },
]

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="w-56 min-h-screen bg-slate-900 text-white flex flex-col flex-shrink-0">
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="text-lg font-bold text-white leading-tight">⛽ Escala</div>
        <div className="text-xs text-slate-400 mt-0.5">Gestão de Frentistas</div>
      </div>

      <nav className="flex-1 p-3">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1 text-left ${
              activePage === item.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">v1.0 — offline</p>
      </div>
    </aside>
  )
}
