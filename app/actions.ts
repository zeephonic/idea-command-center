"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";

export type Idea = {
  id: number;
  title: string;
  body: string;
  status: "exploring" | "committed" | "done";
  created_at: string;
  updated_at: string;
  last_engaged_at: string | null;
};

export type BrainstormMessage = {
  id: number;
  idea_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type Action = {
  id: number;
  idea_id: number;
  text: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

// libSQL Row objects are array-like and not plain objects — they cannot
// cross the server/client boundary. Convert each row to a plain object.
function toIdea(row: Record<string, unknown>): Idea {
  return {
    id: Number(row.id),
    title: String(row.title),
    body: String(row.body ?? ""),
    status: row.status as Idea["status"],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    last_engaged_at: row.last_engaged_at ? String(row.last_engaged_at) : null,
  };
}

function toMessage(row: Record<string, unknown>): BrainstormMessage {
  return {
    id: Number(row.id),
    idea_id: Number(row.idea_id),
    role: row.role as BrainstormMessage["role"],
    content: String(row.content),
    created_at: String(row.created_at),
  };
}

function toAction(row: Record<string, unknown>): Action {
  return {
    id: Number(row.id),
    idea_id: Number(row.idea_id),
    text: String(row.text),
    completed: Boolean(row.completed),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getIdeas(): Promise<Idea[]> {
  const result = await db.execute(
    "SELECT * FROM ideas ORDER BY created_at DESC"
  );
  return result.rows.map((r) => toIdea(r as unknown as Record<string, unknown>));
}

export async function createIdea(title: string): Promise<Idea> {
  const result = await db.execute({
    sql: "INSERT INTO ideas (title) VALUES (?) RETURNING *",
    args: [title.trim()],
  });
  revalidatePath("/");
  return toIdea(result.rows[0] as unknown as Record<string, unknown>);
}

export async function updateIdeaStatus(
  id: number,
  status: Idea["status"]
): Promise<void> {
  await db.execute({
    sql: "UPDATE ideas SET status = ?, updated_at = datetime('now') WHERE id = ?",
    args: [status, id],
  });
  revalidatePath("/");
}

export async function updateIdeaBody(id: number, body: string): Promise<void> {
  // Does NOT update last_engaged_at — body edits don't count as engagement
  await db.execute({
    sql: "UPDATE ideas SET body = ?, updated_at = datetime('now') WHERE id = ?",
    args: [body, id],
  });
}

export async function getBrainstormMessages(ideaId: number): Promise<BrainstormMessage[]> {
  const result = await db.execute({
    sql: "SELECT * FROM brainstorm_messages WHERE idea_id = ? ORDER BY created_at ASC",
    args: [ideaId],
  });
  return result.rows.map((r) => toMessage(r as unknown as Record<string, unknown>));
}

export async function saveBrainstormMessage(
  ideaId: number,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await db.execute({
    sql: "INSERT INTO brainstorm_messages (idea_id, role, content) VALUES (?, ?, ?)",
    args: [ideaId, role, content],
  });
  // Update last_engaged_at — this counts as real engagement
  await db.execute({
    sql: "UPDATE ideas SET last_engaged_at = datetime('now') WHERE id = ?",
    args: [ideaId],
  });
}

export async function getActions(ideaId: number): Promise<Action[]> {
  const result = await db.execute({
    sql: "SELECT * FROM actions WHERE idea_id = ? ORDER BY created_at ASC",
    args: [ideaId],
  });
  return result.rows.map((r) => toAction(r as unknown as Record<string, unknown>));
}

export async function createAction(ideaId: number, text: string): Promise<Action> {
  const result = await db.execute({
    sql: "INSERT INTO actions (idea_id, text) VALUES (?, ?) RETURNING *",
    args: [ideaId, text.trim()],
  });
  await db.execute({
    sql: "UPDATE ideas SET last_engaged_at = datetime('now') WHERE id = ?",
    args: [ideaId],
  });
  revalidatePath("/");
  return toAction(result.rows[0] as unknown as Record<string, unknown>);
}

export async function toggleAction(id: number, ideaId: number, completed: boolean): Promise<void> {
  await db.execute({
    sql: "UPDATE actions SET completed = ?, updated_at = datetime('now') WHERE id = ?",
    args: [completed ? 1 : 0, id],
  });
  await db.execute({
    sql: "UPDATE ideas SET last_engaged_at = datetime('now') WHERE id = ?",
    args: [ideaId],
  });
  revalidatePath("/");
}
