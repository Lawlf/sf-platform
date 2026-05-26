import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
  /** When inside an element that already announces status, hide the spinner from AT to avoid double announcements. */
  decorative?: boolean;
}

export function Spinner({ size = 16, className, label = "Carregando", decorative }: SpinnerProps) {
  return (
    <span
      role={decorative ? undefined : "status"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      className={cn("inline-block", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        className="animate-spin"
        aria-hidden
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="14 42"
          opacity="0.9"
        />
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.18"
        />
      </svg>
    </span>
  );
}
