import { NextResponse } from "next/server";

export async function GET() {
  const backend = process.env.BACKEND_URL ?? "NOT SET";
  const masked = backend === "NOT SET" ? "NOT SET" : backend;
  return NextResponse.json({ backend_url: masked });
}