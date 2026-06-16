import { NextResponse } from "next/server";

export async function GET() {
  const raw = process.env.BACKEND_URL ?? "NOT SET";
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  const backend = withProtocol.includes(".") ? withProtocol : `${withProtocol}.onrender.com`;
  const testUrl = `${backend}/api/tokens`;

  let status = "unknown";
  let error = "";

  try {
    const res = await fetch(testUrl, { signal: AbortSignal.timeout(10000) });
    status = `${res.status} ${res.statusText}`;
  } catch (e: unknown) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({ raw_env: raw, resolved_url: backend, test_url: testUrl, backend_status: status, error });
}