import type { Metadata } from 'next'
import { noIndexMetadata } from '@/lib/seo'

export const metadata: Metadata = noIndexMetadata('Track Your Order')

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
