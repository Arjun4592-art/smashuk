import { NextResponse } from 'next/server'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
export async function GET() {
  try {
    const res = await medusaServiceFetch(
      '/admin/users?limit=100&fields=id,first_name,last_name,email,metadata',
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        {
          error: err.message ?? 'Failed to load staff',
        },
        {
          status: res.status,
        },
      )
    }
    const data = await res.json()
    // This endpoint is unauthenticated by design (the POS PIN screen needs
    // to show a picker before anyone is logged in) — but it was returning
    // full staff emails to any anonymous caller, which is an easy email
    // list to scrape for phishing/credential-stuffing against admin-login
    // and pos-pin. Keep it name/initials/role only; email stays server-side.
    const staff = (data.users ?? [])
      .map((u: any) => {
        const name =
          `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Staff'
        const initials =
          `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase() ||
          'ST'
        const role: 'admin' | 'staff' = ['admin', 'staff'].includes(
          u.metadata?.posRole,
        )
          ? u.metadata.posRole
          : u.metadata?.role === 'admin'
            ? 'admin'
            : 'staff'
        return {
          id: u.id,
          name,
          initials,
          role,
          shift: u.metadata?.shift ?? '',
          isActive: u.metadata?.isActive !== false,
        }
      })
      .filter((s: any) => s.isActive)
    return NextResponse.json({
      staff,
    })
  } catch (err: any) {
    console.error('[POS] staff list error:', err.message)
    return NextResponse.json(
      {
        error: err.message || 'Internal server error',
      },
      {
        status: 500,
      },
    )
  }
}
