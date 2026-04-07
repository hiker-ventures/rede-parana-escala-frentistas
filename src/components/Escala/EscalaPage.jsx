import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { generateSchedule } from '../../utils/scheduleGenerator'
import { auditSchedule } from '../../utils/scheduleValidator'
import { exportToPDF } from '../../utils/pdfExport'
import { MONTHS, getAvailableYears, escalaKey } from '../../utils/dateUtils'
import TurnoConfig from './TurnoConfig'
import GradeFrentista from './GradeFrentista'
import TabelaOperacional from './TabelaOperacional'
import Auditoria from './Auditoria'

export default function EscalaPage() {
  const { state, dispatch } = useApp()

  const now = new Date()
  const [postoId, setPostoId] = useState(state.postos[0]?.id || '')
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())

  // Step: 'config' | 'schedule'
  const [step, setStep] = useState('config')
  const [turnosConfig, setTurnosConfig] = useState({})
  const [grade, setGrade] = useState(null)
  const [geradoEm, setGeradoEm] = useState(null)
  const [genErrors, setGenErrors] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [activeView, setActiveView] = useState('grade')
  const [exportLoading, setExportLoading] = useState(false)

  const posto = useMemo(() => state.postos.find(p => p.id === postoId), [state.postos, postoId])
  const frentistasAtivos = useMemo(
    () => state.frentistas.filter(f => f.postoId === postoId && f.status === 'ativo'),
    [state.frentistas, postoId],
  )

  const savedEscalaKey = useMemo(() => escalaKey(postoId, mes, ano), [postoId, mes, ano])
  const savedEscala = useMemo(() => state.escalas[savedEscalaKey], [state.escalas, savedEscalaKey])

  // Audit computed in real-time whenever grade changes
  const auditResult = useMemo(() => {
    if (!grade || !posto) return null
    return auditSchedule(grade, frentistasAtivos, turnosConfig, posto, mes, ano)
  }, [grade, frentistasAtivos, turnosConfig, posto, mes, ano])

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handlePostoChange(id) {
    setPostoId(id)
    setStep('config')
    setGrade(null)
    setGenErrors(null)
    setTurnosConfig({})
  }

  function handleMonthChange(newMes, newAno) {
    setMes(newMes)
    setAno(newAno)
    setStep('config')
    setGrade(null)
    setGenErrors(null)
  }

  function handleTurnoChange(frentistaid, turno) {
    setTurnosConfig(prev => ({ ...prev, [frentistaid]: turno }))
  }

  function handleAjustarCobertura() {
    if (!posto) return
    const novaCobertura = { ...posto.cobertura }
    for (const turno of ['manha', 'tarde', 'noite']) {
      const min = posto.cobertura[turno] || 0
      if (min === 0) continue
      const allocated = frentistasAtivos.filter(f => turnosConfig[f.id] === turno).length
      if (allocated === 0) continue
      const maxViavel = Math.floor(allocated * 6 / 7)
      if (min > maxViavel) novaCobertura[turno] = maxViavel
    }
    dispatch({ type: 'UPDATE_POSTO', payload: { ...posto, cobertura: novaCobertura } })
  }

  function handleGenerate() {
    if (!posto) return
    setGenerating(true)
    setGenErrors(null)

    // Delay mínimo para o spinner aparecer antes do cálculo pesado
    setTimeout(() => {
      try {
        const result = generateSchedule(posto, mes, ano, turnosConfig, frentistasAtivos)
        setGenerating(false)

        if (!result.success) {
          setGenErrors(result.errors)
          return
        }

        const ts = new Date().toISOString()
        setGrade(result.grade)
        setGeradoEm(ts)
        setStep('schedule')
        setActiveView('grade')

        dispatch({
          type: 'SAVE_ESCALA',
          payload: {
            key: savedEscalaKey,
            data: { postoId, mes, ano, turnosConfig, grade: result.grade, geradoEm: ts },
          },
        })
      } catch (err) {
        setGenerating(false)
        setGenErrors([{
          turno: 'geral',
          message: 'Erro inesperado ao gerar a escala.',
          reason: err?.message || String(err),
          action: 'Tente novamente ou recarregue a página.',
        }])
        console.error('Erro em generateSchedule:', err)
      }
    }, 50)
  }

  function handleLoadSaved() {
    if (!savedEscala) return
    setTurnosConfig(savedEscala.turnosConfig)
    setGrade(savedEscala.grade)
    setGeradoEm(savedEscala.geradoEm)
    setStep('schedule')
    setActiveView('grade')
  }

  function handleRegenerate() {
    setStep('config')
    setGrade(null)
    setGenErrors(null)
  }

  const handleCellToggle = useCallback((frentistaid, dayIdx) => {
    setGrade(prev => {
      if (!prev || !prev[frentistaid]) return prev
      const newRow = [...prev[frentistaid]]
      newRow[dayIdx] = newRow[dayIdx] === 1 ? 0 : 1
      return { ...prev, [frentistaid]: newRow }
    })
  }, [])

  // Persiste o grade no localStorage sempre que ele muda por edição manual
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (!grade || !posto || step !== 'schedule') return
    dispatch({
      type: 'SAVE_ESCALA',
      payload: {
        key: savedEscalaKey,
        data: { postoId, mes, ano, turnosConfig, grade, geradoEm },
      },
    })
  }, [grade]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleExportPDF() {
    if (!grade || !posto) return
    setExportLoading(true)
    try {
      exportToPDF(posto, mes, ano, grade, frentistasAtivos, turnosConfig)
    } catch (e) {
      alert('Erro ao gerar PDF: ' + e.message)
    }
    setExportLoading(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (state.postos.length === 0) {
    return (
      <div className="p-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Escala</h1>
        <div className="text-center py-16 text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-3">⛽</div>
          <p className="font-medium">Nenhum posto cadastrado.</p>
          <p className="text-sm mt-1">Vá em <strong>Postos</strong> e cadastre um posto antes de gerar escalas.</p>
        </div>
      </div>
    )
  }

  const years = getAvailableYears()

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Escala</h1>
          <p className="text-sm text-slate-500 mt-1">Geração e visualização de escala mensal</p>
        </div>
        {step === 'schedule' && (
          <div className="flex gap-2">
            <button
              onClick={handleRegenerate}
              className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              ↩ Reconfigurar
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exportLoading}
              className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {exportLoading ? '⏳' : '📄'} Exportar PDF
            </button>
          </div>
        )}
      </div>

      {/* Step 1 — Seleção de posto e mês */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-4">
          {step === 'schedule' ? '📍 Escala gerada para:' : '1. Selecione o posto e o mês'}
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Posto</label>
            <select
              value={postoId}
              onChange={e => handlePostoChange(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {state.postos.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Mês</label>
            <select
              value={mes}
              onChange={e => handleMonthChange(parseInt(e.target.value), ano)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ano</label>
            <select
              value={ano}
              onChange={e => handleMonthChange(mes, parseInt(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Saved schedule indicator */}
          {savedEscala && step === 'config' && (
            <div className="flex items-center gap-3 ml-2">
              <div className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                💾 Escala salva de {new Date(savedEscala.geradoEm).toLocaleDateString('pt-BR')}
              </div>
              <button
                onClick={handleLoadSaved}
                className="text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Carregar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* No frentistas */}
      {frentistasAtivos.length === 0 && (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="text-3xl mb-2">👷</div>
          <p className="font-medium">Nenhum frentista ativo neste posto.</p>
          <p className="text-sm mt-1">Vá em <strong>Frentistas</strong> e cadastre frentistas ativos para este posto.</p>
        </div>
      )}

      {/* Step 2 — Configuração de turnos */}
      {frentistasAtivos.length > 0 && step === 'config' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">2</div>
            <h2 className="text-base font-semibold text-slate-800">Defina o turno de cada frentista para {MONTHS[mes - 1]} {ano}</h2>
          </div>

          <TurnoConfig
            posto={posto}
            frentistas={frentistasAtivos}
            turnosConfig={turnosConfig}
            onChange={handleTurnoChange}
            onGenerate={handleGenerate}
            onAjustarCobertura={handleAjustarCobertura}
            generating={generating}
            mes={mes}
            ano={ano}
          />

          {/* Errors from generation attempt */}
          {genErrors && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
              <p className="font-semibold text-red-800 text-sm">🚨 Não foi possível gerar a escala:</p>
              {genErrors.map((err, i) => (
                <div key={i} className="bg-white border border-red-200 rounded-lg p-4 text-sm">
                  <p className="font-semibold text-red-700">{err.message}</p>
                  <p className="text-red-600 mt-1">Por quê: {err.reason}</p>
                  <p className="text-slate-600 mt-1 font-medium">O que fazer: {err.action}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Visualização da escala */}
      {step === 'schedule' && grade && posto && (
        <div className="space-y-6">
          {/* Info bar */}
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-3">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <span>✅</span>
              <span className="font-semibold">
                Escala {MONTHS[mes - 1]} {ano} — {posto.nome}
              </span>
              <span className="text-green-600 font-normal">
                · gerada em {new Date(geradoEm).toLocaleString('pt-BR')}
              </span>
            </div>
            <span className="text-xs text-green-600">Clique nas células para editar manualmente</span>
          </div>

          {/* View toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveView('grade')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'grade'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              🗂️ Grade por Frentista
            </button>
            <button
              onClick={() => setActiveView('operacional')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'operacional'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📋 Tabela Operacional
            </button>
          </div>

          {/* Views */}
          {activeView === 'grade' ? (
            <GradeFrentista
              grade={grade}
              frentistas={frentistasAtivos}
              turnosConfig={turnosConfig}
              posto={posto}
              mes={mes}
              ano={ano}
              onCellToggle={handleCellToggle}
              coverageByDay={auditResult?.coverageByDay}
            />
          ) : (
            <TabelaOperacional
              grade={grade}
              frentistas={frentistasAtivos}
              turnosConfig={turnosConfig}
              posto={posto}
              mes={mes}
              ano={ano}
              coverageByDay={auditResult?.coverageByDay}
            />
          )}

          {/* Auditoria — sempre visível */}
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-3">📊 Auditoria da Escala</h2>
            <Auditoria
              auditResult={auditResult}
              posto={posto}
              mes={mes}
              ano={ano}
            />
          </div>

          {/* Export button at bottom */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleExportPDF}
              disabled={exportLoading}
              className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 shadow-sm"
            >
              {exportLoading ? '⏳ Gerando PDF...' : '📄 Exportar PDF'}
            </button>
            <button
              onClick={handleRegenerate}
              className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-6 py-3 rounded-xl text-sm transition-colors"
            >
              ↩ Reconfigurar Turnos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
