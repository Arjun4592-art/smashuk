export interface CashMovementRecord {
  id: string;
  amount: number;
  type: 'in' | 'out';
  reason: string;
  time: string;
}
export interface CashDrawerSessionRecord {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  variance?: number;
  movements: CashMovementRecord[];
  cashier: string;
}
async function parseOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Cash drawer sync failed (${res.status})`);
  }
  return data;
}
export async function fetchCashDrawerState(): Promise<{
  current: CashDrawerSessionRecord | null;
  history: CashDrawerSessionRecord[];
}> {
  const res = await fetch('/api/pos/cash-drawer', {
    credentials: 'include'
  });
  return parseOrThrow(res);
}
export async function openCashDrawerRemote(openingCash: number, cashier: string): Promise<CashDrawerSessionRecord> {
  const res = await fetch('/api/pos/cash-drawer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
      action: 'open',
      openingCash,
      cashier
    })
  });
  const data = await parseOrThrow(res);
  return data.session;
}
export async function addCashMovementRemote(amount: number, type: 'in' | 'out', reason: string): Promise<CashDrawerSessionRecord> {
  const res = await fetch('/api/pos/cash-drawer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
      action: 'movement',
      amount,
      type,
      reason
    })
  });
  const data = await parseOrThrow(res);
  return data.session;
}
export async function closeCashDrawerRemote(closingCash: number, expectedCash?: number, variance?: number): Promise<CashDrawerSessionRecord> {
  const res = await fetch('/api/pos/cash-drawer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
      action: 'close',
      closingCash,
      expectedCash,
      variance
    })
  });
  const data = await parseOrThrow(res);
  return data.session;
}
