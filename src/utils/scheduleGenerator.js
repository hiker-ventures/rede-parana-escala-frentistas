/**
 * scheduleGenerator.js
 * Algoritmo de geração de escala mensal para frentistas.
 * Cada turno é resolvido de forma independente.
 */

import { getDaysInMonth, getSundays, getWeeksInMonth } from './dateUtils'

export const TURNO_LABELS = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }
export const TURNO_OPTIONS = [
  { value: 'manha', label: 'Manhã (06h–14h)' },
  { value: 'tarde', label: 'Tarde (14h–22h)' },
  { value: 'noite', label: 'Noite (22h–06h)' },
]

/**
 * Calcula a quantidade recomendada de frentistas por turno (regime 6×1)
 */
export function calcRecomendado(cobertura) {
  return Math.ceil(cobertura * 7 / 6)
}

/**
 * Gera a escala completa para todos os turnos de um mês.
 *
 * @param {Object} posto  - { cobertura: { manha, tarde, noite } }
 * @param {number} mes    - 1‑12
 * @param {number} ano
 * @param {Object} turnosConfig - { [frentistaid]: 'manha'|'tarde'|'noite'|null }
 * @param {Array}  frentistas   - frentistas ativos do posto
 * @returns {{ success, grade?, daysInMonth?, errors? }}
 *   grade: { [frentistaid]: number[] }  1=trabalho, 0=folga
 */
export function generateSchedule(posto, mes, ano, turnosConfig, frentistas) {
  const daysInMonth = getDaysInMonth(mes, ano)
  const sundays = getSundays(mes, ano)
  const weeks = getWeeksInMonth(mes, ano)

  const grade = {}
  const errors = []

  for (const turno of ['manha', 'tarde', 'noite']) {
    const cobertura = posto.cobertura[turno] || 0
    if (cobertura === 0) continue

    const equipe = frentistas.filter(f => turnosConfig[f.id] === turno)

    if (equipe.length === 0) {
      errors.push({
        turno,
        message: `Turno da ${TURNO_LABELS[turno]} sem frentistas alocados.`,
        reason: `A cobertura mínima é ${cobertura} mas nenhum frentista foi alocado.`,
        action: `Aloque pelo menos ${cobertura} frentista(s) para o turno da ${TURNO_LABELS[turno]}.`,
      })
      continue
    }

    const result = _generateTurnoSchedule(equipe, cobertura, daysInMonth, sundays, weeks, turno)

    if (!result.success) {
      errors.push(result.error)
    } else {
      Object.assign(grade, result.grade)
    }
  }

  if (errors.length > 0) return { success: false, errors }
  return { success: true, grade, daysInMonth }
}

// ─── Geração por turno ────────────────────────────────────────────────────────

