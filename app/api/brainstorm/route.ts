import { NextRequest, NextResponse } from "next/server";
import anthropic, { BRAINSTORM_SYSTEM_PROMPT } from "@/lib/ai";
import { saveBrainstormMessage } from "@/app/actions";

export async function POST(request: NextRequest) {
  const { ideaId, messages } = await request.json();

  if (!ideaId || !messages?.length) {
    return NextResponse.json({ error: "ideaId and messages required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullContent = "";

        const anthropicStream = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: BRAINSTORM_SYSTEM_PROMPT,
          messages,
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            fullContent += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }

        // Persist the assistant message after streaming completes
        await saveBrainstormMessage(ideaId, "assistant", fullContent);
        controller.close();
      } catch (err) {
        console.error("Brainstorm stream error:", err);
        controller.enqueue(encoder.encode("\n\n[Brainstorm unavailable — try again]"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
