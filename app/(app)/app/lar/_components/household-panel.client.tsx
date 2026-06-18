"use client";

import { Home, LogOut, MoreHorizontal, Shield, UserMinus, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/app/components/ui/button";

import type { SerializedHousehold, SerializedMember } from "../../_actions/household-queries";
import {
  inviteMemberAction,
  leaveHouseholdAction,
  removeMemberAction,
  revokeInviteAction,
  setMemberRoleAction,
} from "../../_actions/household-actions";

import { InviteForm } from "./invite-form.client";

interface HouseholdPanelProps {
  household: SerializedHousehold;
  members: SerializedMember[];
  currentUserId: string;
  pendingInvites?: { id: string; inviteeRef: string }[];
}

function memberLabel(m: SerializedMember): string {
  if (m.displayName) return m.displayName;
  if (m.username) return `@${m.username}`;
  return m.email;
}

export function HouseholdPanel({
  household,
  members,
  currentUserId,
  pendingInvites = [],
}: HouseholdPanelProps) {
  const [leavePending, startLeave] = useTransition();
  const [removePending, startRemove] = useTransition();
  const [rolePending, startRole] = useTransition();
  const [revokePending, startRevoke] = useTransition();
  const router = useRouter();

  const self = members.find((m) => m.userId === currentUserId);
  const isAdmin = self?.role === "admin";

  function handleLeave() {
    startLeave(async () => {
      const result = await leaveHouseholdAction({ householdId: household.id });
      if (!result.ok) alert(result.message);
      else router.refresh();
    });
  }

  function handleRemove(targetUserId: string) {
    startRemove(async () => {
      const result = await removeMemberAction({
        householdId: household.id,
        targetUserId,
      });
      if (!result.ok) alert(result.message);
      else router.refresh();
    });
  }

  function handleSetRole(targetUserId: string, role: "admin" | "member") {
    startRole(async () => {
      const result = await setMemberRoleAction({
        householdId: household.id,
        targetUserId,
        role,
      });
      if (!result.ok) alert(result.message);
      else router.refresh();
    });
  }

  function handleRevoke(inviteId: string) {
    startRevoke(async () => {
      const result = await revokeInviteAction({ inviteId });
      if (!result.ok) alert(result.message);
      else router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Home size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[color:var(--text-primary)]">{household.name}</h2>
          <span className="text-[0.75rem] text-[color:var(--text-muted)]">
            {members.length} {members.length === 1 ? "membro" : "membros"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
          Membros
        </h3>
        {members.map((m) => {
          const isSelf = m.userId === currentUserId;
          return (
            <div
              key={m.userId}
              className="flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-3"
            >
              <Users size={15} strokeWidth={2} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
                  {memberLabel(m)}
                  {isSelf ? " (você)" : ""}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${
                  m.role === "admin"
                    ? "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
                    : "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]"
                }`}
              >
                {m.role === "admin" ? "Admin" : "Membro"}
              </span>
              {isAdmin && !isSelf ? (
                <div className="flex shrink-0 items-center gap-1">
                  {m.role === "member" ? (
                    <button
                      type="button"
                      disabled={rolePending}
                      onClick={() => handleSetRole(m.userId, "admin")}
                      className="focus-ring rounded p-1 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                      title="Tornar admin"
                    >
                      <Shield size={14} strokeWidth={2} aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={rolePending}
                      onClick={() => handleSetRole(m.userId, "member")}
                      className="focus-ring rounded p-1 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                      title="Rebaixar para membro"
                    >
                      <MoreHorizontal size={14} strokeWidth={2} aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={removePending}
                    onClick={() => handleRemove(m.userId)}
                    className="focus-ring rounded p-1 text-[color:var(--semantic-negative)]/60 hover:text-[color:var(--semantic-negative)]"
                    title="Remover do lar"
                  >
                    <UserMinus size={14} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {isAdmin ? (
        <InviteForm householdId={household.id} onSuccess={() => router.refresh()} />
      ) : null}

      {isAdmin && pendingInvites.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
            Convites pendentes
          </h3>
          {pendingInvites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-3"
            >
              <UserPlus size={15} strokeWidth={2} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-[color:var(--text-secondary)]">
                {inv.inviteeRef}
              </span>
              <button
                type="button"
                disabled={revokePending}
                onClick={() => handleRevoke(inv.id)}
                className="focus-ring shrink-0 text-[0.75rem] font-semibold text-[color:var(--semantic-negative)]/70 hover:text-[color:var(--semantic-negative)]"
              >
                Cancelar
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="border-t border-[color:var(--border-soft)] pt-3">
        <Button
          variant="ghost"
          size="sm"
          loading={leavePending}
          onClick={handleLeave}
          className="gap-2 text-[color:var(--semantic-negative)]"
        >
          <LogOut size={14} strokeWidth={2} aria-hidden />
          Sair do lar
        </Button>
      </div>
    </section>
  );
}
