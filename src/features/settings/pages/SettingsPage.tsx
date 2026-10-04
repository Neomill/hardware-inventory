import { DataCard } from '@/features/settings/components/DataCard'
import { StoreProfileForm } from '@/features/settings/components/StoreProfileForm'

export function SettingsPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
      <StoreProfileForm />
      <DataCard />
    </div>
  )
}
