import { useMemo, useState } from 'react'

import type { SupplierInvoice } from '@/domain/types'
import { searchInvoices } from '@/features/inventory/lib/invoiceQuery'
import { usePagedList } from '@/hooks/usePagedList'

export const INVOICE_PAGE_SIZE = 15

/** Search and page the supplier invoices, newest first. */
export function useInvoiceList(invoices: SupplierInvoice[]) {
  const [search, setSearch] = useState('')

  const matches = useMemo(() => searchInvoices(invoices, search), [invoices, search])
  const { resetPage, ...paged } = usePagedList(matches, INVOICE_PAGE_SIZE)

  /** A new search returns to page one, so results are never off-screen. */
  function updateSearch(value: string) {
    setSearch(value)
    resetPage()
  }

  return { search, updateSearch, ...paged }
}
