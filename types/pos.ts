// ─── POS Auth Roles ──────────────────────────────────────────────────────────
// POS access : pos_admin, pos_manager, pos_cashier, pos_staff

export type POSUserRole =
  | 'pos_admin'
  | 'pos_manager'
  | 'pos_cashier'
  | 'pos_staff'

export const POS_ROLES: POSUserRole[] = [
  'pos_admin',
  'pos_manager',
  'pos_cashier',
  'pos_staff',
]

// ─── POS User & Auth ─────────────────────────────────────────────────────────
export interface POSUser {
  id: string
  name: string
  email: string
  role: POSUserRole
  avatar?: string
  createdAt: string
}

// Cookie payload — stored as JSON in 'pos-auth' cookie
export interface POSAuthCookiePayload {
  userId: string
  name: string
  role: POSUserRole
  isAuthenticated: boolean
  source: 'pos'
}
