import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import anthropic from "@/lib/ai";
import { Resend } from "resend";
import { Idea } from "@/app/actions";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  // CRON_SECRET check — required header from Vercel cron
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all committed ideas
  const result = await db.execute(
    "SELECT * FROM ideas WHERE status = 'committed' ORDER BY last_engaged_at ASC NULLS FIRST"
  );
  const ideas = result.rows as unknown as Idea[];

  if (ideas.length === 0) {
    return NextResponse.json({ ok: true, message: "No committed ideas" });
  }

  // Build staleness context for each idea
  const ideasContext = ideas.map((idea) => {
    const daysSince = idea.last_engaged_at
      ? Math.floor((Date.now() - new Date(idea.last_engaged_at).getTime()) / 86400000)
      : null;
    return {
      id: idea.id,
      title: idea.title,
      daysSince,
    };
  });

  // Single batched Claude call — returns JSON with one interrogation line per idea
  const prompt = `You are writing a daily briefing for someone who committed to working on these ideas.
For each idea, write one short, direct interrogation line. Be honest, push back on inaction.
No encouragement fluff. Reference the days-since if relevant.

Ideas:
${ideasContext.map((i) => `- ID ${i.id}: "${i.title}" (last engaged: ${i.daysSince === null ? "never" : `${i.daysSince} days ago`})`).join("\n")}

Return ONLY valid JSON in this exact shape:
{"interrogations": [{"id": <number>, "line": "<string>"}]}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  let interrogations: Array<{ id: number; line: string }> = [];
  try {
    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const parsed = JSON.parse(text);
    interrogations = parsed.interrogations ?? [];
  } catch {
    interrogations = ideasContext.map((i) => ({ id: i.id, line: "Still on the list. What's the next move?" }));
  }

  // Build email body
  const emailLines = ideas.map((idea) => {
    const interrogation = interrogations.find((i) => i.id === idea.id)?.line ?? "";
    const days = ideasContext.find((i) => i.id === idea.id)?.daysSince;
    const daysLabel = days === null ? "never engaged" : days === 0 ? "today" : `${days}d ago`;
    return `<tr>
      <td style="padding:12px 0; border-bottom:1px solid #333;">
        <strong style="color:#fff">${idea.title}</strong>
        <span style="color:#666; font-size:12px; margin-left:8px">${daysLabel}</span>
        <br><span style="color:#aaa; font-size:14px">${interrogation}</span>
      </td>
    </tr>`;
  });

  const briefingHour = process.env.BRIEFING_HOUR_UTC ?? "7";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  await resend.emails.send({
    from: "Idea Command Center <briefing@yourdomain.com>",
    to: process.env.BRIEFING_EMAIL ?? "you@example.com",
    subject: `Morning briefing — ${today}`,
    html: `
      <div style="background:#111; color:#fff; font-family:monospace; padding:24px; max-width:600px; margin:0 auto">
        <h2 style="color:#fff; margin:0 0 4px">Idea Command Center</h2>
        <p style="color:#666; margin:0 0 24px">${today} · ${ideas.length} committed idea${ideas.length !== 1 ? "s" : ""}</p>
        <table style="width:100%; border-collapse:collapse">
          ${emailLines.join("")}
        </table>
        <p style="color:#444; font-size:12px; margin-top:24px">Briefing scheduled at ${briefingHour}:00 UTC daily.</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true, sent: ideas.length });
}
