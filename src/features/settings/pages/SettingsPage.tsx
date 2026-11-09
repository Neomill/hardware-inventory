import { DataCard } from '@/features/settings/components/DataCard'
import { StoreProfileForm } from '@/features/settings/components/StoreProfileForm'
import { TextSizeCard } from '@/features/settings/components/TextSizeCard'

export function SettingsPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
      {/* Text size first: it is the setting people look for most. */}
      <div className="flex min-w-0 flex-col gap-5">
        <TextSizeCard />
        <StoreProfileForm />
      </div>
      <DataCard />
    </div>
  )
}
