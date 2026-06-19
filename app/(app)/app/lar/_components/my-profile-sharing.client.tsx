"use client";

import { Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Spinner } from "@/app/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import type { HouseholdShareLevel } from "@/domain/entities/household.entity";

import {
  shareProfileAction,
  unshareProfileAction,
} from "../../_actions/household-actions";
import type { MySharesData, SerializedSharedProfile } from "../../_actions/household-queries";

interface Props {
  householdId: string;
  data: MySharesData;
}

function profileLabel(type: string, displayName: string | null, isPrimary: boolean): string {
  if (displayName) return displayName;
  if (type === "PJ_MEI") return "Empresa";
  return isPrimary ? "Perfil pessoal" : "Perfil PF";
}

export function MyProfileSharing({ householdId, data }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const shareMap = new Map<string, SerializedSharedProfile>(
    data.shares.map((s) => [s.profileId, s]),
  );

  function handleToggle(profileId: string, currentlyShared: boolean) {
    if (currentlyShared) {
      startTransition(async () => {
        const result = await unshareProfileAction({ householdId, profileId });
        if (!result.ok) alert(result.message);
        else router.refresh();
      });
    } else {
      startTransition(async () => {
        const result = await shareProfileAction({ householdId, profileId, shareLevel: "aggregate" });
        if (!result.ok) alert(result.message);
        else router.refresh();
      });
    }
  }

  function handleLevelChange(profileId: string, shareLevel: HouseholdShareLevel) {
    startTransition(async () => {
      const result = await shareProfileAction({ householdId, profileId, shareLevel });
      if (!result.ok) alert(result.message);
      else router.refresh();
    });
  }

  if (data.profiles.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <h3 className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
        Meus perfis neste lar
      </h3>

      {data.profiles.map((profile) => {
        const shared = shareMap.get(profile.id);
        const isShared = !!shared;
        const label = profileLabel(profile.type, profile.displayName, profile.isPrimary);

        return (
          <div
            key={profile.id}
            className="flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-3"
          >
            <Share2 size={15} strokeWidth={2} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />

            <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
              {label}
            </span>

            {isShared ? (
              <Select
                value={shared.shareLevel}
                onValueChange={(v) => handleLevelChange(profile.id, v as HouseholdShareLevel)}
                disabled={pending}
              >
                <SelectTrigger className="h-7 w-[7.5rem] text-[0.75rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aggregate">Resumo</SelectItem>
                  <SelectItem value="detail">Detalhe</SelectItem>
                </SelectContent>
              </Select>
            ) : null}

            {pending ? (
              <Spinner size={14} decorative className="shrink-0 text-[color:var(--text-muted)]" />
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleToggle(profile.id, isShared)}
                className={`shrink-0 rounded-full px-3 py-1 text-[0.6875rem] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] focus-visible:ring-offset-1 ${
                  isShared
                    ? "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)] hover:bg-[color:var(--color-brand-500)]/[0.22]"
                    : "bg-[color:var(--surface-3)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-4,var(--surface-3))]"
                }`}
              >
                {isShared ? "Incluído" : "Incluir"}
              </button>
            )}
          </div>
        );
      })}

      <p className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
        <span className="font-semibold text-[color:var(--text-secondary)]">Resumo</span>
        {" — só os totais somam no lar. "}
        <span className="font-semibold text-[color:var(--text-secondary)]">Detalhe</span>
        {" — os outros membros podem ver os lançamentos."}
      </p>
    </div>
  );
}
