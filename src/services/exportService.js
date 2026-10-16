export function csvText(columns, rows) {
  function cell(value) {
    let text = String(value ?? '')
    // Keep user text from being treated as a spreadsheet formula.
    if (typeof value === 'string' && /^\s*[=+\-@]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  return [
    columns.map((column) => cell(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => cell(row[column.key])).join(',')),
  ].join('\r\n')
}

function download(title, blob, extension) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.${extension}`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(title, columns, rows) {
  download(
    title,
    new Blob(['\ufeff', csvText(columns, rows)], { type: 'text/csv;charset=utf-8' }),
    'csv',
  )
}

// Build a real PDF; the bundled Unicode font keeps comments and names readable.
export async function createPdf(title, columns, rows, fontBytes) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  let binary = ''
  const bytes = new Uint8Array(fontBytes)
  for (let index = 0; index < bytes.length; index += 4096) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 4096))
  }
  doc.addFileToVFS('DroidSansFallback.ttf', btoa(binary))
  doc.addFont('DroidSansFallback.ttf', 'Report', 'normal')
  doc.setFont('Report')
  doc.setProperties({ title })
  const width = 269 / columns.length
  let y = 28
  function heading() {
    doc.setFontSize(14)
    doc.text(title, 14, 12)
    doc.setFontSize(9)
    doc.text(`${rows.length} filtered results - ReLoop Melbourne`, 14, 18)
    columns.forEach((column, index) => doc.text(column.label, 16 + index * width, 24))
    y = 28
  }
  heading()
  for (const row of rows) {
    const lines = columns.map((column) =>
      doc.splitTextToSize(String(row[column.key] ?? ''), width - 4),
    )
    const count = Math.max(...lines.map((cell) => cell.length))
    if (count * 4 + 4 <= 162 && y + count * 4 + 4 > 190) {
      doc.addPage()
      heading()
    }
    let offset = 0
    // Split long comments across pages without cutting off their text.
    while (offset < count) {
      if (y >= 184) {
        doc.addPage()
        heading()
      }
      const take = Math.min(count - offset, Math.floor((190 - y) / 4) - 1)
      const height = take * 4 + 4
      lines.forEach((cell, index) => {
        doc.setDrawColor(180)
        doc.rect(14 + index * width, y, width, height)
        const text =
          offset && cell.length <= 4 ? cell.slice(0, take) : cell.slice(offset, offset + take)
        doc.text(text, 16 + index * width, y + 4)
      })
      y += height
      offset += take
    }
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page)
    doc.text(`Page ${page} of ${doc.getNumberOfPages()}`, 14, 202)
  }
  return doc.output('arraybuffer')
}

let fontBytes
export async function downloadPdf(title, columns, rows) {
  if (!fontBytes) {
    const response = await fetch(`${import.meta.env.BASE_URL}fonts/DroidSansFallback.ttf`)
    if (!response.ok) throw new Error('The PDF font could not be loaded. Please try again.')
    fontBytes = await response.arrayBuffer()
  }
  const bytes = await createPdf(title, columns, rows, fontBytes)
  download(title, new Blob([bytes], { type: 'application/pdf' }), 'pdf')
}
