/** Wraps a cell so commas, quotes and newlines survive the round trip. */
function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * Hands the browser a CSV file built from the rows currently on screen.
 * Client-side only: nothing is uploaded and no backend is involved.
 */
export function downloadCsv(filename: string, header: string[], rows: string[][]): void {
  const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}
