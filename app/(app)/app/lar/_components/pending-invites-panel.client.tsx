"use client";

import { Home, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/app/components/ui/button";

import type { SerializedInvite } from "../../_actions/household-queries";
import { respondInviteAction } from "../../_actions/household-actions";

interface PendingInvitesPanelProps {
  invites: SerializedInvite[];
}

export function PendingInvitesPanel({ invites }: PendingInvitesPanelProps) {
  if (invites.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
        Convites recebidos
      </h2>
      {invites.map((inv) => (
        <InviteCard key={inv.id} invite={inv} />
      ))}
    </section>
  );
}

function InviteCard({ invite }: { invite: SerializedInvite }) {
  const [acceptPending, startAccept] = useTransition();
  const [declinePending, startDecline] = useTransition();
  const router = useRouter();

  function handleRespond(accept: boolean) {
    const start = accept ? startAccept : startDecline;
    start(async () => {
      const result = await respondInviteAction({ inviteId: invite.id, accept });
      if (!result.ok) alert(result.message);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Home size={16} strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
          Convite para <strong>{invite.householdName}</strong>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[0.75rem] text-[color:var(--text-secondary)]">
          <Mail size={12} strokeWidth={2} aria-hidden />
          {invite.inviteeRef}
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            loading={acceptPending}
            disabled={declinePending}
            onClick={() => handleRespond(true)}
          >
            Aceitar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={declinePending}
            disabled={acceptPending}
            onClick={() => handleRespond(false)}
          >
            Recusar
          </Button>
        </div>
      </div>
    </div>
  );
}
