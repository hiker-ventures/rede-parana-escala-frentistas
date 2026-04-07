import { jsPDF } from 'jspdf'
import autoTable, { applyPlugin } from 'jspdf-autotable'
import { getDaysInMonth, getDayOfWeekShort, isSunday, MONTHS } from './dateUtils'
import { TURNO_LABELS } from './scheduleGenerator'

// Garante que o plugin está aplicado ao prototype do jsPDF (necessário no Vite/ESM)
applyPlugin(jsPDF)

export function exportToPDF(posto, mes, ano, grade, frentistas, turnosConfig) {
  const daysInMonth = getDaysInMonth(mes, ano)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const title = `Escala ${posto.nome} — ${MONTHS[mes - 1]} ${ano}`
  const subtitle = 'Manhã: 06h–14h  |  Tarde: 14h–22h  |  Noite: 22h–06h'
  const geradoEm = new Date().toLocaleString('pt-BR')

  // Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 148.5, 12, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle, 148.5, 18, { align: 'center' })

  // Build table rows
  const head = [['Data', 'Dia', `Manhã\n(06h–14h)`, `Tarde\n(14h–22h)`, `Noite\n(22h–06h)`]]
  const body = []

  const turnoGroups = { manha: [], tarde: [], noite: [] }
  frentistas.forEach(f => {
    const t = turnosConfig[f.id]
    if (t && grade[f.id]) turnoGroups[t].push(f)
  })

  for (let d = 0; d < daysInMonth; d++) {
    const day = (d + 1).toString().padStart(2, '0')
    const month = mes.toString().padStart(2, '0')
    const dow = getDayOfWeekShort(mes, ano, d)
    const sunday = isSunday(mes, ano, d)

    const getNames = (turno) =>
      turnoGroups[turno]
        .filter(f => grade[f.id]?.[d] === 1)
        .map(f => f.nome)
        .join(', ') || '—'

    body.push([
      `${day}/${month}`,
      dow,
      getNames('manha'),
      getNames('tarde'),
      getNames('noite'),
      sunday, // marker for styling
    ])
  }

  autoTable(doc, {
    head,
    body: body.map(r => r.slice(0, 5)),
    startY: 23,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [180, 180, 180] },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold' },
      1: { cellWidth: 12 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowIdx = data.row.index
        const isSundayRow = body[rowIdx]?.[5]
        if (isSundayRow) {
          data.cell.styles.fillColor = [254, 249, 195] // yellow-100
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    margin: { left: 10, right: 10 },
  })

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(120)
    doc.text(
      `Gerado em ${geradoEm}  —  Página ${i} de ${pageCount}`,
      148.5,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' },
    )
  }

  const filename = `escala-${posto.nome.toLowerCase().replace(/\s+/g, '-')}-${MONTHS[mes - 1].toLowerCase()}-${ano}.pdf`
  doc.save(filename)
}
