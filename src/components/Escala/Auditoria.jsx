import React, { useState } from 'react'
import { TURNO_LABELS } from '../../utils/scheduleGenerator'
import { getDaysInMonth, MONTHS } from '../../utils/dateUtils'

const TURNO_ORDER = ['manha', 'tarde', 'noite']

export default function Auditoria({ auditResult, posto, mes, ano }) {
  const [expanded, setExpanded] = useState(true)
  if (!auditResult) return null

  const { auditData, coverageByDay, totalAlerts, isValid } = auditResult
  const daysInMonth = getDaysInMonth(mes, ano)

  // Coverage summary per turno
  const turnosAtivos = TURNO_ORDER.filter(t => (posto.cobertura[t] || 0) > 0)

  return (
    <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className={`px-5 py-4 flex items-center justify-between cursor-pointer ${
          isValid ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'
        }`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{isValid ? '✅' : '⚠️'}</span>
          <div>
            <p className={`font-bold text-base ${isValid ? 'text-green-800' : 'text-red-800'}`}>
              {isValid ? 'Escala válida' : `Escala com ${totalAlerts} pendência(s)`}
            </p>
            <p className="text-xs text-slate-500">
              {MONTHS[mes - 1]} {ano} — {auditData.length} frentista(s) escalado(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isValid && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
              {totalAlerts} alerta(s)
            </span>
          )}
          <span className="text-slate-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="bg-white p-5 space-y-6">
          {/* Cobertura diária por turno */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Cobertura diária por turno</h3>
            <div className="space-y-4">
              {turnosAtivos.map(turno => {
                const covDays = coverageByDay?.[turno] || []
                const min = posto.cobertura[turno] || 0
                const badDays = covDays.filter(d => !d.ok)
                return (
                  <div key={turno}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-slate-600">
                        {TURNO_LABELS[turno]} (mín {min})
                      </span>
                      {badDays.length === 0 ? (
                        <span className="text-xs text-green-600 font-medium">✅ Todos os dias OK</span>
                      ) : (
                        <span className="text-xs text-red-600 font-medium">
                          ⚠️ {badDays.length} dia(s) com déficit
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {covDays.map((d, idx) => (
                        <div
                          key={idx}
                          title={`Dia ${d.day + 1}: ${d.working} trabalhando (mín ${d.min})`}
                          className={`w-7 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                            d.ok
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700 ring-1 ring-red-400'
                          }`}
                        >
                          {d.working}
                        </div>
                      ))}
                    </div>
                    {badDays.length > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        Dias com cobertura insuficiente: {badDays.map(d => d.day + 1).join(', ')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tabela de auditoria por frentista */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Auditoria por frentista</h3>
            <div className="overflow-x-auto scrollbar-thin rounded-lg border border-slate-200">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 border-b border-slate-200">Frentista</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 border-b border-slate-200">Turno</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-slate-600 border-b border-slate-200">Trabalhados</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-slate-600 border-b border-slate-200">Folgas</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-slate-600 border-b border-slate-200">Dom. folga</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-slate-600 border-b border-slate-200">Maior seq.</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 border-b border-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditData.map((item, idx) => (
                    <tr
                      key={item.frentista.id}
                      className={`border-b border-slate-100 ${
                        item.status === 'danger' ? 'bg-red-50' :
                        item.status === 'warning' ? 'bg-yellow-50' :
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-800">{item.frentista.nome}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{TURNO_LABELS[item.turno]}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-700">{item.trabalhados}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-700">{item.totalFolgas}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-semibold ${item.domingosFolga === 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {item.domingosFolga}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-semibold font-mono ${item.maiorSequencia > 6 ? 'text-red-600' : 'text-slate-700'}`}>
                          {item.maiorSequencia}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {item.status === 'ok' ? (
                          <span className="text-green-700 font-medium text-xs">✅ OK</span>
                        ) : (
                          <div className="space-y-0.5">
                            {item.alerts.map((alert, ai) => (
                              <div
                                key={ai}
                                className={`text-xs font-medium ${
                                  alert.type === 'danger' ? 'text-red-600' : 'text-amber-700'
                                }`}
                              >
                                {alert.type === 'danger' ? '🚨' : '⚠️'} {alert.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
