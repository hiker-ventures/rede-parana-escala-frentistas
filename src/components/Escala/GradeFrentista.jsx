import React, { useMemo } from 'react'
import { getDaysInMonth, getDayOfWeekShort, isSunday } from '../../utils/dateUtils'
import { TURNO_LABELS } from '../../utils/scheduleGenerator'

const TURNO_ORDER = ['manha', 'tarde', 'noite']
const TURNO_COLORS = {
  manha: 'text-amber-700 bg-amber-50 border-amber-200',
  tarde: 'text-blue-700 bg-blue-50 border-blue-200',
  noite: 'text-indigo-700 bg-indigo-50 border-indigo-200',
}

export default function GradeFrentista({ grade, frentistas, turnosConfig, posto, mes, ano, onCellToggle, coverageByDay }) {
  const daysInMonth = getDaysInMonth(mes, ano)
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i), [daysInMonth])

  // Group frentistas by turno
  const turnoGroups = useMemo(() => {
    const groups = { manha: [], tarde: [], noite: [] }
    frentistas.forEach(f => {
      const t = turnosConfig[f.id]
      if (t && grade[f.id]) groups[t].push(f)
    })
    return groups
  }, [frentistas, turnosConfig, grade])

  // Days with coverage issues per turno
  const badDays = useMemo(() => {
    const set = {}
    if (!coverageByDay) return set
    for (const turno of TURNO_ORDER) {
      set[turno] = new Set(
        (coverageByDay[turno] || [])
          .filter(d => !d.ok && (posto.cobertura[turno] || 0) > 0)
          .map(d => d.day)
      )
    }
    return set
  }, [coverageByDay, posto])

  const headerCellClass = (d) =>
    isSunday(mes, ano, d)
      ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold min-w-[34px] text-center px-0.5 py-1 border-l text-xs select-none'
      : 'bg-slate-50 border-slate-200 text-slate-600 min-w-[34px] text-center px-0.5 py-1 border-l text-xs select-none'

  return (
    <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200 shadow-sm">
      {TURNO_ORDER.filter(turno => turnoGroups[turno].length > 0).map(turno => (
        <div key={turno}>
          {/* Turno header */}
          <div className={`px-4 py-2 border-b font-semibold text-sm ${TURNO_COLORS[turno]} border`}>
            {turno === 'manha' ? '☀️' : turno === 'tarde' ? '🌤️' : '🌙'} Turno da {TURNO_LABELS[turno]}
            &nbsp;—&nbsp;
            {turnoGroups[turno].length} frentista(s)
            <span className="text-xs font-normal ml-2 opacity-70">
              (cobertura mín: {posto.cobertura[turno]})
            </span>
          </div>

          {/* Grid */}
          <table className="border-collapse w-full bg-white">
            {/* Day numbers header */}
            <thead>
              <tr>
                {/* Sticky name column */}
                <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 min-w-[140px] max-w-[140px]">
                  Frentista
                </th>
                {days.map(d => (
                  <th key={d} className={headerCellClass(d)}>
                    <div>{d + 1}</div>
                    <div className="text-[9px] leading-none opacity-75">{getDayOfWeekShort(mes, ano, d)}</div>
                  </th>
                ))}
                <th className="bg-slate-50 border-b border-l border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 whitespace-nowrap min-w-[64px] text-center">
                  Folgas
                </th>
              </tr>
            </thead>
            <tbody>
              {turnoGroups[turno].map((f, rowIdx) => {
                const row = grade[f.id] || new Array(daysInMonth).fill(1)
                const totalFolgas = row.filter(v => v === 0).length
                return (
                  <tr key={f.id} className="hover:bg-slate-50/50 group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-b border-r border-slate-200 px-3 py-1 text-sm font-medium text-slate-800 min-w-[140px] max-w-[140px] truncate">
                      {f.nome}
                    </td>
                    {row.map((val, d) => {
                      const sunday = isSunday(mes, ano, d)
                      const isWork = val === 1
                      const hasCovIssue = !isWork && badDays[turno]?.has(d)
                      return (
                        <td
                          key={d}
                          onClick={() => onCellToggle(f.id, d)}
                          title={isWork ? `${f.nome} — Dia ${d + 1}: Trabalho` : `${f.nome} — Dia ${d + 1}: Folga`}
                          className={`border-b border-l border-slate-200 min-w-[34px] h-8 text-center cursor-pointer select-none transition-colors text-xs font-medium ${
                            isWork
                              ? sunday
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                                : 'bg-green-50 hover:bg-green-100 text-green-800'
                              : hasCovIssue
                              ? 'bg-red-100 hover:bg-red-200 text-red-600 ring-1 ring-red-400 ring-inset'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                          }`}
                        >
                          {isWork ? (sunday ? '☀' : '✓') : hasCovIssue ? '⚠' : '○'}
                        </td>
                      )
                    })}
                    <td className="border-b border-l border-slate-200 text-center text-xs font-semibold text-slate-600 bg-slate-50 px-2">
                      {totalFolgas}
                    </td>
                  </tr>
                )
              })}

              {/* Coverage row */}
              <tr className="bg-slate-50/80 border-t-2 border-slate-300">
                <td className="sticky left-0 z-10 bg-slate-100 border-b border-r border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 min-w-[140px]">
                  Trabalhando / mín {posto.cobertura[turno]}
                </td>
                {days.map(d => {
                  const cov = coverageByDay?.[turno]?.[d]
                  const count = cov?.working ?? 0
                  const min = posto.cobertura[turno] || 0
                  const ok = count >= min
                  return (
                    <td
                      key={d}
                      className={`border-b border-l border-slate-200 min-w-[34px] h-6 text-center text-[10px] font-bold ${
                        min === 0 ? 'text-slate-400 bg-slate-50' :
                        ok ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                      }`}
                    >
                      {min > 0 ? count : '—'}
                    </td>
                  )
                })}
                <td className="border-b border-l border-slate-200 bg-slate-100" />
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {/* Legend */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex gap-4 flex-wrap text-xs text-slate-600">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-100 border border-green-200 inline-block" /> Trabalho</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-amber-50 border border-amber-200 inline-block" /> Trabalho (domingo)</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-slate-100 border border-slate-200 inline-block" /> Folga</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-100 border border-red-300 inline-block" /> Folga com cobertura insuficiente</span>
        <span className="ml-auto text-slate-400 italic">Clique em uma célula para alternar</span>
      </div>
    </div>
  )
}
