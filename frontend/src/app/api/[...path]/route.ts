import { NextRequest, NextResponse } from "next/server";

const raw = process.env.BACKEND_URL ?? "http://localhost:3001";
const BACKEND = raw.startsWith("http") ? raw : `https://${raw}`;

async function proxy(req: NextRequest, path: string) {
  const search = req.nextUrl.search ?? "";
  const url = `${BACKEND}/api/${path}${search}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  try {
    const res = await fetch(url, { method: req.method, headers, body });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path.join("/"));
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path.join("/"));
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path.join("/"));
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path.join("/"));
}