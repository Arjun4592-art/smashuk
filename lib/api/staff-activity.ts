// lib/api/staff-activity.ts
//
// SERVER-ONLY. Fire-and-forget logging to the backend's staff_activity_log
// table. Deliberately never throws — a staff member's ability to log in or
// out must never depend on this succeeding.
import 'server-only'
import { medusaServiceFetch } from './medusa-service-token'

export type StaffActivitySurface = 'dashboard' | 'pos'
export type StaffActivityAction = 'login' | 'logout' | 'return'

export async function logStaffActivity(entry: {
  staffId: string
  staffName?: string
  action: StaffActivityAction
  surface: StaffActivitySurface
  detail?: string
}) {
  try {
    const res = await medusaServiceFetch('/admin/staff-activity', {
      method: 'POST',
      body: JSON.stringify({
        staff_id: entry.staffId,
        staff_name: entry.staffName,
        action: entry.action,
        surface: entry.surface,
        detail: entry.detail,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('[staff-activity] log failed:', data)
    }
  } catch (err) {
    console.error('[staff-activity] log failed:', err)
  }
}
