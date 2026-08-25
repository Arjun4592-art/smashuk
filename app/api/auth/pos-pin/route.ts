import { NextRequest, NextResponse } from 'next/server';
import { setSurfaceCookies } from '@/lib/api/auth-cookie';
import { getMedusaServiceToken, MEDUSA_URL } from '@/lib/api/medusa-service-token';
import { startPosSession } from '@/lib/api/pos-session';
import { verifyPin, hashPin, isBcryptHash } from '@/lib/api/pin-hash';
import { checkPinLock, recordPinFailure, clearPinLock, MAX_PIN_ATTEMPTS } from '@/lib/api/pin-lock';
import { logStaffActivity } from '@/lib/api/staff-activity';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      staffId,
      pin
    } = body;
    if (!staffId || !pin) {
      return NextResponse.json({
        error: 'Staff ID and PIN are required.'
      }, {
        status: 400
      });
    }
    const serviceToken = await getMedusaServiceToken();
    const userRes = await fetch(`${MEDUSA_URL}/admin/users/${staffId}`, {
      headers: {
        Authorization: `Bearer ${serviceToken}`
      }
    });
    if (!userRes.ok) {
      return NextResponse.json({
        error: 'Incorrect PIN. Please try again.'
      }, {
        status: 401
      });
    }
    const {
      user: staffUser
    } = await userRes.json();
    const meta = staffUser?.metadata ?? {};
    const lockStatus = checkPinLock(meta);
    if (lockStatus.locked) {
      return NextResponse.json({
        error: `Account locked. Try again in ${lockStatus.remaining} seconds.`,
        locked: true
      }, {
        status: 429
      });
    }
    if (meta.isActive === false) {
      return NextResponse.json({
        error: 'This staff account is deactivated.'
      }, {
        status: 403
      });
    }
    const realPin = String(meta.pin ?? '');
    if (!realPin || !(await verifyPin(String(pin), realPin))) {
      const count = await recordPinFailure(staffId, meta);
      const remaining = MAX_PIN_ATTEMPTS - count;
      return NextResponse.json({
        error: remaining > 0 ? `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` : 'Too many incorrect attempts. Account locked for 5 minutes.',
        attemptsRemaining: Math.max(0, remaining)
      }, {
        status: 401
      });
    }
    if (!isBcryptHash(realPin)) {
      const serviceToken = await getMedusaServiceToken();
      fetch(`${MEDUSA_URL}/admin/users/${staffId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metadata: {
            pin: await hashPin(String(pin))
          }
        })
      }).catch(() => {});
    }
    await clearPinLock(staffId);
    const sessionId = await startPosSession(staffUser.id);
    const posRole: 'admin' | 'staff' = ['admin', 'staff'].includes(meta.posRole) ? meta.posRole : 'admin';
    const user = {
      id: staffUser.id,
      name: `${staffUser.first_name ?? ''} ${staffUser.last_name ?? ''}`.trim() || staffUser.email,
      email: staffUser.email,
      role: posRole,
      createdAt: staffUser.created_at ?? new Date().toISOString()
    };
    const response = NextResponse.json({
      user
    });
    setSurfaceCookies(response.cookies, 'pos', {
      isAuthenticated: true,
      role: posRole,
      userId: staffUser.id,
      sessionId
    }, serviceToken);
    logStaffActivity({
      staffId: staffUser.id,
      staffName: user.name,
      action: 'login',
      surface: 'pos'
    });
    return response;
  } catch (err: any) {
    console.error('[API] pos-pin error:', err);
    return NextResponse.json({
      error: 'PIN verification failed.'
    }, {
      status: 500
    });
  }
}
