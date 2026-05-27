import { MDXRemote } from "next-mdx-remote/rsc";

import type { ModuleFrontmatter } from "../_lib/module-doc";
import { mdxComponents } from "./mdx-components";
import { ModuleCta } from "./module-cta.client";
import { QuizCheckpoint, type ResolvedQuiz } from "./quiz-checkpoint.client";
import { SugestaoDisclaimer } from "./sugestao-disclaimer";

export interface ModuleReaderProps {
  frontmatter: ModuleFrontmatter;
  body: string;
  quiz: ResolvedQuiz[];
}

export function ModuleReader({ frontmatter, body, quiz }: ModuleReaderProps) {
  return (
    <article className="flex flex-col">
      <header className="mb-2">
        <div className="inline-flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--brand-ink)]">
          <span
            className="block h-[1.5px] w-3.5 rounded-full"
            style={{ background: "linear-gradient(90deg, #f28e25, transparent)" }}
          />
          Capítulo {String(frontmatter.num).padStart(2, "0")} · {frontmatter.subtitle}
        </div>
        <h1 className="mt-1.5 font-serif text-[1.75rem] font-bold leading-[1.1] tracking-[-0.02em] text-[color:var(--text-primary)]">
          {frontmatter.title}
        </h1>
      </header>

      <div className="mt-2">
        <MDXRemote source={body} components={mdxComponents} />
      </div>

      <QuizCheckpoint quiz={quiz} />

      <SugestaoDisclaimer />

      <ModuleCta href={frontmatter.cta.href} label={frontmatter.cta.label} />
    </article>
  );
}
