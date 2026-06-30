import { type ReactElement, type ReactNode, cloneElement, isValidElement, useId } from "react";

export const wizardInputClass =
  "w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";

export interface WizardFieldProps {
  label: string;
  helper?: string | undefined;
  helpLink?: ReactNode;
  error?: string | undefined;
  htmlFor?: string | undefined;
  children: ReactNode;
}

export function WizardField({
  label,
  helper,
  helpLink,
  error,
  htmlFor,
  children,
}: WizardFieldProps) {
  const errorId = useId();

  const describedChildren =
    error && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          "aria-invalid": true,
          "aria-describedby": errorId,
        })
      : children;

  return (
    <div className="mb-[14px]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80"
        >
          {label}
        </label>
        {helpLink ? <div className="shrink-0">{helpLink}</div> : null}
      </div>
      {describedChildren}
      {helper ? (
        <div className="mt-1 text-[0.6875rem] text-[color:var(--text-primary)] opacity-60">{helper}</div>
      ) : null}
      {error ? (
        <div
          id={errorId}
          role="alert"
          className="mt-1 text-[0.6875rem] text-[color:var(--semantic-negative)]"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
