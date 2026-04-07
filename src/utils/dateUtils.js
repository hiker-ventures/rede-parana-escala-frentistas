export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function getDaysInMonth(mes, ano) {
  return new Date(ano, mes, 0).getDate()
}

export function getDayOfWeek(mes, ano, dayIdx) {
  // dayIdx is 0-based. Returns 0=Sun, 1=Mon, ..., 6=Sat
  return new Date(ano, mes - 1, dayIdx + 1).getDay()
}

export function getDayOfWeekShort(mes, ano, dayIdx) {
  return DAYS_SHORT[getDayOfWeek(mes, ano, dayIdx)]
}

export function isSunday(mes, ano, dayIdx) {
  return getDayOfWeek(mes, ano, dayIdx) === 0
}

export function getSundays(mes, ano) {
  const total = getDaysInMonth(mes, ano)
  const sundays = []
  for (let d = 0; d < total; d++) {
    if (isSunday(mes, ano, d)) sundays.push(d)
  }
  return sundays
}

export function getWeeksInMonth(mes, ano) {
  // Returns array of weeks, each is an array of 0-based day indices within the month
  // Weeks run Monday → Sunday
  const daysInMonth = getDaysInMonth(mes, ano)
  const day1DOW = new Date(ano, mes - 1, 1).getDay() // 0=Sun

  // Offset from day 0 (= month day 1) to the Monday of that week
  const offsetToMonday = day1DOW === 0 ? -6 : 1 - day1DOW

  const weeks = []
  let weekStart = offsetToMonday

  while (weekStart < daysInMonth) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const d = weekStart + i
      if (d >= 0 && d < daysInMonth) week.push(d)
    }
    if (week.length > 0) weeks.push(week)
    weekStart += 7
  }

  return weeks
}

export function formatDate(dayIdx, mes) {
  const day = (dayIdx + 1).toString().padStart(2, '0')
  const m = mes.toString().padStart(2, '0')
  return `${day}/${m}`
}

export function escalaKey(postoId, mes, ano) {
  return `${postoId}-${mes}-${ano}`
}

export function getAvailableYears() {
  const year = new Date().getFullYear()
  return [year - 1, year, year + 1, year + 2]
}
