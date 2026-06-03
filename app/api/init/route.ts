import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDb();
  return NextResponse.json({ ok: true });
}
