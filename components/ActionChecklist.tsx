"use client";

import { useState } from "react";
import { Action, createAction, toggleAction } from "@/app/actions";

interface Props {
  ideaId: number;
  initialActions: Action[];
}

export default function ActionChecklist({ ideaId, initialActions }: Props) {
  const [actions, setActions] = useState<Action[]>(initialActions);
  const [newText, setNewText] = useState("");

  async function handleAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !newText.trim()) return;
    const action = await createAction(ideaId, newText);
    setActions((prev) => [...prev, action]);
    setNewText("");
  }

  async function handleToggle(action: Action) {
    const next = !action.completed;
    setActions((prev) =>
      prev.map((a) => (a.id === action.id ? { ...a, completed: next } : a))
    );
    await toggleAction(action.id, ideaId, next);
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Actions
      </h3>
      <ul className="space-y-1 mb-2">
        {actions.map((action) => (
          <li key={action.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={action.completed}
              onChange={() => handleToggle(action)}
              className="accent-blue-500 cursor-pointer"
            />
            <span
              className={`text-sm ${
                action.completed ? "line-through text-gray-500" : "text-gray-200"
              }`}
            >
              {action.text}
            </span>
          </li>
        ))}
      </ul>
      <input
        type="text"
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        onKeyDown={handleAdd}
        placeholder="Add action… (Enter to save)"
        className="w-full bg-transparent border-b border-gray-700 text-sm text-gray-300 placeholder-gray-600 py-1 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
