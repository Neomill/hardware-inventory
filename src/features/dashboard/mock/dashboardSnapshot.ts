import type { DashboardSnapshot } from '@/features/dashboard/types'

/**
 * Prototype data for the Dashboard. Timestamps and sale numbers are generated
 * relative to the current day, so the widgets always read as "today" in a demo
 * instead of showing a fixed date from the design reference.
 *
 * This is the only place dashboard figures are authored. Components hold no
 * business data, so swapping this for the real data layer touches one file.
 */

function dayAt(dayOffset: number, hours: number, minutes: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hours, minutes, 0, 0)
  return date
}

function at(dayOffset: number, hours: number, minutes: number): string {
  return dayAt(dayOffset, hours, minutes).toISOString()
}

/** Sale numbers read "#YYYYMMDD-NNNN"; supplier invoices keep the INV- prefix. */
function saleNo(dayOffset: number, sequence: number): string {
  const date = dayAt(dayOffset, 0, 0)
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')

  return `#${stamp}-${String(sequence).padStart(4, '0')}`
}

export function getDashboardSnapshot(): DashboardSnapshot {
  return {
    kpis: {
      todaysSales: 42560,
      todaysSalesChange: 12.5,
      outstandingCredit: 18340,
      outstandingCreditChange: 4.3,
      lowStockCount: 12,
      totalActiveProducts: 2153,
    },

    recentSales: [
      {
        id: 'sale-0015',
        occurredAt: at(0, 10, 28),
        saleNumber: saleNo(0, 15),
        customerName: 'Walk-in Customer',
        total: 1250,
        paymentMethod: 'cash',
      },
      {
        id: 'sale-0014',
        occurredAt: at(0, 10, 18),
        saleNumber: saleNo(0, 14),
        customerName: 'Juan Dela Cruz',
        total: 850,
        paymentMethod: 'partial',
      },
      {
        id: 'sale-0013',
        occurredAt: at(0, 10, 5),
        saleNumber: saleNo(0, 13),
        customerName: 'Walk-in Customer',
        total: 2200,
        paymentMethod: 'cash',
      },
      {
        id: 'sale-0012',
        occurredAt: at(0, 9, 52),
        saleNumber: saleNo(0, 12),
        customerName: 'Pedro Santos',
        total: 3500,
        paymentMethod: 'credit',
      },
      {
        id: 'sale-0011',
        occurredAt: at(0, 9, 40),
        saleNumber: saleNo(0, 11),
        customerName: 'Walk-in Customer',
        total: 630,
        paymentMethod: 'cash',
      },
    ],

    lowStockItems: [
      { id: 'PVC-050', name: 'PVC Pipe 1/2"', currentStock: 5, unit: 'pcs', reorderLevel: 20 },
      { id: 'CEM-001', name: 'Cement (Holcim)', currentStock: 3, unit: 'sack', reorderLevel: 10 },
      { id: 'NAI-200', name: 'Nails 2"', currentStock: 2, unit: 'kg', reorderLevel: 10 },
      { id: 'GI-100', name: 'GI Pipe 1"', currentStock: 4, unit: 'pcs', reorderLevel: 15 },
      { id: 'SP-120', name: 'Sand Paper #120', currentStock: 6, unit: 'pcs', reorderLevel: 20 },
    ],

    recentMovements: [
      {
        id: 'movement-10021',
        occurredAt: at(0, 10, 15),
        type: 'stock_in',
        description: 'Received from ABC Trading',
        reference: 'INV-10021',
        quantityDelta: 150,
        unit: 'pcs',
        userName: 'Juan Dela Cruz',
      },
      {
        id: 'movement-0013',
        occurredAt: at(0, 9, 30),
        type: 'sale',
        description: 'Sold to Walk-in Customer',
        reference: saleNo(0, 13),
        quantityDelta: -5,
        unit: 'pcs',
        userName: 'Maria Santos',
      },
      {
        id: 'movement-10020',
        occurredAt: at(-1, 16, 45),
        type: 'stock_in',
        description: 'Received from XYZ Supplies',
        reference: 'INV-10020',
        quantityDelta: 50,
        unit: 'sack',
        userName: 'Juan Dela Cruz',
      },
    ],

    note: {
      id: 'note-1',
      body: 'Check with supplier for more 1/2" PVC Pipe.',
    },
  }
}
