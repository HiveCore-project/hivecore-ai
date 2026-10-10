export const categories = [
  "Technology",
  "Science",
  "Climate",
  "Society",
] as const;
export type Category = (typeof categories)[number];
export interface Mission {
  id: string;
  title: string;
  objective: string;
  category: Category;
  status: "draft" | "running" | "completed" | "failed" | "queued";
  created_at: string;
  source_urls?: string;
  started_at?: string;
  finished_at?: string;
  error?: string;
}
export function validateMission(value: unknown): {
  title: string;
  objective: string;
  category: Category;
} {
  if (!value || typeof value !== "object")
    throw new Error("A mission object is required.");
  const { title, objective, category } = value as Record<string, unknown>;
  if (
    typeof title !== "string" ||
    title.trim().length < 3 ||
    title.trim().length > 120
  )
    throw new Error("Title must contain 3–120 characters.");
  if (
    typeof objective !== "string" ||
    objective.trim().length < 10 ||
    objective.trim().length > 2000
  )
    throw new Error("Objective must contain 10–2,000 characters.");
  if (!categories.includes(category as Category))
    throw new Error("Choose a valid research category.");
  return {
    title: title.trim(),
    objective: objective.trim(),
    category: category as Category,
  };
}
