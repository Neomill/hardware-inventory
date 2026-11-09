import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import { applySavedTextSize, watchTextSizeInOtherTabs } from '@/hooks/useTextSize'
import '@/index.css'

// Before the first render, so the page never flashes at the wrong size.
applySavedTextSize()
watchTextSizeInOtherTabs()

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
