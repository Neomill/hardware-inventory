/**
 * The next number in a prefixed sequence: given CUS-001..CUS-008 it returns
 * CUS-009. Ids that do not carry the prefix are ignored, so differently
 * numbered records can share one list without colliding.
 */
export function nextSequentialId(prefix: string, existing: string[], width: number): string {
  let highest = 0

  for (const id of existing) {
    if (!id.startsWith(prefix)) {
      continue
    }

    const number = Number(id.slice(prefix.length))

    if (Number.isInteger(number) && number > highest) {
      highest = number
    }
  }

  return `${prefix}${String(highest + 1).padStart(width, '0')}`
}
