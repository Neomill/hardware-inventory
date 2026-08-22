import { Settings } from 'lucide-react'

import { ModulePlaceholder } from '@/components/common/ModulePlaceholder'

export function SettingsPage() {
  return (
    <ModulePlaceholder
      icon={Settings}
      title="Settings"
      description="Store settings are a prototype placeholder in this POC."
    />
  )
}
