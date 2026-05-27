import { promises as fs } from "node:fs";
import path from "node:path";

import matter from "gray-matter";

export type ModuleDepth = "short" | "medium" | "long";

export interface QuizOptionFm {
  label: string;
  correct: boolean;
  feedback?: string;
}

export interface QuizFm {
  prompt: string;
  options: QuizOptionFm[];
  contextual?: boolean;
}

export interface ModuleFrontmatter {
  num: number;
  title: string;
  subtitle: string;
  depth: ModuleDepth;
  cta: { label: string; href: string };
  quiz?: QuizFm[];
  audio?: string;
}

export interface ModuleDoc {
  frontmatter: ModuleFrontmatter;
  body: string;
}

export type ParseResult = { ok: true; doc: ModuleDoc } | { ok: false; error: string };

const DEPTHS: readonly ModuleDepth[] = ["short", "medium", "long"];

function isQuizArray(q: unknown): q is QuizFm[] {
  if (q === undefined) return true;
  if (!Array.isArray(q)) return false;
  return q.every(
    (item) =>
      item &&
      typeof item.prompt === "string" &&
      Array.isArray(item.options) &&
      item.options.every(
        (o: unknown) =>
          o &&
          typeof (o as QuizOptionFm).label === "string" &&
          typeof (o as QuizOptionFm).correct === "boolean",
      ),
  );
}

export function parseModuleDoc(raw: string): ParseResult {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch (e) {
    return { ok: false, error: `frontmatter inválido: ${(e as Error).message}` };
  }
  const fm = parsed.data as Partial<ModuleFrontmatter>;
  if (typeof fm.num !== "number") return { ok: false, error: "num ausente" };
  if (typeof fm.title !== "string" || !fm.title) return { ok: false, error: "title ausente" };
  if (typeof fm.subtitle !== "string") return { ok: false, error: "subtitle ausente" };
  if (!fm.depth || !DEPTHS.includes(fm.depth)) return { ok: false, error: "depth inválido" };
  if (!fm.cta || typeof fm.cta.label !== "string" || typeof fm.cta.href !== "string")
    return { ok: false, error: "cta inválido" };
  if (!isQuizArray(fm.quiz)) return { ok: false, error: "quiz mal formado" };
  return {
    ok: true,
    doc: { frontmatter: fm as ModuleFrontmatter, body: parsed.content },
  };
}

const CONTENT_DIR = path.join(process.cwd(), "app/(app)/app/conteudo/_content");

export async function loadModuleDoc(
  trilhaSlug: string,
  num: number,
): Promise<ModuleDoc | null> {
  const file = path.join(CONTENT_DIR, trilhaSlug, `${String(num).padStart(2, "0")}.mdx`);
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
  const r = parseModuleDoc(raw);
  return r.ok ? r.doc : null;
}
