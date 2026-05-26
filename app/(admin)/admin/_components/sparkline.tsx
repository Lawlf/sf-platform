import { buildSparklinePath } from "../_lib/sparkline-path";

interface Props {
  values: number[];
  label: string;
}

const W = 600;
const H = 80;

export function Sparkline({ values, label }: Props) {
  const d = buildSparklinePath(values, W, H);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      className="h-20 w-full"
      preserveAspectRatio="none"
    >
      <title>{label}</title>
      {d ? (
        <path d={d} fill="none" stroke="var(--brand, #ef7a1a)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ) : (
        <text x="8" y={H / 2} fontSize="12" fill="var(--text-muted)">
          Sem dados
        </text>
      )}
    </svg>
  );
}
