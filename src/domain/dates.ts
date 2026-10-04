/**
 * Calendar helpers shared by inventory, ledger and reports. Every day boundary
 * is the device's local day, because "today's sales" means the store's day,
 * not UTC's.
 */

/** Inclusive at both ends. Build one with dayRange() to cover whole days. */
export type DateRange = {
  from: Date
  to: Date
}

/** "2025-05-21" in local time. Sorts correctly as a string. */
export type DayKey = string

export function toDayKey(value: Date | string): DayKey {
  const date = typeof value === 'string' ? new Date(value) : value

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/** Local midnight at the start of the day "2025-05-21". */
export function fromDayKey(key: DayKey): Date {
  const [year, month, day] = key.split('-').map(Number)

  return new Date(year, month - 1, day)
}

export function startOfDay(date: Date): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  return start
}

export function endOfDay(date: Date): Date {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  return end
}

/** Whole days from the start of `from` to the end of `to`. */
export function dayRange(from: Date, to: Date): DateRange {
  return { from: startOfDay(from), to: endOfDay(to) }
}

/** The last `days` whole days ending with the day of `now`. 7 means a week, today included. */
export function lastNDays(now: Date, days: number): DateRange {
  const from = new Date(now)
  from.setDate(from.getDate() - (Math.max(1, Math.floor(days)) - 1))

  return dayRange(from, now)
}

/** No range means no limit. */
export function isWithinRange(iso: string, range?: DateRange): boolean {
  if (!range) {
    return true
  }

  const time = new Date(iso).getTime()

  return time >= range.from.getTime() && time <= range.to.getTime()
}

/** Every day key from `from` to `to`, oldest first, both days included. */
export function eachDayKey(range: DateRange): DayKey[] {
  const keys: DayKey[] = []
  const cursor = startOfDay(range.from)
  const last = startOfDay(range.to).getTime()

  while (cursor.getTime() <= last) {
    keys.push(toDayKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return keys
}

/** Oldest first; ties keep their original order. */
export function byOccurredAt<T extends { occurredAt: string }>(a: T, b: T): number {
  return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
}
