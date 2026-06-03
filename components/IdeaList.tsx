"use client";

import { useState } from "react";
import { Idea } from "@/app/actions";

interface Props {
  ideas: Idea[];
  onSelect: (idea: Idea) => void;
  selectedId?: number;
}

const STATUS_COLORS: Record<Idea["status"], string> = {
  exploring: "bg-yellow-500",
  committed: "bg-blue-500",
  done: "bg-green-500",
};

const STATUS_FILTERS: Array<Idea["status"] | "all"> = ["all", "exploring", "committed", "done"];

export default function IdeaList({ ideas, onSelect, selectedId }: Props) {
  const [filter, setFilter] = useState<Idea["status"] | "all">("all");

  const filtered = filter === "all" ? ideas : ideas.filter((i) => i.status === filter);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full capitalize border ${
              filter === f
                ? "bg-gray-700 border-gray-500 text-white"
                : "border-gray-800 text-gray-500 hover:text-gray-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-600 text-sm">No ideas yet. Add one above.</p>
      )}

      <ul className="space-y-1">
        {filtered.map((idea) => (
          <li key={idea.id}>
            <button
              onClick={() => onSelect(idea)}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 group transition-colors ${
                selectedId === idea.id
                  ? "bg-gray-800"
                  : "hover:bg-gray-800/60"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[idea.status]}`}
              />
              <span className="text-gray-200 text-sm truncate">{idea.title}</span>
              <span className="ml-auto text-xs text-gray-600 capitalize flex-shrink-0">
                {idea.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
