/**
 * Shapes the Dashboard renders. Amounts are pesos for the prototype; the
 * domain layer will move money to integer centavos (see specs/02).
 */

export type PaymentMethod = 'cash' | 'partial' | 'credit'

export type RecentSale = {
  id: string
  /** ISO 8601 */
  occurredAt: string
  saleNumber: string
  customerName: string
  total: number
  paymentMethod: PaymentMethod
}

export type LowStockItem = {
  id: string
  name: string
  currentStock: number
  unit: string
  reorderLevel: number
}

export type MovementType = 'stock_in' | 'sale'

export type InventoryMovement = {
  id: string
  /** ISO 8601 */
  occurredAt: string
  type: MovementType
  description: string
  reference: string
  /** Signed: positive for stock received, negative for stock sold. */
  quantityDelta: number
  unit: string
  userName: string
}

export type DashboardNote = {
  id: string
  body: string
}

export type DashboardKpis = {
  todaysSales: number
  /** Percentage change against yesterday. */
  todaysSalesChange: number
  outstandingCredit: number
  outstandingCreditChange: number
  lowStockCount: number
  totalActiveProducts: number
}

export type DashboardSnapshot = {
  kpis: DashboardKpis
  recentSales: RecentSale[]
  lowStockItems: LowStockItem[]
  recentMovements: InventoryMovement[]
  note: DashboardNote | null
}
