import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const MAX_HISTORY = 50;
export interface ReportRecord {
  id: string;
  name: string;
  type: string;
  dateRange: string;
  downloadedBy: string;
  downloadedByEmail: string;
  downloadedAt: string;
  rowCount: number;
  fileName: string;
}
async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text.slice(0, 300)
    };
  }
}
async function getStoreIdAndHistory(authHeader: string): Promise<{
  storeId: string;
  history: ReportRecord[];
  metadata: any;
} | null> {
  const res = await fetch(`${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`, {
    headers: {
      Authorization: authHeader
    }
  });
  const data = await safeJson(res);
  const store = data.stores?.[0];
  if (!res.ok || !store) return null;
  return {
    storeId: store.id,
    history: store.metadata?.reportHistory ?? [],
    metadata: store.metadata ?? {}
  };
}
export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  const result = await getStoreIdAndHistory(authHeader);
  return NextResponse.json({
    history: result?.history ?? []
  });
}
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const body = await req.json();
    const {
      name,
      type,
      dateRange,
      downloadedBy,
      downloadedByEmail,
      rowCount,
      fileName
    } = body;
    if (!name || !type || !downloadedBy) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, {
        status: 400
      });
    }
    const record: ReportRecord = {
      id: `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      type,
      dateRange: dateRange ?? 'unknown',
      downloadedBy,
      downloadedByEmail: downloadedByEmail ?? '',
      downloadedAt: new Date().toISOString(),
      rowCount: rowCount ?? 0,
      fileName: fileName ?? `${type}-report.csv`
    };
    const result = await getStoreIdAndHistory(authHeader);
    if (!result) {
      return NextResponse.json({
        error: 'No store found'
      }, {
        status: 500
      });
    }
    const updated = [record, ...result.history].slice(0, MAX_HISTORY);
    const res = await fetch(`${MEDUSA_URL}/admin/stores/${result.storeId}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metadata: {
          ...result.metadata,
          reportHistory: updated
        }
      })
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return NextResponse.json({
        error: data.message ?? 'Failed to save report history'
      }, {
        status: res.status
      });
    }
    return NextResponse.json({
      record
    });
  } catch (err: any) {
    console.error('[report-history] POST error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function DELETE(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const result = await getStoreIdAndHistory(authHeader);
    if (!result) {
      return NextResponse.json({
        error: 'No store found'
      }, {
        status: 500
      });
    }
    const res = await fetch(`${MEDUSA_URL}/admin/stores/${result.storeId}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metadata: {
          ...result.metadata,
          reportHistory: []
        }
      })
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return NextResponse.json({
        error: data.message ?? 'Failed to clear report history'
      }, {
        status: res.status
      });
    }
    return NextResponse.json({
      success: true
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
