import type { Customer } from '@/domain/types'

/** Regulars who buy on credit. Walk-in customers are represented by null. */
export const SEED_CUSTOMERS: Customer[] = [
  { id: 'CUS-001', name: 'Juan Dela Cruz', phone: '0917 555 0101' },
  { id: 'CUS-002', name: 'Pedro Santos', phone: '0917 555 0102' },
  { id: 'CUS-003', name: 'Maria Reyes', phone: '0918 555 0103' },
  { id: 'CUS-004', name: 'Ramon Bautista', phone: '0918 555 0104' },
  { id: 'CUS-005', name: 'Lita Gonzales', phone: '0919 555 0105' },
  { id: 'CUS-006', name: 'ABC Construction', phone: '0920 555 0106' },
  { id: 'CUS-007', name: 'Ernesto Villar', phone: '0921 555 0107' },
  { id: 'CUS-008', name: 'Rosa Mendoza', phone: '0922 555 0108' },
]
