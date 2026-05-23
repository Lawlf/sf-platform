import type { ReactNode } from "react";

import type { SerializedStoryCard } from "../../_actions/timeline-queries";

import { getIcon } from "./icon-map";

const STRONG_REGEX = /\[\[([^\]]+)\]\]/g;

function renderLine(line: string): ReactNode[] {
  const result: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  STRONG_REGEX.lastIndex = 0;
  while ((match = STRONG_REGEX.exec(line)) !== null) {
    if (match.index > lastIndex) {
      result.push(line.slice(lastIndex, match.index));
    }
    result.push(<strong key={`strong-${match.index}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    result.push(line.slice(lastIndex));
  }
  return result;
}

export interface StoryCardProps {
  story: SerializedStoryCard;
}

export function StoryCard({ story }: StoryCardProps) {
  const Icon = getIcon(story.iconName);
  const lineNodes = renderLine(story.line);

  switch (story.kind) {
    case "achievement":
      return (
        <article
          role="note"
          aria-label={`${story.eyebrow}. ${story.line.replace(STRONG_REGEX, "$1")}`}
          className="animate-in fade-in-0 zoom-in-95 duration-500 relative flex items-stretch gap-3 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#ef7a1a_0%,#f28e25_60%,#f4a13a_100%)] px-4 py-4 text-white shadow-[0_14px_32px_rgba(239,122,26,0.35)]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18),transparent_70%)]"
          />
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
            <Icon size={18} strokeWidth={2} aria-hidden />
          </span>
          <div className="relative flex-1">
            <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.6px] text-white/85">
              {story.eyebrow}
            </p>
            <p className="mt-1 text-[0.8125rem] font-bold leading-snug text-white">{lineNodes}</p>
          </div>
        </article>
      );

    case "warning":
      return (
        <article
          role="note"
          aria-label={`${story.eyebrow}. ${story.line.replace(STRONG_REGEX, "$1")}`}
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 flex items-stretch gap-3 rounded-2xl border border-[color:var(--semantic-negative)]/22 bg-[color:var(--semantic-negative)]/[0.08] px-4 py-4 backdrop-blur-md"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--semantic-negative)]/[0.14] text-[color:var(--semantic-negative)]">
            <Icon size={18} strokeWidth={2} aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.6px] text-[color:var(--semantic-negative)]">
              {story.eyebrow}
            </p>
            <p className="mt-1 text-[0.8125rem] font-semibold leading-snug text-[color:var(--text-primary)]">
              {lineNodes}
            </p>
          </div>
        </article>
      );

    case "milestone":
    case "insight":
    default:
      return (
        <article
          role="note"
          aria-label={`${story.eyebrow}. ${story.line.replace(STRONG_REGEX, "$1")}`}
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 flex items-stretch gap-3 rounded-2xl border border-[color:var(--color-brand-500)]/22 bg-[color:var(--color-brand-500)]/[0.10] px-4 py-4 backdrop-blur-md"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.18] text-[color:var(--color-brand-800)]">
            <Icon size={18} strokeWidth={2} aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
              {story.eyebrow}
            </p>
            <p className="mt-1 text-[0.8125rem] font-semibold leading-snug text-[color:var(--text-primary)]">
              {lineNodes}
            </p>
          </div>
        </article>
      );
  }
}
