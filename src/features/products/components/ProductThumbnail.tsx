import { Package } from 'lucide-react'

type ProductThumbnailProps = {
  imageUrl?: string
}

/**
 * Product photo when one exists, a neutral plate otherwise. The prototype
 * catalogue ships without images, so the fallback is the normal case for now.
 */
export function ProductThumbnail({ imageUrl }: ProductThumbnailProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400"
    >
      <Package className="h-5 w-5" />
    </span>
  )
}
