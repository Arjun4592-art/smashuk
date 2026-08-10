'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TerminalIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/pos/terminal/billing')
  }, [router])
  return null
}
