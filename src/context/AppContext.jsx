import React, { createContext, useContext, useReducer, useEffect } from 'react'

const AppContext = createContext(null)

function loadFromStorage(key, fallback) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Erro ao salvar:', e)
  }
}

const initialState = {
  postos: loadFromStorage('postos', []),
  frentistas: loadFromStorage('frentistas', []),
  escalas: loadFromStorage('escalas', {}),
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_POSTO': {
      const postos = [...state.postos, action.payload]
      saveToStorage('postos', postos)
      return { ...state, postos }
    }
    case 'UPDATE_POSTO': {
      const postos = state.postos.map(p => p.id === action.payload.id ? action.payload : p)
      saveToStorage('postos', postos)
      return { ...state, postos }
    }
    case 'DELETE_POSTO': {
      const postos = state.postos.filter(p => p.id !== action.payload)
      const frentistas = state.frentistas.filter(f => f.postoId !== action.payload)
      saveToStorage('postos', postos)
      saveToStorage('frentistas', frentistas)
      return { ...state, postos, frentistas }
    }
    case 'ADD_FRENTISTA': {
      const frentistas = [...state.frentistas, action.payload]
      saveToStorage('frentistas', frentistas)
      return { ...state, frentistas }
    }
    case 'UPDATE_FRENTISTA': {
      const frentistas = state.frentistas.map(f => f.id === action.payload.id ? action.payload : f)
      saveToStorage('frentistas', frentistas)
      return { ...state, frentistas }
    }
    case 'DELETE_FRENTISTA': {
      const frentistas = state.frentistas.filter(f => f.id !== action.payload)
      saveToStorage('frentistas', frentistas)
      return { ...state, frentistas }
    }
    case 'SAVE_ESCALA': {
      const { key, data } = action.payload
      const escalas = { ...state.escalas, [key]: data }
      saveToStorage('escalas', escalas)
      return { ...state, escalas }
    }
    case 'DELETE_ESCALA': {
      const escalas = { ...state.escalas }
      delete escalas[action.payload]
      saveToStorage('escalas', escalas)
      return { ...state, escalas }
    }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider')
  return ctx
}
