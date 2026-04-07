import React, { useState } from 'react'
import { calcRecomendado } from '../../utils/scheduleGenerator'

const EMPTY = { nome: '', cobertura: { manha: 2, tarde: 2, noite: 1 } }

export default function PostoForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY)
  const [errors, setErrors] = useState({})

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  function setCob(turno, raw) {
    const v = Math.max(0, parseInt(raw) || 0)
    setForm(f => ({ ...f, cobertura: { ...f.cobertura, [turno]: v } }))
  }

  function validate() {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome do posto é obrigatório.'
    return e
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({ ...form, nome: form.nome.trim() })
  }

  const TURNOS = [
    { key: 'manha', label: 'Manhã', horario: '06h–14h' },
    { key: 'tarde', label: 'Tarde', horario: '14h–22h' },
    { key: 'noite', label: 'Noite', horario: '22h–06h' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nome do Posto <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.nome}
          onChange={e => setField('nome', e.target.value)}
          placeholder="Ex: Posto Shell Centro"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.nome ? 'border-red-400' : 'border-slate-300'
          }`}
        />
        {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">Cobertura mínima por turno</p>
        <div className="space-y-3">
          {TURNOS.map(({ key, label, horario }) => {
            const cob = form.cobertura[key] || 0
            const rec = calcRecomendado(cob)
            return (
              <div key={key} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <div className="w-32">
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-500">{horario}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600">Mínimo:</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={cob}
                    onChange={e => setCob(key, e.target.value)}
                    className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {cob > 0 && (
                  <div className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded px-2 py-1.5 leading-relaxed">
                    <span className="font-medium text-blue-800">Cobertura mínima</span> = quantos frentistas precisam estar <span className="font-semibold">PRESENTES</span> no turno a cada dia.<br />
                    Para cobertura <span className="font-semibold text-blue-700">{cob}</span>, você precisa de pelo menos{' '}
                    <span className="font-semibold text-blue-700">{rec}</span> frentistas no turno (regime 6×1).
                  </div>
                )}
                {cob === 0 && (
                  <span className="text-xs text-slate-400 italic">Turno desativado</span>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Fórmula: mínimo necessário = ⌈cobertura × 7 / 6⌉ — garante folgas no regime 6×1 sem aperto.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {initial ? 'Salvar alterações' : 'Cadastrar posto'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
