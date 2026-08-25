export async function safeJson(res: Response, label: string) {
  try {
    return await res.json();
  } catch {
    const text = await res.text().catch(() => '');
    console.error(`[${label}] returned non-JSON (${res.status}):`, text.slice(0, 300));
    return {
      error: `${label} failed (${res.status}) — backend may be unreachable or misconfigured.`
    };
  }
}
