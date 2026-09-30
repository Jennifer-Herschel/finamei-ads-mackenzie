const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  timeZone: 'UTC',
})

/** "2026-08" -> "agosto" */
export function formatMonthName(referenceMonth: string) {
  const [year, month] = referenceMonth.split('-').map(Number)
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)))
}