function _generateTurnoSchedule(frentistas, M, daysInMonth, sundays, weeks, turno) {
  const N = frentistas.length
  const label = TURNO_LABELS[turno]
  const rec = calcRecomendado(M)

  const err = (reason, action) => ({
    success: false,
    error: {
      turno,
      message: `Não foi possível gerar a escala para o turno da ${label}.`,
      reason,
      action,
    },
  })

  // ── Verificações básicas ──────────────────────────────────────────────────
  if (N < M) {
    return err(
      `A equipe tem ${N} frentista(s) mas a cobertura mínima exige ${M}.`,
      `Adicione pelo menos ${M - N} frentista(s) ao turno da ${label}.`,
    )
  }

  const maxFolgasDia = N - M   // máximo de folgas simultâneas sem violar cobertura

  if (maxFolgasDia === 0) {
    return err(
      `O turno tem ${N} frentista(s) para cobertura mínima de ${M}. Não há margem para folgas no regime 6×1.`,
      `Adicione pelo menos mais 1 frentista ao turno da ${label} (recomendado: ${rec} frentistas).`,
    )
  }

  // ── Passo 1: Inicialização ────────────────────────────────────────────────
  const grade = {}
  frentistas.forEach(f => { grade[f.id] = new Array(daysInMonth).fill(1) })
  const folgasPorDia = new Array(daysInMonth).fill(0)

  // ── Passo 2: Folgas nos domingos ──────────────────────────────────────────
  // Best-effort: distribui domingos de folga para o máximo de frentistas possível.
  // Quando vagas insuficientes, quem ficou sem domingo aparece como alerta na auditoria.
  if (sundays.length > 0) {
    let fi = 0
    for (let s = 0; s < sundays.length && fi < N; s++) {
      const day = sundays[s]
      let slots = 0
      while (slots < maxFolgasDia && fi < N) {
        grade[frentistas[fi].id][day] = 0
        folgasPorDia[day]++
        fi++
        slots++
      }
    }
  }

  // ── Passo 3: Folgas semanais (1 por semana por frentista) ─────────────────
  for (const week of weeks) {
    for (const f of frentistas) {
      // Já tem folga nessa semana?
      if (week.some(d => grade[f.id][d] === 0)) continue

      // Melhor dia da semana: com capacidade, com menor ocupação de folgas
      const candidates = week
        .filter(d => folgasPorDia[d] < maxFolgasDia)
        .sort((a, b) => folgasPorDia[a] - folgasPorDia[b])

      if (candidates.length === 0) {
        return err(
          `Impossível garantir folga semanal para ${f.nome} na semana de ${week[0] + 1} a ${week[week.length - 1] + 1}. Todos os dias da semana já estão com cobertura mínima.`,
          `Adicione mais frentistas ao turno da ${label}.`,
        )
      }

      const day = candidates[0]
      grade[f.id][day] = 0
      folgasPorDia[day]++
    }
  }

  // ── Passo 4: Quebrar sequências > 6 dias ─────────────────────────────────
  let changed = true
  let iterations = 0

  while (changed && iterations < 300) {
    changed = false
    iterations++

    for (const f of frentistas) {
      const seq = _longestWorkSeq(grade[f.id])
      if (seq.length <= 6) continue

      // Alvo: inserir folga próxima ao 6º dia da sequência
      const target = seq.start + 5

      let bestDay = -1
      let bestScore = Infinity
      for (let d = seq.start; d <= seq.end; d++) {
        if (folgasPorDia[d] < maxFolgasDia) {
          const score = Math.abs(d - target)
          if (score < bestScore) { bestScore = score; bestDay = d }
        }
      }

      if (bestDay === -1) {
        return err(
          `Impossível quebrar sequência de ${seq.length} dias consecutivos do frentista ${f.nome} (dias ${seq.start + 1}–${seq.end + 1}) sem violar a cobertura mínima.`,
          `Adicione mais frentistas ao turno da ${label}.`,
        )
      }

      grade[f.id][bestDay] = 0
      folgasPorDia[bestDay]++
      changed = true
      break // reinicia o laço externo
    }
  }

  if (iterations >= 300) {
    return err(
      'O algoritmo excedeu o limite de iterações ao tentar quebrar sequências longas.',
      `Verifique a configuração do turno da ${label}.`,
    )
  }

  // ── Passo 5: Validação final ──────────────────────────────────────────────
  const validation = _validateTurnoGrade(grade, frentistas, M, daysInMonth, sundays, weeks, label)
  if (!validation.success) {
    return err(validation.reason, validation.action)
  }

  return { success: true, grade }
}

// ─── Validação interna ────────────────────────────────────────────────────────

function _validateTurnoGrade(grade, frentistas, M, daysInMonth, sundays, weeks, label) {
  // Cobertura diária
  for (let d = 0; d < daysInMonth; d++) {
    const working = frentistas.filter(f => grade[f.id][d] === 1).length
    if (working < M) {
      return {
        success: false,
        reason: `Cobertura mínima violada no dia ${d + 1} do turno da ${label}: ${working} trabalhando, mínimo exigido ${M}.`,
        action: 'Revise o algoritmo de geração.',
      }
    }
  }

  for (const f of frentistas) {
    // Sequência máxima
    const seq = _longestWorkSeq(grade[f.id])
    if (seq.length > 6) {
      return {
        success: false,
        reason: `${f.nome} tem sequência de ${seq.length} dias consecutivos no turno da ${label}.`,
        action: 'Revise o algoritmo de geração.',
      }
    }

    // Folga semanal
    for (let wi = 0; wi < weeks.length; wi++) {
      const week = weeks[wi]
      if (!week.some(d => grade[f.id][d] === 0)) {
        return {
          success: false,
          reason: `${f.nome} não tem folga na semana ${wi + 1} do turno da ${label}.`,
          action: 'Revise o algoritmo de geração.',
        }
      }
    }

    // Domingo de folga — não bloqueia; quem ficou sem domingo será alertado na auditoria
  }

  return { success: true }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function _longestWorkSeq(days) {
  let maxLen = 0, maxStart = 0, maxEnd = -1
  let curLen = 0, curStart = 0

  for (let i = 0; i < days.length; i++) {
    if (days[i] === 1) {
      if (curLen === 0) curStart = i
      curLen++
      if (curLen > maxLen) {
        maxLen = curLen
        maxStart = curStart
        maxEnd = i
      }
    } else {
      curLen = 0
    }
  }

  return { length: maxLen, start: maxStart, end: maxEnd }
}
