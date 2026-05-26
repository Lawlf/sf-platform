"use client";

import { ChevronDown, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

import {
  changePinAction,
  disableAppLockAction,
  enableAppLockAction,
  setTimeoutAction,
} from "../_actions/app-lock-settings.actions";

const TIMEOUT_OPTIONS = [
  { value: 0, label: "Imediato", short: "Imediato" },
  { value: 60, label: "Após 1 minuto", short: "1 min" },
  { value: 300, label: "Após 5 minutos", short: "5 min" },
] as const;

interface TimeoutSegmentedProps {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

/** Segmented control for the lock timeout: nicer than a native <select> for 3
 *  mutually-exclusive options, and keeps the warm/brand look (no native arrow). */
function TimeoutSegmented({ value, onChange, disabled }: TimeoutSegmentedProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Bloquear após"
      className="inline-flex w-full gap-1 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-1"
    >
      {TIMEOUT_OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "focus-ring flex-1 rounded-xl px-2 py-2 text-[0.8125rem] font-semibold transition-all disabled:opacity-60",
              active
                ? "bg-[color:var(--surface-1)] text-[color:var(--color-brand-800)] shadow-[0_1px_3px_rgba(31,29,28,0.1)]"
                : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
            )}
          >
            {o.short}
          </button>
        );
      })}
    </div>
  );
}

interface PinInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label: string;
  id: string;
}

function PinInput({ value, onChange, disabled, label, id }: PinInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
        {label}
      </label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        placeholder="••••"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        className="w-32 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5 text-center text-xl tracking-[0.4em] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/25 disabled:opacity-70"
      />
    </div>
  );
}

interface CollapsibleRowProps {
  label: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}

/** Custom disclosure: a clean row with a chevron that rotates on open. Replaces
 *  the native <details>/<summary> (which renders an ugly default triangle). */
function CollapsibleRow({ label, tone = "default", children }: CollapsibleRowProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[0.875rem] font-semibold transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <span
          className={
            tone === "danger"
              ? "text-[color:var(--semantic-negative)]"
              : "text-[color:var(--text-primary)]"
          }
        >
          {label}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2}
          aria-hidden
          className={cn(
            "shrink-0 text-[color:var(--text-muted)] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-[color:var(--border-soft)] px-4 pb-4 pt-3.5">{children}</div>
      ) : null}
    </div>
  );
}

interface AppLockSettingsProps {
  enabled: boolean;
  timeout: number;
}

export function AppLockSettings({ enabled, timeout }: AppLockSettingsProps) {
  const router = useRouter();

  const [newPin, setNewPin] = useState("");
  const [enableTimeout, setEnableTimeout] = useState(timeout);
  const [enableError, setEnableError] = useState<string | null>(null);
  const [enablePending, setEnablePending] = useState(false);

  const [activeTimeout, setActiveTimeout] = useState(timeout);
  const [timeoutSaving, setTimeoutSaving] = useState(false);

  const [changeCurrent, setChangeCurrent] = useState("");
  const [changeNew, setChangeNew] = useState("");
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changePending, setChangePending] = useState(false);
  const [changeOk, setChangeOk] = useState(false);

  const [disablePin, setDisablePin] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disablePending, setDisablePending] = useState(false);

  if (!enabled) {
    return (
      <div className="glass-light flex flex-col gap-4 rounded-2xl p-4">
        <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          Defina um PIN de 4 dígitos para ativar. Se você tiver uma passkey cadastrada, o Face ID ou
          Touch ID também desbloqueia.
        </p>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (enablePending || !/^\d{4}$/.test(newPin)) return;
            setEnablePending(true);
            setEnableError(null);
            try {
              const res = await enableAppLockAction(newPin, enableTimeout);
              if (res.ok) router.refresh();
              else setEnableError(res.message ?? "Erro ao ativar.");
            } finally {
              setEnablePending(false);
            }
          }}
        >
          <PinInput
            id="new-pin-enable"
            label="PIN de 4 dígitos"
            value={newPin}
            onChange={setNewPin}
            disabled={enablePending}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
              Bloquear após
            </span>
            <TimeoutSegmented
              value={enableTimeout}
              onChange={setEnableTimeout}
              disabled={enablePending}
            />
          </div>
          {enableError ? (
            <p role="alert" className="text-[0.75rem] text-[color:var(--semantic-negative)]">
              {enableError}
            </p>
          ) : null}
          <Button type="submit" variant="brand" loading={enablePending} disabled={!/^\d{4}$/.test(newPin)}>
            Ativar bloqueio
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="glass-light flex flex-col gap-4 rounded-2xl p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--semantic-positive)]/15">
            <ShieldCheck size={17} className="text-[color:var(--semantic-positive)]" aria-hidden />
          </span>
          <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            Bloqueio ativo
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.75rem] font-medium text-[color:var(--text-secondary)]">
            Bloquear após
          </span>
          <TimeoutSegmented
            value={activeTimeout}
            disabled={timeoutSaving}
            onChange={async (nv) => {
              setActiveTimeout(nv);
              setTimeoutSaving(true);
              try {
                await setTimeoutAction(nv);
                router.refresh();
              } finally {
                setTimeoutSaving(false);
              }
            }}
          />
        </div>
      </div>

      <CollapsibleRow label="Trocar PIN">
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (changePending || !/^\d{4}$/.test(changeNew) || !/^\d{4}$/.test(changeCurrent)) return;
            setChangePending(true);
            setChangeError(null);
            setChangeOk(false);
            try {
              const res = await changePinAction(changeCurrent, changeNew);
              if (res.ok) {
                setChangeCurrent("");
                setChangeNew("");
                setChangeOk(true);
              } else {
                setChangeError(res.message ?? "Erro ao trocar PIN.");
              }
            } finally {
              setChangePending(false);
            }
          }}
        >
          <PinInput
            id="change-current"
            label="PIN atual"
            value={changeCurrent}
            onChange={setChangeCurrent}
            disabled={changePending}
          />
          <PinInput
            id="change-new"
            label="Novo PIN"
            value={changeNew}
            onChange={setChangeNew}
            disabled={changePending}
          />
          {changeError ? (
            <p role="alert" className="text-[0.75rem] text-[color:var(--semantic-negative)]">
              {changeError}
            </p>
          ) : null}
          {changeOk ? (
            <p className="text-[0.75rem] text-[color:var(--semantic-positive)]">
              PIN atualizado com sucesso.
            </p>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            loading={changePending}
            disabled={!/^\d{4}$/.test(changeCurrent) || !/^\d{4}$/.test(changeNew)}
          >
            Salvar novo PIN
          </Button>
        </form>
      </CollapsibleRow>

      <CollapsibleRow label="Desligar bloqueio" tone="danger">
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (disablePending || !/^\d{4}$/.test(disablePin)) return;
            setDisablePending(true);
            setDisableError(null);
            try {
              const res = await disableAppLockAction(disablePin);
              if (res.ok) router.refresh();
              else {
                setDisableError(res.message ?? "Erro ao desligar.");
                setDisablePin("");
              }
            } finally {
              setDisablePending(false);
            }
          }}
        >
          <PinInput
            id="disable-pin"
            label="Confirme seu PIN atual"
            value={disablePin}
            onChange={setDisablePin}
            disabled={disablePending}
          />
          {disableError ? (
            <p role="alert" className="text-[0.75rem] text-[color:var(--semantic-negative)]">
              {disableError}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="destructive"
            loading={disablePending}
            disabled={!/^\d{4}$/.test(disablePin)}
          >
            Desligar bloqueio
          </Button>
        </form>
      </CollapsibleRow>
    </div>
  );
}
