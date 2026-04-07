import React from 'react'
import { getDaysInMonth, getDayOfWeekShort, isSunday, formatDate, MONTHS } from '../../utils/dateUtils'
import { TURNO_LABELS } from '../../utils/scheduleGenerator'

export default function TabelaOperacional({ grade, frentistas, turnosConfig, posto, mes, ano, coverageByDay }) {
  const daysInMonth = getDaysInMonth(mes, ano)

  // Group frentistas by turno
  const turnoGroups = { manha: [], tarde: [], noite: [] }
  frentistas.forEach(f => {
    const t = turnosConfig[f.id]
    if (t && grade[f.id]) turnoGroups[t].push(f)
  })

  function getWorking(turno, d) {
    return turnoGroups[turno]
      .filter(f => grade[f.id]?.[d] === 1)
      .map(f => f.nome)
  }

  const hasCovIssue = (turno, d) => {
    const min = posto.cobertura[turno] || 0
    if (min === 0) return false
    return (coverageByDay?.[turno]?.[d]?.working ?? 0) < min
  }

  return (
    <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm bg-white border-collapse">
        <thead>
          <tr className="bg-slate-700 text-white">
            <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Data</th>
            <th className="px-4 py-2.5 text-left font-semibold">Dia</th>
            {['manha', 'tarde', 'noite'].map(t => (
              posto.cobertura[t] > 0 && (
                <th key={t} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">
                  {TURNO_LABELS[t]}
                  <span className="font-normal text-slate-300 ml-1 text-xs">
                    {t === 'manha' ? '(06h–14h)' : t === 'tarde' ? '(14h–22h)' : '(22h–06h)'}
                  </span>
                </th>
              )
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: daysInMonth }, (_, d) => {
            const sunday = isSunday(mes, ano, d)
            const dow = getDayOfWeekShort(mes, ano, d)
            const date = formatDate(d, mes)
            const hasAnyIssue = ['manha', 'tarde', 'noite'].some(t => hasCovIssue(t, d))

            return (
              <tr
                key={d}
                className={`border-b border-slate-100 transition-colors ${
                  sunday
                    ? 'bg-amber-50 font-semibold'
                    : hasAnyIssue
                    ? 'bg-red-50'
                    : d % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                <td className={`px-4 py-2 font-mono text-xs font-semibold ${sunday ? 'text-amber-800' : 'text-slate-600'}`}>
                  {date}
                  {sunday && <span className="ml-1 text-amber-600">(Dom)</span>}
                </td>
                <td className={`px-4 py-2 text-xs ${sunday ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>
                  {dow}
                </td>
                {['manha', 'tarde', 'noite'].map(turno => {
                  if (!posto.cobertura[turno]) return null
                  const workers = getWorking(turno, d)
                  const issue = hasCovIssue(turno, d)
                  const min = posto.cobertura[turno]
                  return (
                    <td key={turno} className={`px-4 py-2 text-xs ${issue ? 'text-red-700' : 'text-slate-700'}`}>
                      {workers.length === 0 ? (
                        <span className={`italic ${issue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                          {issue ? `⚠️ 0 / mín ${min}` : '—'}
                        </span>
                      ) : (
                        <>
                          {issue && <span className="text-red-500 font-bold mr-1">⚠️</span>}
                          <span>{workers.join(', ')}</span>
                          {issue && (
                            <span className="ml-1 text-red-500 font-medium">({workers.length}/{min})</span>
                          )}
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Legenda */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex gap-5 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-amber-50 border border-amber-200 inline-block" />
          Domingo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-red-50 border border-red-200 inline-block" />
          <span>⚠️ Cobertura abaixo do mínimo</span>
        </span>
      </div>
    </div>
  )
}
