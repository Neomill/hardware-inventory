import { describe, expect, it } from 'vitest'

import { SEED_PRODUCTS } from '@/data/mock/catalog'
import { orderByBestSellers } from '@/features/sales/lib/bestSellers'
import { testLine, testSale } from '@/test/fixtures'

const NOW = new Date('2026-11-09T10:00:00')
const [first, second, third] = SEED_PRODUCTS
const products = [first, second, third]

function ids(list: { id: string }[]): string[] {
  return list.map((product) => product.id)
}

describe('orderByBestSellers', () => {
  it('puts the products that sold most in the last 30 days first', () => {
    const sales = [
      testSale({ occurredAt: '2026-11-08T09:00:00', lines: [testLine(third.id, 100, 5)] }),
      testSale({ occurredAt: '2026-11-07T09:00:00', lines: [testLine(second.id, 100, 2)] }),
      testSale({ occurredAt: '2026-11-06T09:00:00', lines: [testLine(second.id, 100, 1)] }),
    ]

    expect(ids(orderByBestSellers(products, sales, NOW))).toEqual([third.id, second.id, first.id])
  })

  it('ignores cancelled sales and sales outside the window', () => {
    const sales = [
      testSale({
        occurredAt: '2026-11-08T09:00:00',
        status: 'cancelled',
        lines: [testLine(third.id, 100, 50)],
      }),
      testSale({ occurredAt: '2026-09-01T09:00:00', lines: [testLine(second.id, 100, 50)] }),
      testSale({ occurredAt: '2026-11-08T09:00:00', lines: [testLine(first.id, 100, 1)] }),
    ]

    expect(ids(orderByBestSellers(products, sales, NOW))).toEqual([first.id, second.id, third.id])
  })

  it('keeps the given order when nothing has sold', () => {
    expect(ids(orderByBestSellers(products, [], NOW))).toEqual(ids(products))
  })
})
