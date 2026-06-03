"use client";

import { useEffect, useRef, useState } from "react";
import {
  Idea,
  BrainstormMessage,
  Action,
  getBrainstormMessages,
  getActions,
  saveBrainstormMessage,
  updateIdeaStatus,
} from "@/app/actions";
import ActionChecklist from "./ActionChecklist";

interface Props {
  idea: Idea;
  onClose: () => void;
  onStatusChange: (id: number, status: Idea["status"]) => void;
}

export default function IdeaPanel({ idea, onClose, onStatusChange }: Props) {
  const [messages, setMessages] = useState<BrainstormMessage[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getBrainstormMessages(idea.id).then(setMessages);
    getActions(idea.id).then(setActions);
  }, [idea.id]);

  // Auto-start brainstorm on first open if no messages yet
  useEffect(() => {
    if (messages.length === 0 && !streaming) {
      startBrainstorm([{ role: "user", content: idea.title }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  async function startBrainstorm(messagesToSend: { role: string; content: string }[]) {
    setStreaming(true);
    setStreamingContent("");
    setError("");

    // Save the user message if it's a follow-up (not the auto-start)
    const lastMsg = messagesToSend[messagesToSend.length - 1];
    if (lastMsg.role === "user" && messages.length > 0) {
      await saveBrainstormMessage(idea.id, "user", lastMsg.content);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), idea_id: idea.id, role: "user", content: lastMsg.content, created_at: new Date().toISOString() },
      ]);
    }

    try {
      const res = await fetch("/api/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: idea.id, messages: messagesToSend }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamingContent(accumulated);
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, idea_id: idea.id, role: "assistant", content: accumulated, created_at: new Date().toISOString() },
      ]);
      setStreamingContent("");
    } catch {
      setError("AI brainstorm unavailable — try again.");
    } finally {
      setStreaming(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || streaming) return;
    const userContent = input.trim();
    setInput("");
    const allMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent },
    ];
    await startBrainstorm(allMessages);
  }

  async function handleStatusChange(status: Idea["status"]) {
    await updateIdeaStatus(idea.id, status);
    onStatusChange(idea.id, status);
  }

  const STATUS_OPTIONS: Idea["status"][] = ["exploring", "committed", "done"];

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl z-50">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-800">
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-semibold truncate">{idea.title}</h2>
          <div className="flex gap-1 mt-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                  idea.status === s
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white ml-4 text-xl leading-none">
          ×
        </button>
      </div>

      {/* Brainstorm thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? "text-right" : ""}>
            <p
              className={`inline-block text-sm whitespace-pre-wrap rounded-lg px-3 py-2 max-w-[85%] ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-200"
              }`}
            >
              {msg.content}
            </p>
          </div>
        ))}

        {streaming && streamingContent && (
          <div>
            <p className="inline-block text-sm whitespace-pre-wrap rounded-lg px-3 py-2 max-w-[85%] bg-gray-800 text-gray-200">
              {streamingContent}
              <span className="animate-pulse">▋</span>
            </p>
          </div>
        )}

        {streaming && !streamingContent && (
          <p className="text-gray-500 text-sm animate-pulse">Thinking…</p>
        )}

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {idea.status === "committed" && (
          <ActionChecklist ideaId={idea.id} initialActions={actions} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a follow-up…"
          disabled={streaming}
          className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={streaming || !input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
