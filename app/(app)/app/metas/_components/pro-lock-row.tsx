import { Lock } from "lucide-react";

interface ProLockRowProps {
  label: string;
  subText: string;
}

export function ProLockRow({ label, subText }: ProLockRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 opacity-60 backdrop-blur-xl">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-3)]">
        <Lock size={18} strokeWidth={1.75} className="text-[color:var(--text-muted)]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            {label}
          </span>
          <Lock
            size={12}
            strokeWidth={2.25}
            className="text-[color:var(--text-muted)]"
            aria-hidden
          />
        </div>
        <span className="mt-0.5 block text-[0.6875rem] text-[color:var(--text-muted)]">
          {subText}
        </span>
      </div>
    </div>
  );
}
