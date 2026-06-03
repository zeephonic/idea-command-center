"use client";

import { useEffect, useState } from "react";
import { Idea, createIdea, getIdeas, saveBrainstormMessage } from "./actions";
import IdeaList from "@/components/IdeaList";
import IdeaPanel from "@/components/IdeaPanel";

const PENDING_SYNC_KEY = "pending_sync_ideas";

export default function Home() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    getIdeas().then(setIdeas);
    syncPending();
  }, []);

  async function syncPending() {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return;
    try {
      const pending: string[] = JSON.parse(raw);
      for (const title of pending) {
        await createIdea(title);
      }
      localStorage.removeItem(PENDING_SYNC_KEY);
      const updated = await getIdeas();
      setIdeas(updated);
    } catch {
      // Leave pending for next load
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || submitting) return;
    setSubmitting(true);
    setNewTitle("");

    try {
      const idea = await createIdea(title);
      setIdeas((prev) => [idea, ...prev]);
      // Save the user's initial message so the brainstorm panel opens with context
      await saveBrainstormMessage(idea.id, "user", title);
      setSelectedIdea(idea);
    } catch {
      // DB down — save locally
      const raw = localStorage.getItem(PENDING_SYNC_KEY);
      const pending: string[] = raw ? JSON.parse(raw) : [];
      pending.push(title);
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
      showToast("Brainstorm failed — your idea is saved locally and will sync when the connection recovers.");
    } finally {
      setSubmitting(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 5000);
  }

  function handleStatusChange(id: number, status: Idea["status"]) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    setSelectedIdea((prev) => (prev?.id === id ? { ...prev, status } : prev));
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Idea Command Center</h1>

        {/* New idea form */}
        <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Capture an idea…"
            disabled={submitting}
            className="flex-1 bg-gray-800 text-white px-4 py-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-600 disabled:opacity-50"
            autoFocus
          />
          <button
            type="submit"
            disabled={submitting || !newTitle.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium disabled:opacity-50"
          >
            {submitting ? "…" : "Add"}
          </button>
        </form>

        <IdeaList
          ideas={ideas}
          onSelect={setSelectedIdea}
          selectedId={selectedIdea?.id}
        />
      </div>

      {/* Side panel */}
      {selectedIdea && (
        <IdeaPanel
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-200 text-sm px-4 py-2 rounded-lg shadow-lg border border-gray-700 max-w-sm text-center">
          {toast}
        </div>
      )}
    </main>
  );
}
