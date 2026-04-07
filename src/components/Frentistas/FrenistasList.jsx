import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import FrenistaForm from './FrenistaForm'

export default function FrenistasList() {
  const { state, dispatch } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editingFrentista, setEditingFrentista] = useState(null)
  const [filterPosto, setFilterPosto] = useState('')

  const postos = state.postos

  function handleAdd(data) {
    dispatch({ type: 'ADD_FRENTISTA', payload: { ...data, id: crypto.randomUUID() } })
    setShowForm(false)
  }

  function handleUpdate(data) {
    dispatch({ type: 'UPDATE_FRENTISTA', payload: data })
    setEditingFrentista(null)
  }

  function handleDelete(id) {
    if (confirm('Excluir este frentista?')) {
      dispatch({ type: 'DELETE_FRENTISTA', payload: id })
    }
  }

  const filteredFrentistas = filterPosto
    ? state.frentistas.filter(f => f.postoId === filterPosto)
    : state.frentistas

  const totalAtivos = filteredFrentistas.filter(f => f.status === 'ativo').length

  function getPostoNome(postoId) {
    return postos.find(p => p.id === postoId)?.nome || '—'
  }

  if (postos.length === 0) {
    return (
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Frentistas</h1>
        <div className="text-center py-16 text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-3">⛽</div>
          <p className="font-medium">Nenhum posto cadastrado.</p>
          <p className="text-sm mt-1">Cadastre um posto primeiro para adicionar frentistas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Frentistas</h1>
          <p className="text-sm text-slate-500 mt-1">
            {totalAtivos} ativo(s) · {filteredFrentistas.length} total
            {filterPosto && ` — ${getPostoNome(filterPosto)}`}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Novo Frentista
          </button>
        )}
      </div>

      {/* Filtro por posto */}
      {postos.length > 1 && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Filtrar por posto:</label>
          <select
            value={filterPosto}
            onChange={e => setFilterPosto(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos os postos</option>
            {postos.map(p => {
              const ativos = state.frentistas.filter(f => f.postoId === p.id && f.status === 'ativo').length
              return <option key={p.id} value={p.id}>{p.nome} ({ativos} ativos)</option>
            })}
          </select>
        </div>
      )}

      {/* Formulário de cadastro */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Novo Frentista</h2>
          <FrenistaForm postos={postos} onSave={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Lista */}
      {filteredFrentistas.length === 0 && !showForm ? (
        <div className="text-center py-16 text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-3">👷</div>
          <p className="font-medium">Nenhum frentista encontrado.</p>
          <p className="text-sm mt-1">Clique em "Novo Frentista" para cadastrar.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Posto</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredFrentistas.map((f, idx) => {
                if (editingFrentista?.id === f.id) {
                  return (
                    <tr key={f.id} className="border-b border-slate-100">
                      <td colSpan={4} className="px-4 py-4">
                        <FrenistaForm
                          initial={f}
                          postos={postos}
                          onSave={handleUpdate}
                          onCancel={() => setEditingFrentista(null)}
                        />
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr
                    key={f.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      idx % 2 === 0 ? '' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{f.nome}</td>
                    <td className="px-4 py-3 text-slate-600">{getPostoNome(f.postoId)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        f.status === 'ativo'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {f.status === 'ativo' ? '● Ativo' : '○ Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingFrentista(f)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
