import { Settings } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { SerializedHousehold, SerializedMember } from "../../_actions/household-queries";
import { UserAvatar } from "../../_components/user-avatar";

interface Props {
  household: SerializedHousehold;
  members: SerializedMember[];
  mode: "view" | "manage";
}

function memberName(member: SerializedMember): string {
  return member.displayName ?? (member.username ? `@${member.username}` : member.email);
}

export function HouseholdContextHeader({ household, members, mode }: Props) {
  const memberCount = members.length;
  const shown = members.slice(0, 4);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <div className="flex flex-none -space-x-2">
        {shown.map((m) => (
          <UserAvatar
            key={m.userId}
            displayName={memberName(m)}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[color:var(--surface-1)] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-[0.625rem] font-bold text-white"
          />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
          {household.name}
        </div>
        <div className="text-[0.75rem] text-[color:var(--text-secondary)]">
          {memberCount === 1 ? "1 membro" : `${memberCount} membros`}
        </div>
      </div>
      {mode === "view" ? (
        <Link
          href={`/app/lar/${household.id}/gerenciar` as Route}
          aria-label="Gerenciar lar"
          className="focus-ring flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
        >
          <Settings size={16} strokeWidth={1.75} aria-hidden />
        </Link>
      ) : (
        <span className="flex-none rounded-lg bg-[color:var(--surface-2)] px-3 py-2 text-[0.8125rem] font-medium text-[color:var(--text-muted)]">
          Gerenciando
        </span>
      )}
    </div>
  );
}
