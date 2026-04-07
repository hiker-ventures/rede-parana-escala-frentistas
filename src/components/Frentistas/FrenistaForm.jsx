import React, { useState } from 'react'

export default function FrenistaForm({ initial, postos, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { nome: '', postoId: postos[0]?.id || '', status: 'ativo' }
  )
  const [errors, setErrors] = useState({})

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  function validate() {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório.'
    if (!form.postoId) e.postoId = 'Selecione um posto.'
    return e
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({ ...form, nome: form.nome.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.nome}
          onChange={e => setField('nome', e.target.value)}
          placeholder="Nome completo do frentista"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.nome ? 'border-red-400' : 'border-slate-300'
          }`}
        />
        {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Posto <span className="text-red-500">*</span>
        </label>
        <select
          value={form.postoId}
          onChange={e => setField('postoId', e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
            errors.postoId ? 'border-red-400' : 'border-slate-300'
          }`}
        >
          <option value="">Selecione um posto...</option>
          {postos.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        {errors.postoId && <p className="text-red-500 text-xs mt-1">{errors.postoId}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <div className="flex gap-3">
          {[{ v: 'ativo', l: 'Ativo' }, { v: 'inativo', l: 'Inativo' }].map(({ v, l }) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={v}
                checked={form.status === v}
                onChange={() => setField('status', v)}
                className="accent-blue-600"
              />
              <span className="text-sm text-slate-700">{l}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
        💡 O turno de trabalho é definido na hora de gerar a escala de cada mês, permitindo flexibilidade.
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {initial ? 'Salvar alterações' : 'Cadastrar frentista'}
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
