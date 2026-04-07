import React from 'react'
import { TURNO_LABELS } from '../../utils/scheduleGenerator'
import { checkTurnoConfig } from '../../utils/scheduleValidator'
import { getSundays } from '../../utils/dateUtils'

const TURNO_OPTIONS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
  { value: null, label: 'Não escalado' },
]

const STATUS_STYLE = {
  ok:      { bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', icon: '✅', text: 'OK' },
  warning: { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: '⚠️', text: 'Abaixo do recomendado' },
  error:   { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', icon: '🚨', text: 'Equipe insuficiente' },
  disabled:{ bg: 'bg-slate-50 border-slate-200', badge: 'bg-slate-100 text-slate-500', icon: '—', text: 'Desativado' },
}

const TURNO_INFO = [
  { key: 'manha', label: 'Manhã', horario: '06h–14h' },
  { key: 'tarde', label: 'Tarde', horario: '14h–22h' },
  { key: 'noite', label: 'Noite', horario: '22h–06h' },
]

export default function TurnoConfig({ posto, frentistas, turnosConfig, onChange, onGenerate, onAjustarCobertura, generating, mes, ano }) {
  const { canGenerate, turnoStatus } = checkTurnoConfig(posto, turnosConfig, frentistas)

  const sundaysCount = (mes && ano) ? getSundays(mes, ano).length : 0

  // Collect error messages for blocked turnos
  const errorMessages = Object.entries(turnoStatus)
    .filter(([, s]) => s.status === 'error')
    .map(([turno, s]) => {
      const label = TURNO_LABELS[turno]
      const maxViavel = Math.floor(s.allocated * 6 / 7)
      return `Turno da ${label}: com ${s.allocated} frentista(s), a cobertura máxima viável é ${maxViavel}. Você configurou ${s.min}. Reduza a cobertura mínima para ${maxViavel} ou adicione mais frentistas.`
    })

  // Check if any active turno has coverage set above what's achievable with current team
  const turnosComCoberturaSuperior = Object.entries(turnoStatus)
    .filter(([, s]) => s.status !== 'disabled' && s.allocated > 0 && s.min > Math.floor(s.allocated * 6 / 7))

  const podeAjustar = turnosComCoberturaSuperior.length > 0

  return (
    <div className="space-y-6">
      {/* Painel de resumo */}
      <div className="grid grid-cols-3 gap-4">
        {TURNO_INFO.map(({ key, label, horario }) => {
          const s = turnoStatus[key]
          if (!s || s.status === 'disabled') return (
            <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl p-4 opacity-50">
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className="text-xs text-slate-400">{horario}</p>
              <p className="text-xs text-slate-400 mt-2 italic">Turno desativado</p>
            </div>
          )

          const style = STATUS_STYLE[s.status]
          return (
            <div key={key} className={`border rounded-xl p-4 ${style.bg}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                  {style.icon} {style.text}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{horario}</p>
              {(() => {
                const maxViavel = s.allocated > 0 ? Math.floor(s.allocated * 6 / 7) : 0
                const coberturaSuperior = s.allocated > 0 && s.min > maxViavel
                const vagasDomingo = sundaysCount > 0 ? sundaysCount * (s.allocated - s.min) : 0
                const domingoInsuficiente = sundaysCount > 0 && s.allocated > 0 && vagasDomingo < s.allocated
                return (
                  <>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Alocados:</span>
                        <span className="font-semibold text-slate-800">{s.allocated}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Cobertura mínima:</span>
                        <span className={`font-semibold ${coberturaSuperior ? 'text-red-600' : s.allocated < s.min ? 'text-red-600' : 'text-slate-800'}`}>{s.min}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Máx. viável c/ equipe:</span>
                        <span className={`font-semibold ${coberturaSuperior ? 'text-red-600' : 'text-green-700'}`}>{maxViavel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Recomendado:</span>
                        <span className={`font-semibold ${s.allocated >= s.rec ? 'text-green-700' : 'text-amber-600'}`}>{s.rec}</span>
                      </div>
                    </div>
                    {coberturaSuperior && (
                      <div className="mt-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                        <p className="text-xs text-red-700 font-semibold">🚨 Cobertura inviável</p>
                        <p className="text-xs text-red-600 mt-0.5">
                          Com {s.allocated} frentista(s), a cobertura máxima viável é <strong>{maxViavel}</strong>. Você configurou <strong>{s.min}</strong>. Reduza a cobertura mínima do posto para <strong>{maxViavel}</strong> ou adicione mais frentistas.
                        </p>
                      </div>
                    )}
                    {!coberturaSuperior && s.status === 'error' && (
                      <p className="text-xs text-red-600 mt-2 font-medium">
                        Equipe insuficiente — impossível gerar escala para este turno
                      </p>
                    )}
                    {s.status === 'warning' && (
                      <p className="text-xs text-amber-700 mt-2">
                        Equipe abaixo do recomendado — escala pode ficar apertada
                      </p>
                    )}
                    {domingoInsuficiente && (
                      <div className="mt-2 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2">
                        <p className="text-xs text-yellow-800 font-semibold">⚠️ Domingos de folga insuficientes</p>
                        <p className="text-xs text-yellow-700 mt-0.5">
                          Com {s.allocated} frentista(s) e cobertura mínima {s.min}, há apenas <strong>{vagasDomingo}</strong> vaga(s) de folga nos {sundaysCount} domingo(s), mas são <strong>{s.allocated}</strong> frentistas. Nem todos terão domingo de folga. Reduza a cobertura mínima ou redistribua a equipe.
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )
        })}
      </div>

      {/* Tabela de configuração de turnos */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-700">
            {frentistas.length} frentista(s) ativo(s) — defina o turno de cada um
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium text-slate-600">Frentista</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-600">Turno deste mês</th>
            </tr>
          </thead>
          <tbody>
            {frentistas.map((f, idx) => (
              <tr key={f.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                <td className="px-5 py-3 font-medium text-slate-800">{f.nome}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {TURNO_OPTIONS.map(({ value, label }) => {
                      const selected = turnosConfig[f.id] === value || (value === null && !turnosConfig[f.id])
                      return (
                        <button
                          key={String(value)}
                          onClick={() => onChange(f.id, value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                            selected
                              ? value === null
                                ? 'bg-slate-200 text-slate-700 border-slate-300'
                                : value === 'manha'
                                ? 'bg-amber-500 text-white border-amber-500'
                                : value === 'tarde'
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-indigo-700 text-white border-indigo-700'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Erros e botão de gerar */}
      {errorMessages.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <p className="text-sm font-semibold text-red-700 mb-2">🚨 Não é possível gerar a escala:</p>
          <ul className="space-y-1">
            {errorMessages.map((msg, i) => (
              <li key={i} className="text-sm text-red-600">• {msg}</li>
            ))}
          </ul>
        </div>
      )}

      {podeAjustar && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-orange-800">Cobertura configurada acima do viável</p>
            <p className="text-sm text-orange-700 mt-0.5">
              A cobertura mínima de {turnosComCoberturaSuperior.length > 1 ? 'alguns turnos está' : 'um turno está'} acima do que é possível com a equipe atual. Ajuste automaticamente para o máximo viável.
            </p>
          </div>
          <button
            onClick={onAjustarCobertura}
            className="flex-shrink-0 bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Ajustar cobertura automaticamente
          </button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={onGenerate}
          disabled={!canGenerate || generating}
          className={`px-6 py-3 rounded-xl font-semibold text-sm transition-colors ${
            canGenerate && !generating
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {generating ? '⏳ Gerando...' : '📅 Gerar Escala'}
        </button>
        {canGenerate && (
          <p className="text-sm text-slate-500">
            Tudo pronto! Clique para gerar a escala completa do mês.
          </p>
        )}
      </div>
    </div>
  )
}
