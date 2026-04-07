import React, { useState } from 'react'
import { useApp } from '../../context/AppContext'
import PostoForm from './PostoForm'
import { calcRecomendado } from '../../utils/scheduleGenerator'

const TURNO_INFO = [
  { key: 'manha', label: 'Manhã', horario: '06h–14h' },
  { key: 'tarde', label: 'Tarde', horario: '14h–22h' },
  { key: 'noite', label: 'Noite', horario: '22h–06h' },
]

export default function PostosList() {
  const { state, dispatch } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editingPosto, setEditingPosto] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  function handleAdd(data) {
    dispatch({ type: 'ADD_POSTO', payload: { ...data, id: crypto.randomUUID() } })
    setShowForm(false)
  }

  function handleUpdate(data) {
    dispatch({ type: 'UPDATE_POSTO', payload: data })
    setEditingPosto(null)
  }

  function handleDelete(id) {
    const frentistasCount = state.frentistas.filter(f => f.postoId === id).length
    if (frentistasCount > 0) {
      setDeleteConfirm({ id, count: frentistasCount })
    } else {
      dispatch({ type: 'DELETE_POSTO', payload: id })
    }
  }

  function confirmDelete(id) {
    dispatch({ type: 'DELETE_POSTO', payload: id })
    setDeleteConfirm(null)
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Postos</h1>
          <p className="text-sm text-slate-500 mt-1">
            {state.postos.length} posto(s) cadastrado(s)
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Novo Posto
          </button>
        )}
      </div>

      {/* Formulário de cadastro */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Novo Posto</h2>
          <PostoForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Lista de postos */}
      {state.postos.length === 0 && !showForm ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-4xl mb-3">⛽</div>
          <p className="font-medium">Nenhum posto cadastrado ainda.</p>
          <p className="text-sm mt-1">Clique em "Novo Posto" para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {state.postos.map(posto => {
            const frentistasDoPosto = state.frentistas.filter(f => f.postoId === posto.id)
            const ativos = frentistasDoPosto.filter(f => f.status === 'ativo').length

            if (editingPosto?.id === posto.id) {
              return (
                <div key={posto.id} className="bg-white border border-blue-300 rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">Editar: {posto.nome}</h2>
                  <PostoForm
                    initial={posto}
                    onSave={handleUpdate}
                    onCancel={() => setEditingPosto(null)}
                  />
                </div>
              )
            }

            return (
              <div key={posto.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{posto.nome}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {ativos} frentista(s) ativo(s) · {frentistasDoPosto.length} total
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingPosto(posto)}
                      className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-3 py-1 rounded-lg transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(posto.id)}
                      className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {TURNO_INFO.map(({ key, label, horario }) => {
                    const cob = posto.cobertura?.[key] || 0
                    const rec = calcRecomendado(cob)
                    return (
                      <div key={key} className="bg-slate-50 rounded-lg p-3 text-sm">
                        <p className="font-medium text-slate-700">{label}</p>
                        <p className="text-xs text-slate-500 mb-2">{horario}</p>
                        {cob === 0 ? (
                          <span className="text-xs text-slate-400 italic">Desativado</span>
                        ) : (
                          <>
                            <p className="text-slate-600">Mín: <span className="font-semibold">{cob}</span></p>
                            <p className="text-blue-600 text-xs mt-0.5">Rec: {rec} frentistas</p>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-slate-600 mb-4">
              Este posto tem <strong>{deleteConfirm.count}</strong> frentista(s) vinculado(s). Ao excluir o posto,
              todos os frentistas vinculados também serão excluídos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmDelete(deleteConfirm.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Excluir mesmo assim
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
