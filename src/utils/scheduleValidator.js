/**
 * scheduleValidator.js
 * Auditoria em tempo real da grade (usada após geração e após edição manual).
 */

import { getDaysInMonth, getSundays, getWeeksInMonth, formatDate, DAYS_SHORT } from './dateUtils'
import { _longestWorkSeq, TURNO_LABELS } from './scheduleGenerator'

/**
 * Audita a grade completa e retorna alertas por frentista e por dia.
 *
 * @param {Object} grade          - { [frentistaid]: number[] }
 * @param {Array}  frentistas     - todos os frentistas do posto
 * @param {Object} turnosConfig   - { [frentistaid]: turno|null }
 * @param {Object} posto          - { cobertura: { manha, tarde, noite } }
 * @param {number} mes
 * @param {number} ano
 * @returns {{ auditData, coverageByDay, totalAlerts, isValid }}
 */
export function auditSchedule(grade, frentistas, turnosConfig, posto, mes, ano) {
  const daysInMonth = getDaysInMonth(mes, ano)
  const sundays = getSundays(mes, ano)
  const weeks = getWeeksInMonth(mes, ano)

  // Agrupar frentistas por turno (apenas os que estão na grade)
  const turnoGroups = { manha: [], tarde: [], noite: [] }
  for (const f of frentistas) {
    const t = turnosConfig[f.id]
    if (t && grade[f.id]) turnoGroups[t].push(f)
  }

  // Cobertura por dia por turno
  const coverageByDay = {}
  for (const turno of ['manha', 'tarde', 'noite']) {
    const min = posto.cobertura[turno] || 0
    coverageByDay[turno] = []
    for (let d = 0; d < daysInMonth; d++) {
      const working = turnoGroups[turno].filter(f => grade[f.id]?.[d] === 1).length
      coverageByDay[turno].push({ day: d, working, min, ok: working >= min })
    }
  }

  // Auditoria por frentista
  const auditData = []
  let totalAlerts = 0

  const scheduledFrentistas = frentistas.filter(f => turnosConfig[f.id] && grade[f.id])

  for (const f of scheduledFrentistas) {
    const turno = turnosConfig[f.id]
    const days = grade[f.id]
    const alerts = []

    const trabalhados = days.filter(d => d === 1).length
    const totalFolgas = days.filter(d => d === 0).length
    const domingosFolga = sundays.filter(d => days[d] === 0).length

    // Domingo de folga — alerta (não bloqueio): pode ocorrer com equipe apertada
    if (sundays.length > 0 && domingosFolga === 0) {
      alerts.push({ type: 'warning', text: 'Sem domingo de folga — equipe insuficiente para garantir domingo para todos' })
    }

    // Folga semanal
    for (let wi = 0; wi < weeks.length; wi++) {
      const week = weeks[wi]
      if (!week.some(d => days[d] === 0)) {
        const s = formatDate(week[0], mes)
        const e = formatDate(week[week.length - 1], mes)
        alerts.push({ type: 'warning', text: `Semana ${wi + 1} (${s} a ${e}) sem folga` })
      }
    }

    // Sequência máxima
    const seq = _longestWorkSeq(days)
    if (seq.length > 6) {
      alerts.push({
        type: 'danger',
        text: `Mais de 6 dias seguidos (${seq.length} dias, do dia ${seq.start + 1} ao dia ${seq.end + 1})`,
      })
    }

    // Cobertura abaixo do mínimo em dias que o frentista folga
    const minCov = posto.cobertura[turno] || 0
    for (let d = 0; d < daysInMonth; d++) {
      if (days[d] === 0 && !coverageByDay[turno][d].ok) {
        alerts.push({
          type: 'warning',
          text: `Cobertura abaixo do mínimo no dia ${formatDate(d, mes)}`,
        })
      }
    }

    totalAlerts += alerts.length

    auditData.push({
      frentista: f,
      turno,
      trabalhados,
      totalFolgas,
      domingosFolga,
      maiorSequencia: seq.length,
      seqStart: seq.start,
      seqEnd: seq.end,
      alerts,
      status: alerts.length === 0 ? 'ok' : alerts.some(a => a.type === 'danger') ? 'danger' : 'warning',
    })
  }

  return { auditData, coverageByDay, totalAlerts, isValid: totalAlerts === 0 }
}

/**
 * Verifica se a configuração de turnos permite gerar a escala.
 * Retorna { canGenerate, turnoStatus }
 */
export function checkTurnoConfig(posto, turnosConfig, frentistas) {
  const turnoStatus = {}
  let canGenerate = true

  for (const turno of ['manha', 'tarde', 'noite']) {
    const min = posto.cobertura[turno] || 0
    if (min === 0) {
      turnoStatus[turno] = { min, rec: 0, allocated: 0, status: 'disabled' }
      continue
    }

    const allocated = frentistas.filter(f => turnosConfig[f.id] === turno).length
    const rec = Math.ceil(min * 7 / 6)

    let status = 'ok'
    if (allocated < min) { status = 'error'; canGenerate = false }
    else if (allocated < rec) status = 'warning'

    turnoStatus[turno] = { min, rec, allocated, status }
  }

  return { canGenerate, turnoStatus }
}
